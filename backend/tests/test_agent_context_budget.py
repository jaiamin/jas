"""Regressions for bounded context across drafting, retrieval and analysis."""

import copy
import hashlib

import pytest
from agent_sim.api import create_app
from agent_sim.planning import Planner
from fastapi.testclient import TestClient

from backend.tests.test_researcher_designs import artifact_design, finish, provider, scope


def noise(label: str, count: int) -> str:
    return " ".join(hashlib.sha256(f"{label}:{i}".encode()).hexdigest() for i in range(count))


@pytest.mark.parametrize("unicode_text", [False, True])
def test_large_artifact_drafts_repair_and_review_without_exhausting_input(
    tmp_path, monkeypatch, unicode_text
):
    app = create_app(f"sqlite:///{tmp_path}/context.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        design["conditions"] = [copy.deepcopy(design["conditions"][0]) for _ in range(2)]
        for i, condition in enumerate(design["conditions"]):
            condition.update(key=f"condition_{i}", name=f"Evidence condition {i}")
            for j, obj in enumerate(condition["parameters"]["artifacts"]["objects"]):
                obj["content"]["docket"] = noise(f"document_{i}_{j}", 12)
        design["question"] = "Design a persistent report study with two evidence conditions."
        design["context"] = (
            "记録を確認して判断する。" * 80 if unicode_text else noise("instructions", 30)
        )
        assert client.post("/api/design/validate", json={"design": design}).is_success
        original = Planner._context

        def with_research(self, question, conversation):
            return {
                **original(self, question, conversation),
                "research": {
                    "notes": noise("independent_method_notes", 145),
                    "sources": [{"url": "https://example.org/method", "title": "Methods"}],
                },
            }

        monkeypatch.setattr(Planner, "_context", with_research)
        drafts, reviews = [], []

        def draft(prompt):
            drafts.append(prompt)
            value = copy.deepcopy(design)
            if len(drafts) == 1:
                value["conditions"][0]["parameters"]["artifacts"]["requirements"] = []
            return {
                "explanation": "Preserve every source document while fixing validation.",
                "design": value,
            }

        def review(prompt):
            reviews.append(prompt)
            return {
                "issues": ["Clarify that missing submissions stay missing."]
                if len(reviews) == 1
                else [],
                "summary": "Compare source-backed submissions without imputing missing work.",
            }

        calls = provider(
            client,
            monkeypatch,
            design,
            brief=scope(
                design,
                requirements=[
                    {
                        "source": "persistent report",
                        "capability": "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Versioned evidence and submitted work.",
                    }
                ],
            ),
            candidate=draft,
            review=review,
        )
        result = finish(
            client,
            client.post("/api/chats", json={"question": design["question"], "context": "new"}),
        )
        assert result["status"] == "complete", result["error"]
        assert len(drafts) == 3 and len(reviews) == 2
        for prompt in drafts[1:]:
            assert prompt["candidate"]["design"]["context"] == design["context"]
            assert prompt["feedback"]
            assert prompt["question"] == design["question"]
        for prompt in reviews:
            assert prompt["candidate"]["design"]["conditions"] == design["conditions"]
        assert result["output"]["design"]["context"] == design["context"]
        assert len(calls) == result["usage"]["requests"]
        assert client.get("/api/studies").json() == []


@pytest.mark.parametrize("read_whole_first", [False, True])
def test_general_followup_pages_large_prior_protocol_without_losing_retained_data(
    tmp_path, monkeypatch, read_whole_first
):
    from agent_sim.db import Analysis

    app = create_app(f"sqlite:///{tmp_path}/history.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        design["conditions"] = [copy.deepcopy(design["conditions"][0]) for _ in range(6)]
        for i, condition in enumerate(design["conditions"]):
            condition.update(key=f"condition_{i}", name=f"Condition {i}")
            for j, obj in enumerate(condition["parameters"]["artifacts"]["objects"]):
                obj["content"].update({f"note_{k}": noise(f"{i}:{j}:{k}", 12) for k in range(11)})
        assert client.post("/api/design/validate", json={"design": design}).is_success
        with app.state.db.session.begin() as session:
            previous = Analysis(
                purpose="design",
                chat_id="large-history",
                question="Earlier evidence protocol",
                status="complete",
                output={"design": design},
                cutoffs={},
            )
            session.add(previous)
            session.flush()
            previous_id = previous.id
        prompts = []
        path = [
            "output",
            "design",
            "conditions",
            0,
            "parameters",
            "artifacts",
            "objects",
            0,
            "content",
            "note_0",
        ]

        def general(prompt):
            prompts.append(prompt)
            if len(prompts) == 1 and read_whole_first:
                requests = [{"kind": "context", "analysis_id": previous_id}]
            elif len(prompts) == 1 or (read_whole_first and len(prompts) == 2):
                assert prompt["conversation"][0]["proposal"]["not_in_context"]
                if read_whole_first:
                    assert prompt["research"]["operations"][-1]["data"]["not_in_context"]
                requests = [
                    {
                        "kind": "context",
                        "analysis_id": previous_id,
                        "path": path,
                        "start": 0,
                        "count": 200,
                    }
                ]
            else:
                result = prompt["research"]["operations"][-1]["data"]
                assert (
                    result["items"]
                    == design["conditions"][0]["parameters"]["artifacts"]["objects"][0]["content"][
                        "note_0"
                    ][:200]
                )
                assert result["next_start"] == 200
                requests = []
            return {
                "answer": "Inspecting retained source details.",
                "propose_experiment": False,
                "requests": requests,
                "citations": [],
                "caveats": [],
            }

        provider(client, monkeypatch, design, general=general)
        result = finish(
            client,
            client.post(
                "/api/chats",
                json={
                    "question": "What is in the earlier protocol?",
                    "chat_id": "large-history",
                    "context": "general",
                },
            ),
        )
        assert result["status"] == "complete", result["error"]
        assert len(prompts) == 2 + read_whole_first
        with app.state.db.session() as session:
            assert session.get_one(Analysis, previous_id).output["design"] == design


def test_large_analysis_scope_pages_run_rows_and_preserves_every_cutoff(runtime, design):
    from agent_sim.analysis_context import AnalysisContext, IndexRequest
    from agent_sim.assistants import Assistants
    from agent_sim.claim_support import capture_lens

    from backend.tests.conftest import analysis_prompt

    db, models, research, _ = runtime
    run_id = research.operational_runs(research.save_design(design))[0].id
    assistants = Assistants(db, research, models)
    index = assistants._evidence_index({run_id: 0})
    lens = capture_lens(research, {run_id: 0}, index=index, analysis_id="frozen")
    row = index["runs"][0]
    index["runs"] = [{**row, "run_id": f"run_{i:04d}"} for i in range(1200)]
    lens["cutoffs"] = {run["run_id"]: 0 for run in index["runs"]}
    context = AnalysisContext(index, lens)
    prompt, visible = context.prompt(
        {
            "question": "Compare all selected runs",
            "conversation": [],
            "evidence": [],
            "research": {"operations": []},
        },
        80_000,
    )
    decoded = analysis_prompt(prompt)
    assert len(prompt.encode()) <= 80_000
    assert decoded["index"]["lens"]["cutoffs"] == lens["cutoffs"]
    assert decoded["index"]["runs_omitted"] == 1200
    assert visible == []
    page = context.page(IndexRequest(kind="index", section="runs", start=1195))
    assert page["items"] == index["runs"][1195:]
    assert len(index["runs"]) == 1200


@pytest.mark.parametrize(
    ("path", "start", "expected", "status"),
    [
        (["output", "design", "values"], 1, [2, 3], "complete"),
        (["output", "design"], 0, {"values": [1, 2, 3], "count": 3}, "complete"),
        (["output", "design", "values"], 9, [], "complete"),
        (["output", "design", "count"], 0, None, "rejected"),
        (["output", "missing"], 0, None, "rejected"),
    ],
)
def test_context_pages_keep_scope_and_reject_invalid_paths(runtime, path, start, expected, status):
    from agent_sim.db import Analysis
    from agent_sim.research_tools import ContextRequest, ResearchTools

    db, models, research, _ = runtime
    with db.session.begin() as session:
        previous = Analysis(
            chat_id="same",
            purpose="design",
            question="Prior protocol",
            created="2026-01-01",
            status="complete",
            cutoffs={},
            output={"design": {"values": [1, 2, 3], "count": 3}},
        )
        current = Analysis(
            chat_id="same",
            purpose="general",
            question="Read earlier fields",
            created="2026-02-01",
            status="pending",
            cutoffs={},
        )
        session.add_all([previous, current])
        session.flush()
        previous_id = previous.id
    tools = ResearchTools(current, research)
    request = ContextRequest(
        kind="context", analysis_id=previous_id, path=path, start=start, count=2
    )
    operation = tools.dispatch(request, tools.begin(request))
    assert operation["status"] == status
    if status == "complete":
        assert operation["data"]["items"] == expected
    else:
        assert operation["data"] is None
    outside = ContextRequest(
        kind="context", analysis_id="another-conversation", path=path, start=start
    )
    rejected = tools.dispatch(outside, tools.begin(outside))
    assert rejected["status"] == "rejected" and rejected["data"] is None
    assert models.usage()["requests"] == 0
