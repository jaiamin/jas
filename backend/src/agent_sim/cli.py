import argparse
import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

from .paths import workspace_directory


def open_when_ready(server: uvicorn.Server, url: str) -> None:
    for _ in range(100):
        if server.started:
            webbrowser.open(url)
            return
        if server.should_exit:
            return
        time.sleep(0.1)


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


def main() -> None:
    parser = argparse.ArgumentParser(description="JAS — controlled, replayable agent experiments")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument(
        "--workspace", type=Path, help="Workspace directory; defaults to local app data"
    )
    parser.add_argument(
        "--no-browser", action="store_true", help="Do not open a browser on startup"
    )
    add_commands(parser)
    args = parser.parse_args()
    load_dotenv(Path.cwd() / ".env", override=True, interpolate=False)
    directory = args.workspace.expanduser().resolve() if args.workspace else workspace_directory()
    database_url = os.getenv("JAS_DATABASE_URL") if args.workspace is None else None
    database_url = database_url or f"sqlite:///{(directory / 'jas.sqlite3').as_posix()}"
    try:
        dispatch(args, database_url)
    except ValueError as error:
        from pydantic import ValidationError

        message = (
            "; ".join(issue["msg"] for issue in error.errors(include_input=False))
            if isinstance(error, ValidationError)
            else str(error)
        )
        print(f"JAS: {message}", file=sys.stderr)
        raise SystemExit(1) from None


def dispatch(args, database_url: str) -> None:
    if args.command == "gallery":
        from .gallery_api import create_gallery_app

        uvicorn.run(
            create_gallery_app(args.data, origin=args.origin),
            host=args.host,
            port=args.port,
            access_log=False,
        )
        return
    from sqlalchemy.engine import make_url

    from .workspace_lock import workspace_lock

    if args.command in {"replay", "login", "publish"}:
        from .commands import execute

        execute(args, database_url)
        return
    database = make_url(database_url).database
    if not database or database == ":memory:":
        raise ValueError("CLI commands require a persistent local workspace")
    with workspace_lock(database):
        if args.command:
            from .commands import execute

            execute(args, database_url)
            return
        serve(args, database_url)


def serve(args, database_url: str) -> None:
    from .api import create_app

    host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    url = f"http://{'[' + host + ']' if ':' in host else host}:{args.port}"
    app = create_app(database_url)
    print(f"JAS: {url}", flush=True)
    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=args.host,
            port=args.port,
            timeout_graceful_shutdown=110,
            access_log=False,
        )
    )
    if not args.no_browser:
        threading.Thread(target=open_when_ready, args=(server, url), daemon=True).start()
    server.run()
