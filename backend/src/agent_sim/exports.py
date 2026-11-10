from collections import defaultdict

from sqlalchemy import select

from .db import (
    Analysis,
    Annotation,
    Condition,
    InvestigationRecord,
    ProviderCall,
    RecordedEvent,
    Revision,
    Run,
    Turn,
)
from .research import Research, event_dict
from .simulation.environments import get_environment


def export_study(research: Research, study_id: str) -> dict[str, object]:
    with research.db.read_snapshot():
        return _export_study(research, study_id)


def _export_study(research: Research, study_id: str) -> dict[str, object]:
    detail = research.study(study_id)
    with research.db.session() as session:
        revisions = session.scalars(
            select(Revision).where(Revision.study_id == study_id).order_by(Revision.number)
        ).all()
        runs = session.scalars(select(Run).where(Run.study_id == study_id)).all()
        environments = dict(
            session.execute(
                select(Condition.id, Revision.design["environment"].as_string())
                .join(Revision, Condition.revision_id == Revision.id)
                .where(Revision.study_id == study_id)
            ).all()
        )
        plan_ids = [
            r.source.removeprefix("plan:") for r in revisions if r.source.startswith("plan:")
        ]
        ids = [r.id for r in runs]
        turns = session.scalars(
            select(Turn).where(Turn.run_id.in_(ids)).order_by(Turn.number)
        ).all()
        events = session.scalars(
            select(RecordedEvent).where(RecordedEvent.run_id.in_(ids)).order_by(RecordedEvent.id)
        ).all()
        calls = session.scalars(
            select(ProviderCall).where(
                (ProviderCall.study_id == study_id) | ProviderCall.analysis_id.in_(plan_ids)
            )
        ).all()
        annotations = session.scalars(select(Annotation).where(Annotation.run_id.in_(ids))).all()
        analyses = session.scalars(
            select(Analysis).where((Analysis.study_id == study_id) | Analysis.id.in_(plan_ids))
        ).all()
        investigations = session.scalars(
            select(InvestigationRecord).where(
                InvestigationRecord.id.in_(
                    [a.investigation_id for a in analyses if a.investigation_id]
                )
            )
        ).all()
    grouped_events: dict[tuple[str, int], list[dict]] = defaultdict(list)
    grouped_turns: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        grouped_events[event.run_id, event.turn].append(event_dict(event))
    for turn in turns:
        grouped_turns[turn.run_id].append(
            {
                "number": turn.number,
                "round": turn.round,
                "actor": turn.actor,
                "observation": turn.observation,
                "decision": turn.decision,
                "checkpoint": turn.checkpoint,
                "state_hash": turn.state_hash,
                "events": grouped_events[turn.run_id, turn.number],
            }
        )
    initial = {
        run.id: research.evidence(run.id, 0)
        for run in runs
        if run.turn == 0
        or run.checkpoint["rule_version"]
        == get_environment(environments[run.condition_id]).world.version
    }
    return {
        "format": "jas-study",
        "version": 17,
        "extension_generations": [
            attempt
            for attempt in research.extensions.generations.list()
            if attempt["analysis_id"] in {analysis.id for analysis in analyses}
        ],
        "investigations": [
            {
                "id": i.id,
                "authorization": i.authorization,
                "status": i.status,
                "stage": i.stage,
                "stop_reason": i.stop_reason,
                "requests": i.requests,
                "charged_usd": i.charged / 1_000_000,
                "attempts": i.attempts,
                "decisions": i.decisions,
                "confirmation": i.confirmation,
                "result": i.result,
            }
            for i in investigations
        ],
        "rule_versions": sorted({run.checkpoint["rule_version"] for run in runs}),
        "study": detail,
        "activations": [a for run in runs for a in research.activations(run.id)],
        "exposure": [research.exposure(run.id) for run in runs],
        "annotations": [
            {
                "run_id": a.run_id,
                "turn": a.turn,
                "label": a.label,
                "note": a.note,
                "created": a.created,
            }
            for a in annotations
        ],
        "analyses": [
            {
                "id": a.id,
                "run_id": a.run_id,
                "question": a.question,
                "status": a.status,
                "cutoffs": a.cutoffs,
                "output": a.output,
                "error": a.error,
                "created": a.created,
                "generation": {
                    "authorization": a.generation["authorization"],
                    "contract": a.generation["contract"],
                    "requests": a.generation_requests,
                    "candidates": a.generation_candidates,
                    "charged_microdollars": a.generation_charged,
                }
                if a.generation is not None
                else None,
            }
            for a in analyses
        ],
        "revisions": [
            {
                "number": r.number,
                "design": r.design,
                "sha256": r.sha256,
                "created": r.created,
                "source": r.source,
            }
            for r in revisions
        ],
        "requests": [
            {
                "id": c.id,
                "investigation_id": c.investigation_id,
                "run_id": c.run_id,
                "analysis_id": c.analysis_id,
                "activation_id": c.activation_id,
                "turn": c.turn,
                "model": c.model,
                "purpose": c.purpose,
                "status": c.status,
                "request": c.request_payload,
                "response": c.response_payload,
                "input_tokens": c.input_tokens,
                "output_tokens": c.output_tokens,
                "cost_usd": c.charged / 1_000_000,
                "reserved": c.reserved,
                "charged": c.charged,
                "error": c.error,
            }
            for c in calls
        ],
        "runs": [
            {
                "record": research.run(r.id),
                "initial_state_available": r.id in initial,
                "evidence": ([initial[r.id]] if r.id in initial else []) + grouped_turns[r.id],
            }
            for r in runs
        ],
    }
