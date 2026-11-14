import argparse
import os
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
    args = parser.parse_args()
    load_dotenv(Path.cwd() / ".env", override=True, interpolate=False)
    from .api import create_app

    directory = args.workspace.expanduser().resolve() if args.workspace else workspace_directory()
    database_url = os.getenv("JAS_DATABASE_URL") if args.workspace is None else None
    database_url = database_url or f"sqlite:///{(directory / 'jas.sqlite3').as_posix()}"
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
