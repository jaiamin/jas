"""Public record v1: one frozen protocol and its reviewed evidence, never a workspace export."""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from collections.abc import Iterable
from typing import TYPE_CHECKING, Literal

from pydantic import Field
from sqlalchemy import select

from .comparisons import ComparisonRun, compare_runs
from .db import ProviderCall, digest
from .domain import Decision, Design, RecordedAdjudication, Strict
from .metrics import aggregate_metrics
from .research_quality import outcome_value
from .simulation.environments import create_world

if TYPE_CHECKING:
    from .research import Research

MAX_PUBLIC_BYTES = 25 * 1024 * 1024


class PublicationDescription(Strict):
    title: str = Field(min_length=1, max_length=120)
    finding: str = Field(min_length=1, max_length=400)
    tags: list[str] = Field(default_factory=list, max_length=3)
    featured_run: str = Field(min_length=1, max_length=100)
    visibility: Literal["public", "unlisted"] = "unlisted"
    notes: str = Field(default="", max_length=4000)
    email_reviews: dict[str, str] = Field(default_factory=dict, max_length=100)


def encode_record(value: object) -> bytes:
    try:
        result = json.dumps(
            value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False
        ).encode()
    except (ValueError, TypeError, RecursionError) as error:
        raise ValueError("Record must contain finite JSON data") from error
    if len(result) > MAX_PUBLIC_BYTES:
        raise ValueError("Publications are limited to 25 MB of uncompressed JSON")
    return result


def decode_record(raw: bytes) -> dict:
    if len(raw) > MAX_PUBLIC_BYTES:
        raise ValueError("Publications are limited to 25 MB")
    try:
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError("Expected a public record object")
        encode_record(value)
        return value
    except (RecursionError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError("Invalid public record JSON") from error


def scan_record(
    value: object, *, secrets: Iterable[str] = (), reviews: dict[str, str] | None = None
) -> list[dict]:
    """Return locations and opaque fingerprints; never echo matching credentials."""
    known = tuple(secret for secret in secrets if len(secret) >= 8)
    patterns = (
        (
            "credential",
            re.compile(
                r"(?i)(?:sk-(?:proj-|ant-)?[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{20,}|"
                r"github_pat_[a-z0-9_]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|"
                r"(?:bearer|api[_-]?key|password|secret)\s*[:=]\s*[^\s,\"']{8,})"
            ),
        ),
        (
            "local_path",
            re.compile(
                r"(?:/(?:home|Users|root|tmp|var|app|workspace|mnt|etc|opt|data)/[^\s\"<>]*|[A-Za-z]:[\\/][^\s\"<>]+|file://[^\s\"<>]+)"
            ),
        ),
        (
            "email",
            re.compile(r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+"),
        ),
    )
    hits: list[dict] = []

    def report(path: str, rule: str, text: str) -> None:
        fingerprint = hashlib.sha256(f"{path}\0{rule}\0{text}".encode()).hexdigest()
        reason = (reviews or {}).get(fingerprint, "").strip()
        hits.append(
            {
                "path": path,
                "rule": rule,
                "fingerprint": fingerprint,
                "reviewable": rule == "email",
                "resolved": rule == "email" and len(reason) >= 10,
            }
        )

    def walk(item: object, path: str, depth: int = 0) -> None:
        if depth > 80:
            raise ValueError("Public record nesting is too deep")
        if isinstance(item, dict):
            if item.get("part_kind") in {"thinking", "reasoning", "redacted-thinking"}:
                report(path, "hidden_reasoning", str(item))
            for key, content in item.items():
                child = f"{path}.{key}"
                if (
                    key.lower()
                    in {
                        "thinking",
                        "reasoning_content",
                        "thinking_signature",
                        "hidden_reasoning",
                        "chain_of_thought",
                        "encrypted_content",
                    }
                    and content
                ):
                    report(child, "hidden_reasoning", str(content))
                walk(str(key), f"{path}.[key]", depth + 1)
                walk(content, child, depth + 1)
        elif isinstance(item, list):
            for index, content in enumerate(item):
                walk(content, f"{path}[{index}]", depth + 1)
        elif isinstance(item, str):
            for secret in known:
                if secret in item:
                    report(path, "credential", secret)
            for rule, pattern in patterns:
                for match in pattern.finditer(item):
                    report(path, rule, match.group())

    walk(value, "record")
    return list({(h["path"], h["fingerprint"]): h for h in hits}.values())


def public_record(
    research: Research,
    study_id: str,
    number: int,
    description: PublicationDescription,
    *,
    lineage: dict | None = None,
) -> dict:
    with research.db.read_snapshot():
        study = research.study(study_id, number)
        if not any(run["status"] == "complete" for run in study["runs"]):
            raise ValueError("Finish at least one run before publishing")
        if any(
            run["status"] in {"running", "queued", "pausing", "paused"} for run in study["runs"]
        ):
            raise ValueError("Finish or resolve unfinished runs before publishing")
        if description.featured_run not in {
            r["id"] for r in study["runs"] if r["status"] == "complete"
        }:
            raise ValueError("Feature a complete run from this frozen version")
        recordings = []
        for summary in study["runs"]:
            run = research.run(summary["id"])
            with research.db.session() as session:
                calls = session.scalars(
                    select(ProviderCall)
                    .where(
                        ProviderCall.run_id == summary["id"],
                        ProviderCall.activation_id.is_not(None),
                    )
                    .order_by(ProviderCall.created, ProviderCall.id)
                ).all()
            # Only agent calls: Assistant/planner/researcher traces never cross this boundary.
            recordings.append(
                {
                    "record": run,
                    "evidence": [
                        research.evidence(summary["id"], turn)
                        for turn in range(summary["turn"] + 1)
                    ],
                    "model_inputs": [
                        {
                            "id": call.id,
                            "activation_id": call.activation_id,
                            "model": call.model,
                            "turn": call.turn,
                            "request": call.request_payload,
                            "response": call.response_payload,
                            "status": call.status,
                        }
                        for call in calls
                    ],
                }
            )
        # No plan/chat identifiers or other versions cross this boundary.
        experiment = {
            key: study[key]
            for key in ("design", "revision", "sha256", "created", "runs", "comparison", "results")
        }
        experiment["limits"] = list(
            dict.fromkeys(
                [
                    *study["design"].get("limitations", []),
                    *(issue["message"] for issue in study["preflight"]["issues"]),
                    study["comparison"]["uncertainty_reason"],
                ]
            )
        )
        usages = [run["usage"] for run in study["runs"]]
        experiment["usage"] = {
            key: (
                None
                if any(usage[key] is None for usage in usages)
                else sum(usage[key] for usage in usages)
            )
            for key in ("requests", "input_tokens", "output_tokens", "cost_usd")
        }
        result = {
            "format": "jas-public",
            "version": 1,
            "created": study["created"],
            "jas_version": "0.2.0",
            "description": description.model_dump(),
            "experiment": experiment,
            "runs": recordings,
            "lineage": lineage,
        }
        experiment["headline"] = headline_data(result)
        validate_record(result)
        return result


def headline_data(record: dict) -> dict:
    """Use the first declared outcome, including its missing values, on every shared surface."""
    design = Design.model_validate(record["experiment"]["design"])
    declared = design.analysis_plan.outcomes[0] if design.analysis_plan else None
    metric = declared.key if declared else next(iter(design.measures), None)
    cells = record["experiment"]["comparison"]["cells"]
    if not declared:
        return {"metric": metric, "cells": cells}
    values = {}
    for recording in record["runs"]:
        run = recording["record"]
        summary = run["summary"]
        condition = next(c for c in design.conditions if c.key == summary["condition_key"])
        usage = summary["usage"]
        value, _ = outcome_value(
            declared,
            design,
            condition,
            summary,
            aggregate_metrics((m["key"], m["value"]) for m in run["measurements"]),
            Counter(event["kind"] for event in run["events"]),
            {
                "requests": usage["requests"],
                "charged": round((usage["cost_usd"] or 0) * 1_000_000),
                "partial": usage["partial"],
                "unpriced": usage["cost_usd"] is None,
            },
        )
        values[summary["id"]] = value
    return {
        "metric": metric,
        "cells": [
            {
                **cell,
                "metrics": {}
                if values[cell["run_id"]] is None
                else {metric: values[cell["run_id"]]},
            }
            for cell in cells
        ],
    }


def validate_record(record: dict) -> PublicationDescription:
    encode_record(record)
    if (
        set(record)
        != {
            "format",
            "version",
            "created",
            "jas_version",
            "description",
            "experiment",
            "runs",
            "lineage",
        }
        or record.get("format") != "jas-public"
        or record.get("version") != 1
    ):
        raise ValueError("Unsupported public record format; expected jas-public v1")
    description = PublicationDescription.model_validate(record["description"])
    experiment = record["experiment"]
    design = Design.model_validate(experiment["design"])
    if experiment["sha256"] != digest(experiment["design"]):
        raise ValueError("Frozen protocol hash does not match")
    planned = {
        (condition.key, seed, repetition)
        for condition in design.conditions
        for seed in design.seeds
        for repetition in range(1, design.repetitions + 1)
    }
    seen: set[tuple] = set()
    ids: set[str] = set()
    if not isinstance(record["runs"], list) or len(record["runs"]) != len(planned):
        raise ValueError("Record must retain every planned run, including missing and failed runs")
    for recording in record["runs"]:
        if set(recording) != {"record", "evidence", "model_inputs"}:
            raise ValueError("Unknown run recording fields")
        run = recording["record"]
        summary = run["summary"]
        identity = (summary["condition_key"], summary["seed"], summary["repetition"])
        if identity not in planned or identity in seen or summary["id"] in ids:
            raise ValueError("Duplicate or unplanned run")
        seen.add(identity)
        ids.add(summary["id"])
        condition = next(c for c in design.conditions if c.key == summary["condition_key"])
        if run["design"] != design.resolve(condition).model_dump():
            raise ValueError("Run protocol differs from its frozen condition")
        evidence = recording["evidence"]
        if summary["status"] not in {"complete", "failed", "ready"}:
            raise ValueError("Only finished evidence and explicitly missing runs can be published")
        if (
            not isinstance(evidence, list)
            or len(evidence) != summary["turn"] + 1
            or summary["turn"] > design.turn_count
        ):
            raise ValueError("Run evidence length does not match the committed turns")
        if [turn["number"] for turn in evidence] != list(range(len(evidence))):
            raise ValueError("Recorded turns must be contiguous")
    if experiment["runs"] != [row["record"]["summary"] for row in record["runs"]]:
        raise ValueError("Experiment run summaries differ from their recordings")
    calculated = compare_runs(
        [
            ComparisonRun(
                run_id=(summary := row["record"]["summary"])["id"],
                condition_key=summary["condition_key"],
                seed=summary["seed"],
                repetition=summary["repetition"],
                status=summary["status"],
                through_turn=summary["turn"],
                attempted=bool(row["record"]["activations"])
                or summary["turn"] > 0
                or summary["status"] == "failed",
                metrics=aggregate_metrics(
                    (m["key"], m["value"]) for m in row["record"]["measurements"]
                )
                if summary["status"] == "complete"
                else {},
                error=summary["error"],
                effort=row["record"]["effort"],
            )
            for row in record["runs"]
        ],
        design,
    )
    calculated["comparison"].update(
        revision=experiment["revision"], design_sha256=experiment["sha256"]
    )
    if any(experiment[key] != calculated[key] for key in ("comparison", "results")):
        raise ValueError("Published results differ from recorded metrics")
    if experiment["headline"] != headline_data(record):
        raise ValueError("Published headline differs from the first declared outcome")
    if description.featured_run not in {
        r["record"]["summary"]["id"]
        for r in record["runs"]
        if r["record"]["summary"]["status"] == "complete"
    }:
        raise ValueError("Feature a complete run from this record")
    return description


def verify_record(record: dict) -> list[dict]:
    """Trusted settlement v1. No provider, workspace, uploaded code or network is opened."""
    validate_record(record)
    return [verify_run(recording) for recording in record["runs"]]


def verify_run(recording: dict) -> dict:
    run = recording["record"]
    summary = run["summary"]
    result = {"run_id": summary["id"], "verified": False, "verified_turns": 0, "model_requests": 0}
    try:
        design = Design.model_validate(run["design"])
        condition = next(c for c in design.conditions if c.key == summary["condition_key"])
        if design.environment in {"sealed_relay", "reviewed_finite"}:
            raise ValueError("This public verifier does not execute uploaded environment code")
        world = create_world(design, condition.parameters, summary["seed"])
        evidence = recording["evidence"]
        if evidence[0]["checkpoint"] != world.snapshot():
            raise ValueError("Initial checkpoint differs from the seeded rules")
        if run["parameters"] != condition.parameters.model_dump():
            raise ValueError("Recorded parameters differ from the frozen condition")
        expected_events, expected_measures = [], []
        for turn in evidence[1:]:
            actor = world.actor()
            if actor is None or actor != turn["actor"]:
                raise ValueError(f"Actor mismatch at turn {turn['number']}")
            observation = world.observe(actor)
            observation["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
            if observation != turn["observation"]:
                raise ValueError(f"Observation mismatch at turn {turn['number']}")
            decision = Decision.model_validate(turn["decision"])
            receipts = [
                event["data"] for event in turn["events"] if event["kind"] == "adjudication"
            ]
            if world.adjudication_inputs(actor, decision) is not None:
                if len(receipts) != 1:
                    raise ValueError("Missing recorded adjudication")
                receipt = RecordedAdjudication.model_validate(
                    {k: v for k, v in receipts[0].items() if k != "consequence"}
                )
                if receipt.adjudicator != condition.adjudicator:
                    raise ValueError("Recorded adjudicator differs from the protocol")
                events, measures = world.settle_adjudication(actor, decision, receipt.model_dump())
            else:
                if receipts:
                    raise ValueError("Unexpected adjudication")
                events, measures = world.step(actor, decision)
            if turn["checkpoint"] != world.snapshot() or turn["state_hash"] != digest(
                world.snapshot()
            ):
                raise ValueError(f"State mismatch at turn {turn['number']}")
            actual = [
                {k: event[k] for k in ("kind", "actor", "target", "visibility", "text", "data")}
                for event in turn["events"]
            ]
            if actual != [event.model_dump() for event in events]:
                raise ValueError(f"Consequence mismatch at turn {turn['number']}")
            expected_events.extend(turn["events"])
            expected_measures.extend(
                {
                    **measure.model_dump(),
                    "turn": turn["number"],
                    "round": turn["round"],
                    "version": 1,
                }
                for measure in measures
            )
            result["verified_turns"] += 1
        if (
            run["state"] != world.snapshot()
            or run["events"] != expected_events
            or run["measurements"] != expected_measures
        ):
            raise ValueError("Final state, events or metrics differ from recorded settlement")
        if summary["status"] == "complete" and world.actor() is not None:
            raise ValueError("A complete run has not reached a terminal state")
        if summary["status"] != "complete":
            raise ValueError("Run did not complete; its recorded prefix is retained")
        result.update(verified=True, rule_version=world.version, reason=None)
    except (ValueError, KeyError, TypeError, StopIteration, AssertionError) as error:
        result["reason"] = str(error) or "Malformed recorded evidence"
    return result
