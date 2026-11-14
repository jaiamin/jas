"""Disposable public gallery with explicitly scripted evidence and no provider access."""

import asyncio
import os
from pathlib import Path
from tempfile import TemporaryDirectory

import uvicorn
from agent_sim.db import Database
from agent_sim.domain import ScriptedHarness
from agent_sim.execution import Engine
from agent_sim.gallery_api import create_gallery_app
from agent_sim.llm import LanguageModels
from agent_sim.public_records import PublicationDescription, public_record
from agent_sim.research import Research
from agent_sim.templates import commons_template
from pydantic_ai import models as provider_models

provider_models.ALLOW_MODEL_REQUESTS = False
port = int(os.getenv("JAS_TEST_PORT", "8095"))
origin = f"http://127.0.0.1:{port}"
with TemporaryDirectory(prefix="jas-gallery-browser-") as temporary:
    directory = Path(temporary)
    db = Database(f"sqlite:///{directory / 'workspace.sqlite3'}", ceiling=0)
    models = LanguageModels(db)
    research = Research(db, models)
    engine = Engine(db, research, models)
    design = commons_template()
    design.rounds = 2
    design.seeds = [7]
    for condition in design.conditions:
        condition.harness = ScriptedHarness(policy="commons_half_v1")
    sid = research.save_design(design)
    runs = research.study(sid)["runs"]

    async def finish():
        for run in runs:
            await engine.start(run["id"])
            await engine.executions[run["id"]].task
        await models.close()

    asyncio.run(finish())
    record = public_record(
        research,
        sid,
        1,
        PublicationDescription(
            title="A recorded commons experiment",
            finding="Scripted agents contribute half their resources in both conditions.",
            featured_run=runs[0]["id"],
            visibility="public",
            tags=["scripted", "commons"],
        ),
    )
    assert models.usage()["requests"] == 0
    research.environments.close()
    research.extensions.close()
    db.close()
    app = create_gallery_app(directory / "gallery", origin=origin)
    gallery = app.state.gallery
    account_id = gallery.account(
        {"id": 17, "login": "researcher", "created_at": "2020-01-01T00:00:00Z"}
    )
    gallery.publish({"id": account_id, "handle": "researcher"}, record)
    uvicorn.run(app, host="127.0.0.1", port=port, access_log=False)
