import asyncio

from agent_sim.db import Analysis, Annotation, ProviderCall
from agent_sim.exports import export_study


def test_export_keeps_own_provenance_and_evidence_without_unrelated_work(runtime, design):
    db, models, research, engine = runtime
    with db.session.begin() as session:
        proposal = Analysis(
            purpose="design",
            question="Propose",
            status="complete",
            cutoffs={},
            output={"supported": True},
        )
        unrelated = Analysis(
            purpose="general",
            question="Unrelated conversation",
            status="complete",
            cutoffs={},
        )
        session.add_all([proposal, unrelated])
        session.flush()
        proposal_id, unrelated_id = proposal.id, unrelated.id
        for key in (proposal_id, unrelated_id):
            session.add(
                ProviderCall(
                    purpose="design",
                    model="openai:gpt-6.1-sol",
                    analysis_id=key,
                    status="complete",
                    reserved=10,
                    charged=10,
                    request_payload={"prompt": key},
                    response_payload=[],
                )
            )
    sid = research.save_design(design, plan_id=proposal_id)
    other_sid = research.save_design(design)
    rid = research.operational_runs(sid)[0].id
    other_rid = research.operational_runs(other_sid)[0].id

    async def exercise():
        for key in (rid, other_rid):
            await engine.start(key, single=True)
            await engine.executions[key].task
        await engine.close()

    asyncio.run(exercise())
    with db.session.begin() as session:
        for key in (rid, other_rid):
            session.add(Annotation(run_id=key, turn=1, label="Review", note=key))
    before = models.usage()
    exported = export_study(research, sid)
    analyses, requests = exported["analyses"], exported["requests"]
    annotations, runs = exported["annotations"], exported["runs"]
    assert isinstance(analyses, list) and isinstance(requests, list)
    assert isinstance(annotations, list) and isinstance(runs, list)
    assert [row["id"] for row in analyses] == [proposal_id]
    assert {row["analysis_id"] for row in requests} == {proposal_id, None}
    assert len(requests) == 2
    assert [row["run_id"] for row in annotations] == [rid]
    assert len(runs) == 1
    evidence = runs[0]["evidence"]
    assert evidence[1] == research.evidence(rid, 1)
    assert evidence[1]["events"]
    assert models.usage() == before
