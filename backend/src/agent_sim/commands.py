"""Headless workflows over the same domain, checks, ledger and engine as the app."""

import argparse
import asyncio
import json
import math
import os
import time
import webbrowser
from contextlib import contextmanager
from pathlib import Path

from .db import Database
from .domain import Design
from .execution import Engine
from .llm import LanguageModels
from .public_records import decode_record, verify_record, verify_run
from .publishing import Publisher, download_fork
from .research import Research


def add_commands(parser: argparse.ArgumentParser) -> None:
    commands = parser.add_subparsers(dest="command")
    check = commands.add_parser("check", help="Free protocol lint and cost bounds")
    check.add_argument("protocol", type=Path)
    run = commands.add_parser("run", help="Estimate, then explicitly run a bounded protocol")
    run.add_argument("protocol", type=Path)
    run.add_argument("--max-usd", type=float, required=True)
    run.add_argument("--max-tokens", type=int)
    run.add_argument("--output", type=Path, help="Write the finished public-ready evidence record")
    replay = commands.add_parser("replay", help="Verify a record with zero model calls")
    replay.add_argument("record", type=Path)
    login = commands.add_parser("login", help="GitHub device login; token stays in the OS keychain")
    login.add_argument("--gallery")
    publish = commands.add_parser(
        "publish", help="Scan and publish an explicitly reviewed public record"
    )
    publish.add_argument("record", type=Path)
    publish.add_argument(
        "--reviewed",
        action="store_true",
        help="Confirm you reviewed every included agent-private observation and output",
    )
    publish.add_argument("--gallery")
    fork = commands.add_parser(
        "fork", help="Import an exact public protocol without running or installing code"
    )
    fork.add_argument("target")
    fork.add_argument("--gallery")
    gallery = commands.add_parser("gallery", help="Serve the separate, model-free gallery")
    gallery.add_argument("--data", type=Path, default=Path("data/gallery"))
    gallery.add_argument("--origin")
    gallery.add_argument("--port", type=int, default=8081)


def emit(value: object) -> None:
    print(json.dumps(value, ensure_ascii=False, allow_nan=False), flush=True)


@contextmanager
def services(database_url: str):
    from sqlalchemy.engine import make_url

    from .providers import ModelRegistry

    registry = ModelRegistry(make_url(database_url).database)
    ceiling = registry.configuration.workspace_budget_usd
    if ceiling is None:
        ceiling = float(os.getenv("JAS_BUDGET_USD", "25"))
    db = Database(database_url, ceiling=round(ceiling * 1_000_000))
    models = LanguageModels(db, registry=registry)
    research = Research(db, models)
    try:
        yield db, models, research
    finally:
        asyncio.run(models.close())
        research.environments.close()
        research.extensions.close()
        db.close()


def read_file(path: Path) -> dict:
    with path.open("rb") as file:
        from .public_records import MAX_PUBLIC_BYTES

        return decode_record(file.read(MAX_PUBLIC_BYTES + 1))


def execute(args, database_url: str) -> None:
    if args.command == "replay":
        record = read_file(args.record)
        if record.get("format") == "jas-public":
            results = verify_record(record)
        elif record.get("format") == "jas-study" and record.get("version") == 20:
            if record.get("representation"):
                raise ValueError(
                    "Use the expanded workspace export or a public record for CLI replay"
                )
            results = [verify_run(row) for row in record["runs"]]
        elif record.get("version") == 1 and record.get("provenance") == "scripted":
            results = [verify_run({"record": record["run"], "evidence": record["evidence"]})]
        else:
            raise ValueError("Unsupported record format")
        emit({"verification": results, "model_requests": 0})
        if not results or any(not result["verified"] for result in results):
            raise SystemExit(1)
        return
    if args.command == "login":
        publisher = Publisher(args.gallery)
        publisher.token()
        result = publisher.request("POST", "/auth/device", body={})
        assert isinstance(result, dict)
        emit({key: result[key] for key in ("user_code", "verification_uri", "expires_in")})
        if not args.no_browser:
            webbrowser.open(result["verification_uri"])
        deadline = time.monotonic() + result["expires_in"]
        while time.monotonic() < deadline:
            time.sleep(result["interval"])
            token = publisher.request(
                "POST", "/auth/device/token", body={"device_code": result["device_code"]}
            )
            assert isinstance(token, dict)
            if token.get("access_token"):
                publisher.save_token(token["access_token"])
                emit({"signed_in": True, "gallery": publisher.origin})
                return
        raise ValueError("Sign-in expired; run jas login again")
    if args.command == "publish":
        from .public_records import scan_record, validate_record

        record = read_file(args.record)
        description = validate_record(record)
        hits = scan_record(record, reviews=description.email_reviews)
        emit({"scan": hits, "verification": verify_record(record)})
        if any(not hit["resolved"] for hit in hits):
            raise ValueError("Resolve publication scan findings before publishing")
        if not args.reviewed:
            raise ValueError(
                "Review the exact record, including agent-private evidence, then "
                "repeat with --reviewed"
            )
        emit(
            Publisher(args.gallery).request("POST", "/api/gallery", body=record, authenticated=True)
        )
        return
    with services(database_url) as (db, models, research):
        if args.command == "fork":
            sid = download_fork(
                Publisher(args.gallery or models.registry.configuration.preferences.gallery_url),
                args.target,
                research,
            )
            emit({"experiment_id": sid, "model_requests": 0, "protocol_saved": True})
            return
        design = Design.model_validate(read_file(args.protocol))
        if args.command == "run":
            if not math.isfinite(args.max_usd) or not 0 <= args.max_usd <= 10000:
                raise ValueError("--max-usd must be finite and between 0 and 10000")
            design.budget_usd = min(design.budget_usd, args.max_usd)
            if args.max_tokens is not None:
                if args.max_tokens < 1:
                    raise ValueError("--max-tokens must be positive")
                design.token_budget = min(design.token_budget or args.max_tokens, args.max_tokens)
        report = research.review_design(design)
        estimate = models.estimate(design)
        emit({"checks": report, "estimate": estimate})
        if args.command == "check":
            if report["status"] == "blocked":
                raise SystemExit(1)
            return
        if estimate["upper_usd"] is None and design.token_budget is None:
            raise ValueError("Unknown model prices require --max-tokens or a protocol token_budget")
        sid = research.save_design(design)

        async def run():
            engine = Engine(db, research, models)
            try:
                await engine.start_study(sid)
                tasks = [
                    execution.task for execution in engine.executions.values() if execution.task
                ]
                await asyncio.gather(*tasks)
            finally:
                await engine.close()

        asyncio.run(run())
        study = research.study(sid)
        emit(
            {
                "experiment_id": sid,
                "findings": research.findings(sid),
                "usage": study["usage"],
                "runs": study["runs"],
            }
        )
        if args.output:
            from .public_records import PublicationDescription, encode_record, public_record

            complete = next((run for run in study["runs"] if run["status"] == "complete"), None)
            if complete is None:
                raise ValueError("No complete run is available to feature in a public record")
            metadata = PublicationDescription(
                title=design.title[:120],
                finding="Review and describe this result before publishing.",
                featured_run=complete["id"],
            )
            payload = public_record(research, sid, 1, metadata)
            # Explicit output never silently overwrites evidence.
            with args.output.open("xb") as output:
                output.write(encode_record(payload))
        if any(run["status"] != "complete" for run in study["runs"]):
            raise SystemExit(1)
