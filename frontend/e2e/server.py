"""Serve a fresh, keyless browser-test workspace until Playwright shuts it down."""

import os
from pathlib import Path
from tempfile import TemporaryDirectory

import uvicorn
from agent_sim.api import create_app

if __name__ == "__main__":
    os.environ["OPENAI_API_KEY"] = ""
    os.environ["ANTHROPIC_API_KEY"] = ""
    with TemporaryDirectory(prefix="ass-browser-tests-") as directory:
        app = create_app(
            database_url=f"sqlite:///{directory}/workspace.sqlite3",
            budget_usd=10,
            static_dir=Path(__file__).resolve().parents[1] / "dist",
            concurrent_runs=1,
        )
        uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("ASS_TEST_PORT", "8094")))
