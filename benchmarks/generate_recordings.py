"""Regenerate the six keyless UI recordings through the real engine. No provider calls."""

import argparse
import asyncio
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from agent_sim.db import Database
from agent_sim.domain import Design, ScriptedHarness
from agent_sim.execution import Engine
from agent_sim.llm import LanguageModels
from agent_sim.research import Research
from agent_sim.starters import starters


async def record(directory: Path) -> None:
    await asyncio.to_thread(directory.mkdir, parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="jas-recordings-") as temporary:
        db = Database(f"sqlite:///{temporary}/demos.sqlite3", ceiling=0)
        models = LanguageModels(db)
        research = Research(db, models)
        engine = Engine(db, research, models)
        try:
            for starter in starters():
                design = Design.model_validate(starter["design"])
                design.seeds = [7]
                design.conditions = design.conditions[:1]
                design.conditions[0].harness = ScriptedHarness(policy=starter["demo_policy"])
                design.limitations.append(
                    "Scripted demonstration of the viewer and rules; "
                    "not evidence of model behavior."
                )
                sid = research.save_design(design)
                rid = research.study(sid)["runs"][0]["id"]
                await engine.start(rid)
                task = engine.executions[rid].task
                assert task is not None
                await task
                run = research.run(rid)
                assert run["summary"]["status"] == "complete", run["summary"].get("error")
                verification = engine.replay(rid)
                assert models.usage()["requests"] == 0
                result = {
                    "version": 1,
                    "provenance": "scripted",
                    "run": run,
                    "verification": verification,
                    "evidence": [
                        research.evidence(rid, n) for n in range(run["summary"]["turn"] + 1)
                    ],
                }
                (directory / f"{starter['id']}.json").write_text(
                    json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n"
                )
            (directory / "index.json").write_text(json.dumps(starters(), indent=2) + "\n")
        finally:
            await engine.close()
            await models.close()
            research.environments.close()
            research.extensions.close()
            db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("frontend/public/recordings"))
    args = parser.parse_args()
    asyncio.run(record(args.output))


if __name__ == "__main__":
    main()
