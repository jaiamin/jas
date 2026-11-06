"""Headless commands use only argparse; NiceGUI is an optional lazy import."""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

from .config import load_scenario
from .experiments import expand, run_experiment
from .replay import verify
from .runner import Runner
from .sandboxes import get_sandbox
from .store import Store


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Deterministic agent simulation sandbox")
    root.add_argument("--db", default="runs.sqlite3", help="SQLite run journal")
    root.add_argument("--verbose", action="store_true")
    commands = root.add_subparsers(dest="command", required=True)
    validate = commands.add_parser("validate", help="Validate scenario or experiment YAML")
    validate.add_argument("path")
    validate.add_argument("--experiment", action="store_true")
    run = commands.add_parser("run", help="Create and execute a run")
    run.add_argument("scenario", nargs="?", default="scenarios/frontier.yaml")
    run.add_argument("--steps", type=positive)
    resume = commands.add_parser("resume", help="Continue the latest saved checkpoint")
    resume.add_argument("run_id")
    resume.add_argument("--steps", type=positive)
    commands.add_parser("runs", help="List saved runs as JSON")
    replay = commands.add_parser("replay", help="Read a saved frame without model calls")
    replay.add_argument("run_id")
    replay.add_argument("--tick", type=int)
    replay.add_argument("--verify", action="store_true", help="Verify all recorded actions locally")
    experiment = commands.add_parser("experiment", help="Execute a validated comparison matrix")
    experiment.add_argument("path")
    view = commands.add_parser("view", help="Start the optional NiceGUI viewer")
    view.add_argument("--host", default="0.0.0.0")
    view.add_argument("--port", type=int, default=8080)
    view.add_argument("--scenarios", default="scenarios")
    return root


def positive(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be positive")
    return number


def emit(value):
    print(json.dumps(value, indent=2, ensure_ascii=False))


def main():
    args = parser().parse_args()
    # Local API keys take precedence over sandbox-injected OAuth credentials.
    load_dotenv(Path.cwd() / ".env", override=True, interpolate=False)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING)
    if args.command == "view":
        try:
            from .viewer import serve
        except ImportError:
            raise SystemExit('Install the viewer with: pip install -e ".[viewer]"') from None
        serve(args.db, args.scenarios, args.host, args.port)
        return
    store = Store(args.db)
    try:
        if args.command == "validate":
            if args.experiment:
                experiment, matrix = expand(args.path)
                emit({"valid": True, "name": experiment.name, "runs": len(matrix)})
            else:
                scenario = load_scenario(args.path)
                environment = get_sandbox(scenario.sandbox).create()
                environment.initialize(
                    scenario.parameters, [a.id for a in scenario.agents], scenario.seed
                )
                emit({"valid": True, "name": scenario.name, "metrics": list(environment.metrics())})
        elif args.command in ("run", "resume"):
            runner = (
                Runner.create(store, load_scenario(args.scenario))
                if args.command == "run"
                else Runner(store, args.run_id)
            )
            print(f"Run {runner.id}", file=sys.stderr)
            try:
                asyncio.run(runner.play(args.steps))
            except KeyboardInterrupt:
                runner.pause()
                print("Paused at the last committed turn.", file=sys.stderr)
            emit(
                {
                    "run": runner.id,
                    "tick": runner.tick,
                    "status": store.run(runner.id)["status"],
                    "metrics": runner.environment.metrics(),
                }
            )
        elif args.command == "runs":
            emit(store.runs())
        elif args.command == "replay":
            if args.verify:
                emit({"verified_turns": verify(store, args.run_id), "model_calls": 0})
            else:
                emit(store.frame(args.run_id, args.tick))
        elif args.command == "experiment":
            emit(asyncio.run(run_experiment(args.path, store)))
    except Exception as error:
        # Provider errors may include request details; avoid printing their body.
        message = str(error) if isinstance(error, (ValueError, OSError)) else type(error).__name__
        print(f"Error: {message}", file=sys.stderr)
        raise SystemExit(1) from None
    finally:
        store.close()


if __name__ == "__main__":
    main()
