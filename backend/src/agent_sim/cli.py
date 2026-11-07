import argparse
from pathlib import Path

import uvicorn
from dotenv import load_dotenv


def main() -> None:
    parser = argparse.ArgumentParser(description="JAS — Agent Simulation Environment")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    load_dotenv(Path.cwd() / ".env", override=True, interpolate=False)
    from .api import create_app

    uvicorn.run(
        create_app(),
        host=args.host,
        port=args.port,
        timeout_graceful_shutdown=110,
        access_log=False,
    )
