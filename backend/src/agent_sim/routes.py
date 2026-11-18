import asyncio
import json
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import Field
from sqlalchemy import select, text
from starlette.background import BackgroundTask

from .db import Annotation, ProviderCall
from .dependencies import (
    AssistantsDep,
    DatabaseDep,
    EngineDep,
    ExtensionsDep,
    LanguageModelsDep,
    ResearchDep,
)
from .domain import Design, EnvironmentMechanics, SavedEnvironment, Strict
from .environment_library import builtin_environment, definition_from_design, use_environment
from .exports import export_studies, export_study
from .extensions import (
    ExtensionAdmission,
    ExtensionCandidate,
    ExtensionReview,
    ExtensionRuntime,
    FiniteAdmission,
)
from .finite_contract import (
    FiniteArtifactCheck,
    FiniteContract,
    ReviewedFiniteContract,
)
from .research import RunSummary
from .shared_json import portable_json
from .simulation.environments import CATALOG, MEASURE_DESCRIPTIONS, get_environment
from .starters import starters
from .templates import templates

router = APIRouter()
web_router = APIRouter()


@router.get("/api/starters")
async def starter_experiments(*, models: LanguageModelsDep) -> list[dict]:
    return [
        {**starter, "estimate": models.estimate(Design.model_validate(starter["design"]))}
        for starter in starters()
    ]


@router.post("/api/extensions/contracts", status_code=201)
async def freeze_finite_contract(
    body: FiniteContract, *, extensions: ExtensionsDep
) -> ReviewedFiniteContract:
    return await asyncio.to_thread(extensions.freeze_contract, body)


@router.get("/api/extensions/contracts")
async def finite_contracts(*, extensions: ExtensionsDep) -> list[ReviewedFiniteContract]:
    return await asyncio.to_thread(extensions.contracts)


@router.get("/api/extensions/contracts/{key}")
async def finite_contract(key: str, *, extensions: ExtensionsDep) -> ReviewedFiniteContract:
    return await asyncio.to_thread(extensions.contract, key)


class CheckFiniteArtifact(Strict):
    review_id: str = Field(pattern=r"^[a-f0-9]{16}$")


@router.post("/api/extensions/contracts/{key}/checks", status_code=201)
async def check_finite_artifact(
    key: str, body: CheckFiniteArtifact, *, extensions: ExtensionsDep
) -> FiniteArtifactCheck:
    return await asyncio.to_thread(extensions.check_finite_artifact, key, body.review_id)


@router.get("/api/extensions/finite-checks")
async def finite_checks(*, extensions: ExtensionsDep) -> list[FiniteArtifactCheck]:
    return await asyncio.to_thread(extensions.finite_checks)


@router.get("/api/extensions/finite-checks/{key}")
async def finite_check(key: str, *, extensions: ExtensionsDep) -> FiniteArtifactCheck:
    return await asyncio.to_thread(extensions.finite_check, key)


@router.post("/api/extensions/finite-checks/{key}/admit", status_code=201)
async def admit_finite(key: str, *, extensions: ExtensionsDep) -> FiniteAdmission:
    return await asyncio.to_thread(extensions.admit_finite, key)


@router.get("/api/extensions/finite-admissions")
async def finite_admissions(*, extensions: ExtensionsDep) -> list[FiniteAdmission]:
    return await asyncio.to_thread(extensions.finite_admissions)


@router.get("/api/extensions/finite-admissions/{key}")
async def finite_admission(key: str, *, extensions: ExtensionsDep) -> FiniteAdmission:
    return await asyncio.to_thread(extensions.finite_admission, key)


@router.get("/api/extensions/profile")
async def extension_profile() -> dict:
    return {
        "profile": "reviewed-finite-v1",
        "prerequisite": "Independently user-authored, reviewed, frozen exhaustive finite table.",
        "interpretation": "Conformance to an external finite table, "
        "not independently understood intent.",
        "finite_input_limit": 256,
        "invalid_inputs": [-1, "domain_size", 2147483647, -2147483648],
        "supported": [
            "deterministic role/state/credit transitions",
            "conserved resource/escrow",
            "static actor-private facts",
            "fixed role order",
            "terminal or bounded horizon",
        ],
        "unsupported": [
            "dynamic information policy",
            "richer world semantics",
            "host imports",
            "external systems",
            "native code",
            "arbitrary programs",
        ],
        "candidate_self_tests_admit": False,
        "requires_current_runtime": True,
        "requires_separate_participant_execution": True,
        "contract_schema": FiniteContract.model_json_schema(),
    }


@router.get("/api/extensions/runtime")
async def extension_runtime(*, extensions: ExtensionsDep) -> ExtensionRuntime:
    return extensions.runtime


@router.post("/api/extensions/validate", status_code=201)
async def validate_extension(
    body: ExtensionCandidate, *, extensions: ExtensionsDep
) -> ExtensionReview:
    return await asyncio.to_thread(extensions.validate, body)


@router.post("/api/extensions/qualify")
async def qualify_extensions(*, extensions: ExtensionsDep) -> ExtensionRuntime:
    return await asyncio.to_thread(extensions.qualify)


@router.get("/api/extensions/reviews")
async def extension_reviews(*, extensions: ExtensionsDep) -> list[ExtensionReview]:
    return await asyncio.to_thread(extensions.reviews)


@router.get("/api/extensions/reviews/{key}")
async def extension_review(key: str, *, extensions: ExtensionsDep) -> ExtensionReview:
    return await asyncio.to_thread(extensions.get, key)


class AdmitExtension(Strict):
    profile: str = Field(min_length=1, max_length=80)


@router.post("/api/extensions/reviews/{key}/admit", status_code=201)
async def admit_extension(
    key: str, body: AdmitExtension, *, extensions: ExtensionsDep
) -> ExtensionAdmission:
    return await asyncio.to_thread(extensions.admit, key, body.profile)


@router.get("/api/extensions/admissions")
async def extension_admissions(*, extensions: ExtensionsDep) -> list[ExtensionAdmission]:
    return await asyncio.to_thread(extensions.admissions)


@router.get("/api/extensions/admissions/{key}")
async def extension_admission(key: str, *, extensions: ExtensionsDep) -> ExtensionAdmission:
    return await asyncio.to_thread(extensions.admission, key)


async def static_directory(request: Request) -> Path:
    return request.app.state.frontend


PathDep = Annotated[Path, Depends(static_directory)]


class SaveStudy(Strict):
    design: Design
    plan_id: str | None = None


class SaveEnvironment(Strict):
    definition: EnvironmentMechanics
    revision: int | None = Field(default=None, ge=1)


class UseEnvironment(Strict):
    design: Design | None = None
    source: SavedEnvironment
    example: str
    bindings: dict[str, str] = Field(default_factory=dict)


@router.post("/api/design/use-environment")
async def apply_environment(body: UseEnvironment, *, research: ResearchDep) -> Design:
    design = await asyncio.to_thread(
        use_environment, body.design, body.source, body.example, body.bindings
    )
    research.validate_design(design)
    return design


class ExtractEnvironment(Strict):
    design: Design


@router.post("/api/design/environment")
async def extract_environment(
    body: ExtractEnvironment, *, research: ResearchDep
) -> EnvironmentMechanics:
    research.validate_design(body.design)
    return await asyncio.to_thread(definition_from_design, body.design)


class ChatMessage(Strict):
    question: str = Field(min_length=1, max_length=4000)
    context: str = "general"
    chat_id: str | None = None
    lens: Literal["behavior", "communication"] | None = None
    source_analysis_id: str | None = Field(default=None, min_length=1, max_length=80)
    revision: int | None = Field(default=None, ge=1)
    through_turn: int | None = Field(default=None, ge=0)


class Note(Strict):
    turn: int = Field(ge=0)
    label: str = Field(min_length=1, max_length=80)
    note: str = Field(min_length=1, max_length=4000)


class StudyControl(Strict):
    action: Literal["start", "pause"]


class RunControl(Strict):
    action: Literal["start", "pause", "step"]


@router.get("/api/health")
async def health(*, db: DatabaseDep) -> dict[str, Any]:
    with db.session() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok", "version": "0.2.0"}


@router.get("/api/catalog")
async def catalog(*, models: LanguageModelsDep, research: ResearchDep) -> dict[str, Any]:
    examples = templates()
    estimates = {
        item["id"]: {
            "agents": len(design.profiles),
            **models.estimate(design),
        }
        for item in examples
        for design in [Design.model_validate(item["design"])]
    }
    sources = [builtin_environment(key) for key in CATALOG]
    admitted = next(
        (
            source
            for source in research.environments.list()
            if source.definition.environment in {"sealed_relay", "reviewed_finite"}
        ),
        None,
    )
    if admitted:
        sources.append(admitted)
    return {
        "environments": [
            {
                "key": a.key,
                "name": a.name,
                "description": a.description,
                "primary_metric": a.primary_metric,
                "parameters": list(a.parameters),
                "measures": list(a.measures),
                "measure_definitions": {m: MEASURE_DESCRIPTIONS[m] for m in a.measures},
                "rule_version": a.world.version,
                "source": source.model_dump(),
                "example": estimates.get(a.key),
            }
            for source in sources
            for a in [get_environment(source.definition.environment)]
        ],
        "models": models.catalog(),
        "templates": examples,
        "design_schema": Design.model_json_schema(),
        "environment_schema": EnvironmentMechanics.model_json_schema(),
    }


@router.get("/api/environments")
async def custom_environments(*, research: ResearchDep) -> list[dict]:
    return [record.model_dump() for record in research.environments.list()]


@router.get("/api/environments/{key}")
async def custom_environment(key: str, *, research: ResearchDep) -> dict:
    return research.environments.get(key).model_dump()


@router.post("/api/environments", status_code=201)
async def create_environment(body: SaveEnvironment, *, research: ResearchDep) -> dict:
    return (await asyncio.to_thread(research.environments.save, body.definition)).model_dump()


@router.put("/api/environments/{key}")
async def update_environment(key: str, body: SaveEnvironment, *, research: ResearchDep) -> dict:
    return (
        await asyncio.to_thread(research.environments.save, body.definition, key, body.revision)
    ).model_dump()


@router.delete("/api/environments/{key}")
async def delete_environment(
    key: str, revision: int = Query(ge=1), *, research: ResearchDep
) -> dict:
    await asyncio.to_thread(research.environments.delete, key, revision)
    return {"ok": True}


@router.post("/api/design/estimate")
async def estimate_design(body: SaveStudy, *, models: LanguageModelsDep) -> dict:
    return models.estimate(body.design)


@router.get("/api/studies")
async def studies(*, research: ResearchDep) -> list[dict[str, Any]]:
    return research.studies()


@router.post("/api/design/validate")
async def validate_design(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    research.validate_design(body.design)
    return body.design.model_dump()


@router.post("/api/design/preflight")
async def check_design(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    return await asyncio.to_thread(research.review_design, body.design, body.plan_id)


@router.post("/api/studies", status_code=201)
async def create_study(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    saved = await asyncio.to_thread(research.save_design, body.design, plan_id=body.plan_id)
    return {"id": saved}


@router.get("/api/studies/{study_id}")
async def get_study(
    study_id: str, revision: int | None = Query(default=None, ge=1), *, research: ResearchDep
) -> dict[str, Any]:
    return await asyncio.to_thread(research.study, study_id, revision)


@router.delete("/api/studies/{study_id}")
async def delete_study(
    study_id: str,
    *,
    research: ResearchDep,
    engine: EngineDep,
    assistants: AssistantsDep,
) -> dict[str, bool]:
    # Keep this on the owning event loop: task creation and deletion cannot race.
    research.delete_study(
        study_id,
        active_runs={
            key
            for key, execution in engine.executions.items()
            if execution.task and not execution.task.done()
        },
        active_analyses={key for key, task in assistants.tasks.items() if not task.done()},
    )
    return {"ok": True}


@router.post("/api/studies/{study_id}/revisions", status_code=201)
async def revise_study(study_id: str, body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    saved = await asyncio.to_thread(
        research.save_design, body.design, study_id=study_id, plan_id=body.plan_id
    )
    return {"id": saved}


@router.post("/api/studies/{study_id}/control")
async def control_study(study_id: str, body: StudyControl, *, engine: EngineDep) -> dict[str, Any]:
    if body.action == "start":
        await engine.start_study(study_id)
    else:
        engine.pause_study(study_id)
    return {"ok": True}


@router.get("/api/studies/{study_id}/exposure")
def study_exposure(
    study_id: str, revision: int | None = None, *, research: ResearchDep
) -> dict[str, Any]:
    with research.db.read_snapshot():
        detail = research.study(study_id, revision)
        return {
            "revision": detail["revision"],
            "runs": [research.exposure(run["id"]) for run in detail["runs"]],
        }


@router.get("/api/studies/{study_id}/findings")
def study_findings(
    study_id: str, revision: int | None = Query(default=None, ge=1), *, research: ResearchDep
) -> dict:
    return research.findings(study_id, revision)


@router.get("/api/studies/{study_id}/matched")
def matched_runs(
    study_id: str,
    left: str,
    right: str,
    seed: Annotated[int, Query(ge=0)],
    repetition: Annotated[int, Query(ge=1, le=10)],
    revision: Annotated[int, Query(ge=1)],
    *,
    research: ResearchDep,
) -> dict:
    return research.matched(study_id, revision, left, right, seed, repetition)


class ExportStudies(Strict):
    ids: list[Annotated[str, Field(pattern=r"^[a-f0-9]{16}$")]] = Field(
        min_length=1, max_length=1000
    )


@router.post("/api/exports/studies")
async def download_studies(body: ExportStudies, *, research: ResearchDep) -> FileResponse:
    archive = await asyncio.to_thread(export_studies, research, body.ids)
    return FileResponse(
        archive,
        media_type="application/zip",
        filename="jas-experiments.zip",
        headers={"Cache-Control": "no-store"},
        background=BackgroundTask(archive.unlink, missing_ok=True),
    )


@router.get("/api/studies/{study_id}/export")
async def download_study(
    study_id: str, *, research: ResearchDep, download: bool = False
) -> JSONResponse:
    return JSONResponse(
        await asyncio.to_thread(export_study, research, study_id, download=download),
        headers={"Content-Disposition": f'attachment; filename="jas-{study_id}.json"'},
    )


@router.get("/api/runs")
async def runs(study_id: str | None = None, *, research: ResearchDep) -> list[RunSummary]:
    return research.runs(study_id)


@router.get("/api/runs/{run_id}", response_model=dict[str, Any])
def get_run(run_id: str, *, research: ResearchDep) -> JSONResponse:
    with research.db.read_snapshot():
        return JSONResponse(research.run(run_id))


@router.get("/api/runs/{run_id}/exposure")
def get_exposure(
    run_id: str, through_turn: int | None = None, *, research: ResearchDep
) -> dict[str, Any]:
    with research.db.read_snapshot():
        return research.exposure(run_id, through_turn)


@router.get("/api/requests/{call_id}")
async def request_evidence(call_id: str, *, db: DatabaseDep) -> dict[str, Any]:
    with db.session() as session:
        call = session.get_one(ProviderCall, call_id)
        return {
            "id": call.id,
            "run_id": call.run_id,
            "activation_id": call.activation_id,
            "analysis_id": call.analysis_id,
            "purpose": call.purpose,
            "model": call.model,
            "turn": call.turn,
            "request": call.request_payload,
            "response": call.response_payload,
            "error": call.error,
            "status": call.status,
        }


@router.get("/api/runs/{run_id}/turns/{number}")
def get_evidence(run_id: str, number: int, *, research: ResearchDep) -> dict[str, Any]:
    with research.db.read_snapshot():
        return research.evidence(run_id, number)


@router.post("/api/runs/{run_id}/control")
async def control_run(run_id: str, body: RunControl, *, engine: EngineDep) -> dict[str, Any]:
    if body.action == "pause":
        engine.pause(run_id)
    else:
        await engine.start(run_id, single=body.action == "step")
    return {"ok": True}


@router.post("/api/runs/{run_id}/verify")
async def verify_run(run_id: str, *, engine: EngineDep) -> dict[str, Any]:
    return await asyncio.to_thread(engine.replay, run_id)


@router.get("/api/runs/{run_id}/annotations")
async def notes(run_id: str, *, db: DatabaseDep, research: ResearchDep) -> list[dict[str, Any]]:
    research.configuration(run_id)
    with db.session() as session:
        return [
            {"id": n.id, "turn": n.turn, "label": n.label, "note": n.note, "created": n.created}
            for n in session.scalars(
                select(Annotation).where(Annotation.run_id == run_id).order_by(Annotation.created)
            )
        ]


@router.post("/api/runs/{run_id}/annotations", status_code=201)
async def add_note(
    run_id: str, body: Note, *, db: DatabaseDep, research: ResearchDep
) -> dict[str, Any]:
    run, _, _ = research.configuration(run_id)
    if body.turn > run.turn:
        raise ValueError("Cannot annotate an unrecorded turn")
    with db.session.begin() as session:
        note = Annotation(run_id=run_id, **body.model_dump())
        session.add(note)
        session.flush()
        return {"id": note.id}


@router.get("/api/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: str, *, assistants: AssistantsDep, download: bool = False
) -> JSONResponse:
    with assistants.db.read_snapshot():
        record = assistants.get(analysis_id)
    if download:
        return JSONResponse(
            await asyncio.to_thread(
                portable_json,
                record,
                {
                    "id": record["id"],
                    "question": record["question"],
                    "status": record["status"],
                    "cutoffs": record["cutoffs"],
                    "scope": "One frozen analysis record; never later evidence.",
                },
            ),
            headers={
                "Content-Disposition": f'attachment; filename="jas-analysis-{analysis_id}.json"'
            },
        )
    return JSONResponse(record)


@router.get("/api/chats")
async def chats(*, assistants: AssistantsDep) -> list[dict]:
    return list(assistants.chats())


@router.get("/api/chats/{chat_id}")
async def chat(chat_id: str, *, assistants: AssistantsDep) -> list[dict]:
    return list(assistants.chat(chat_id))


@router.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str, *, assistants: AssistantsDep) -> dict:
    assistants.delete_chat(chat_id)
    return {"deleted": chat_id}


@router.get("/api/chats/{chat_id}/events")
async def chat_events(chat_id: str, *, assistants: AssistantsDep) -> StreamingResponse:
    key = assistants.chat(chat_id)[-1]["id"]

    async def events():
        previous, heartbeat = None, asyncio.get_running_loop().time()
        while True:
            row = assistants.get(key)
            snapshot = json.dumps(row)
            now = asyncio.get_running_loop().time()
            if snapshot != previous:
                yield f"data: {snapshot}\n\n"
                previous, heartbeat = snapshot, now
            elif now - heartbeat >= 15:
                yield ": keep-alive\n\n"
                heartbeat = now
            if row["status"] != "pending":
                return
            await asyncio.sleep(0.15)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/chats", status_code=202)
async def send_chat(body: ChatMessage, *, assistants: AssistantsDep) -> dict:
    return await assistants.send(
        body.question,
        body.context,
        body.chat_id,
        body.lens,
        body.source_analysis_id,
        body.revision,
        body.through_turn,
    )


@router.get("/api/analyses/{key}/requests")
async def analysis_requests(key: str, *, assistants: AssistantsDep, db: DatabaseDep) -> list[dict]:
    assistants.get(key)
    with db.session() as session:
        return [
            {
                "id": call.id,
                "model": call.model,
                "purpose": call.purpose,
                "status": call.status,
                "reserved": call.reserved,
                "charged": call.charged,
                "error": call.error,
                "input_tokens": call.input_tokens,
                "output_tokens": call.output_tokens,
            }
            for call in session.scalars(
                select(ProviderCall)
                .where(ProviderCall.analysis_id == key)
                .order_by(ProviderCall.created, ProviderCall.id)
            )
        ]


@web_router.get("/{path:path}", include_in_schema=False)
async def web(path: str, *, frontend: PathDep):
    if path.startswith("api/"):
        raise HTTPException(404, "Endpoint not found")
    asset = (frontend / path).resolve()
    if not asset.is_relative_to(frontend):
        raise HTTPException(404)
    if asset.is_file():
        return FileResponse(asset)
    index = frontend / "index.html"
    if not index.is_file():
        return JSONResponse(
            {"detail": "Frontend not built. Run pnpm --dir frontend build."}, status_code=503
        )
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
