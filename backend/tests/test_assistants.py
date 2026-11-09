import asyncio
import json

import pytest
from agent_sim.assistants import Assistants, GeneralResponse, HistoryRequest, Investigation
from agent_sim.domain import Citation, Finding


@pytest.mark.parametrize("invented_citation", [False, True])
def test_general_agent_keeps_history_separate_and_rejects_unselected_evidence(
    runtime, design, monkeypatch, invented_citation
):
    import json

    from agent_sim.db import Analysis

    db, llm, research, _ = runtime
    sid = research.save_design(design)

    async def exercise():
        assistant = Assistants(db, research, llm)
        with db.session.begin() as session:
            session.add_all(
                [
                    Analysis(
                        purpose="general",
                        chat_id="general-chat",
                        question="What is a matched seed?",
                        status="complete",
                        output={"answer": "A shared initial random seed."},
                        cutoffs={},
                    ),
                    Analysis(
                        purpose="design",
                        question="Design cooperation trials",
                        status="complete",
                        output={"answer": "A design proposal."},
                        cutoffs={},
                    ),
                    Analysis(
                        purpose="analysis",
                        study_id=sid,
                        question="Private run evidence",
                        status="complete",
                        output={"answer": "Scoped evidence."},
                        cutoffs={},
                    ),
                ]
            )

        async def generate(output, **kwargs):
            prompt = json.loads(kwargs["prompt"])
            assert output is GeneralResponse and kwargs["purpose"] == "general"
            assert kwargs.get("study_id") is None and kwargs.get("run_id") is None
            assert prompt["conversation"] == [
                {
                    "question": "What is a matched seed?",
                    "answer": "A shared initial random seed.",
                    "cutoffs": {},
                }
            ]
            assert len(prompt["environments"]) == 8
            assert "index" not in prompt and "evidence" not in prompt
            return GeneralResponse(
                answer="Matched seeds support more informative comparisons.",
                propose_experiment=invented_citation,
                citations=[Citation(run_id="unselected", turn=1)] if invented_citation else [],
                caveats=[],
            )

        monkeypatch.setattr(llm, "generate", generate)
        key = assistant.start(
            "How do they help comparisons?", purpose="general", chat_id="general-chat"
        )
        await assistant.tasks[key]
        row = assistant.get(key)
        assert row["cutoffs"] == {} and row["study_id"] is None and row["run_id"] is None
        if invented_citation:
            assert row["status"] == "failed" and "unselected" in row["error"]
        else:
            assert row["status"] == "complete" and row["output"]["citations"] == []
        assert research.study(sid)["design"] == design.model_dump()
        await assistant.close()

    asyncio.run(exercise())


@pytest.mark.parametrize("citation_turn", [1, 2])
def test_assistant_scopes_history_to_frozen_cutoff_and_rejects_unread_citations(
    runtime, design, monkeypatch, citation_turn
):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid, single=True)
        await engine.executions[rid].task
        assistant = Assistants(db, research, llm)
        from agent_sim.db import Analysis

        with db.session.begin() as session:
            session.add_all(
                [
                    Analysis(
                        purpose="analysis",
                        study_id=sid,
                        run_id=rid,
                        chat_id="scoped-chat",
                        question="What changed?",
                        status="complete",
                        output={"answer": "The contribution changed."},
                        cutoffs={rid: 1},
                    ),
                    Analysis(
                        purpose="analysis",
                        study_id=sid,
                        run_id=None,
                        question="A different scope",
                        status="complete",
                        output={"answer": "Do not include me."},
                        cutoffs={rid: 1},
                    ),
                ]
            )
        responses = iter(
            [
                Investigation(
                    requests=[HistoryRequest(kind="history", run_id=rid, start=1, count=20)],
                    answer=None,
                ),
                Investigation(
                    requests=[],
                    answer=Finding(
                        answer="Observed an action.",
                        citations=[Citation(run_id=rid, turn=citation_turn)],
                        caveats=[],
                    ),
                ),
            ]
        )

        async def generate(*args, **kwargs):
            import json

            assert json.loads(kwargs["prompt"])["conversation"] == [
                {
                    "question": "What changed?",
                    "answer": "The contribution changed.",
                    "cutoffs": {rid: 1},
                }
            ]
            return next(responses)

        monkeypatch.setattr(llm, "generate", generate)
        with db.session.begin() as session:
            analysis = Analysis(
                purpose="analysis",
                study_id=sid,
                run_id=rid,
                chat_id="scoped-chat",
                question="What happened?",
                cutoffs={rid: 1},
            )
            session.add(analysis)
            session.flush()
            key = analysis.id
        row = {
            "id": key,
            "study_id": sid,
            "run_id": rid,
            "question": "What happened?",
            "cutoffs": {rid: 1},
        }
        output = await assistant._investigate(
            row["id"],
            row["question"],
            study_id=row["study_id"],
            run_id=row["run_id"],
            cutoffs=row["cutoffs"],
        )
        progress = assistant.get(key)["output"]
        assert progress["stage"] == "investigating"
        assert progress["examined"] == output["examined"]
        return output

    if citation_turn == 2:
        with pytest.raises(ValueError, match="outside the captured"):
            asyncio.run(exercise())
    else:
        output = asyncio.run(exercise())
        assert output["examined"] == [{"run_id": rid, "start": 1, "end": 1, "full_turn": False}]


def test_independent_questions_can_plan_concurrently_but_duplicates_are_blocked(
    runtime, monkeypatch
):
    db, llm, research, _ = runtime

    async def exercise():
        assistant = Assistants(db, research, llm)
        release = asyncio.Event()

        async def execute(key):
            await release.wait()

        monkeypatch.setattr(assistant, "_execute", execute)
        first = assistant.start("Question one", purpose="design", chat_id="first-chat")
        second = assistant.start("Question two", purpose="design")
        assert first != second
        with pytest.raises(ValueError, match="current request"):
            assistant.start("Question one", purpose="design", chat_id="first-chat")
        release.set()
        await assistant.close()

    asyncio.run(exercise())


def test_investigator_uses_shared_metric_rules_at_its_frozen_cutoff(runtime, monkeypatch):
    import json

    from agent_sim.db import Measurement
    from agent_sim.domain import Design
    from agent_sim.templates import templates

    db, llm, research, engine = runtime
    design = Design.model_validate(
        next(t["design"] for t in templates() if t["id"] == "renewable_resource")
    )
    design.conditions = design.conditions[:1]
    design.seeds = [7]
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    prompts = []

    async def answer(*args, **kwargs):
        prompts.append(json.loads(kwargs["prompt"]))
        return Investigation(
            requests=[], answer=Finding(answer="No claim.", citations=[], caveats=[])
        )

    async def exercise():
        for _ in range(2):
            engine.start(rid, single=True)
            await engine.executions[rid].task
        with db.session.begin() as session:
            for turn, key, value in [
                (1, "stock_fraction", 0.8),
                (2, "stock_fraction", 0.2),
                (3, "stock_fraction", 0.9),
                (1, "collapse_rate", 1),
                (2, "collapse_rate", 0),
            ]:
                session.add(Measurement(run_id=rid, turn=turn, round=1, key=key, value=value))
        assistant = Assistants(db, research, llm)
        monkeypatch.setattr(llm, "generate", answer)
        key = assistant.start("What is the current stock?", purpose="analysis", run_id=rid)
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        await assistant.close()

    asyncio.run(exercise())
    indexed = prompts[0]["index"]["runs"][0]
    assert indexed["through_turn"] == 2
    assert indexed["metrics"] == {"stock_fraction": 0.2, "collapse_rate": 1}
    assert research.metrics(rid) == {"stock_fraction": 0.9, "collapse_rate": 1}


def test_final_investigation_call_cannot_fetch_evidence_without_a_consumer(
    runtime, design, monkeypatch
):
    from agent_sim.assistants import TurnRequest

    db, llm, research, _ = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    prompts, reads = [], []
    evidence = research.evidence

    def record_evidence(*args):
        reads.append(args)
        return evidence(*args)

    async def request_more(output, **kwargs):
        prompts.append(kwargs["prompt"])
        if len(prompts) == 4:
            assert output is Finding
            return Finding(
                answer="No decisions have been made.",
                citations=[],
                caveats=["No behavioral evidence exists at cutoff zero."],
            )
        assert output is Investigation
        return Investigation(requests=[TurnRequest(kind="turn", run_id=rid, turn=0)], answer=None)

    monkeypatch.setattr(llm, "generate", request_more)
    monkeypatch.setattr(research, "evidence", record_evidence)

    async def exercise():
        assistant = Assistants(db, research, llm)
        key = assistant.start("Inspect everything", purpose="analysis", run_id=rid)
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        assert assistant.get(key)["output"]["caveats"]
        await assistant.close()

    asyncio.run(exercise())
    assert len(prompts) == 4
    assert len(reads) == 2  # Cutoff plus one deduplicated request; final call cannot request.


def test_initial_worker_read_failure_is_persisted_and_logged(runtime, caplog):
    from agent_sim.db import Analysis
    from sqlalchemy import event

    db, llm, research, _ = runtime
    assistant = Assistants(db, research, llm)
    with db.session.begin() as session:
        request = Analysis(question="Inspect evidence", purpose="analysis", cutoffs={})
        session.add(request)
        session.flush()
        key = request.id
    failed = False

    def fail_first_read(connection, cursor, statement, parameters, context, executemany):
        nonlocal failed
        if not failed and statement.lstrip().startswith("SELECT"):
            failed = True
            raise RuntimeError("one-shot initialization failure")

    event.listen(db.engine, "before_cursor_execute", fail_first_read)
    try:
        asyncio.run(assistant._execute(key))
    finally:
        event.remove(db.engine, "before_cursor_execute", fail_first_read)
    with db.session() as session:
        request = session.get_one(Analysis, key)
        assert request.status == "failed"
        assert request.error == "Research assistant failed (RuntimeError)."
    assert f"Analysis {key} failed" in caplog.text
    assert llm.usage()["requests"] == 0


def test_internal_value_error_retains_assistant_diagnostics(runtime, monkeypatch, caplog):
    db, llm, research, _ = runtime
    assistant = Assistants(db, research, llm)

    detail = "invalid internal result"

    async def broken_general(request):
        raise ValueError(detail)

    monkeypatch.setattr(assistant, "_general", broken_general)

    async def exercise():
        key = assistant.start("Explain matched seeds", purpose="general")
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "failed"
        assert f"Analysis {key} failed (ValueError)" in caplog.text
        await assistant.close()

    asyncio.run(exercise())
    assert "broken_general" in caplog.text
    assert "invalid internal result" not in caplog.text


@pytest.mark.parametrize("status", ["pending", "failed"])
def test_analysis_usage_is_consistent_before_any_provider_call(runtime, status):
    from agent_sim.db import Analysis

    db, llm, research, _ = runtime
    assistant = Assistants(db, research, llm)
    with db.session.begin() as session:
        request = Analysis(
            question="Saved without provider work",
            purpose="general",
            status=status,
            chat_id="usage-chat",
            cutoffs={},
        )
        session.add(request)
        session.flush()
        key = request.id
    detail = assistant.get(key)
    assert assistant.chat("usage-chat") == [detail]
    assert detail["usage"] == {
        "requests": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0.0,
        "partial": False,
    }


def test_evidence_index_counts_opportunities_at_the_frozen_cutoff(runtime, design):
    db, llm, research, engine = runtime
    design.profiles = design.profiles[:2]
    design.rounds = 2
    design.conditions[0].parameters.endowment = 10
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        assistant = Assistants(db, research, llm)
        index = assistant._evidence_index({rid: 2})
        row = index["runs"][0]
        assert row["opportunities"]["reports"] == 2
        assert row["opportunities"]["inaccurate_reports"] == 0
        assert row["opportunities"]["feasible_commitments"] == 0
        assert row["outcome"]["total_utility"] == 30
        assert row["through_turn"] == 2
        assert row["completed_at_cutoff"] is False
        assert index["matched_effects"] == {}
        from agent_sim.db import RecordedEvent

        with db.session.begin() as session:
            for turn, kind, payload in [
                (
                    2,
                    "commitment_resolved",
                    dict(eligible=True, actual=5, amount=4, fulfilled=False),
                ),
                (
                    2,
                    "commitment_resolved",
                    dict(eligible=False, actual=0, amount=9, fulfilled=False),
                ),
                (3, "claim", dict(eligible=True, reported=0, known_truth=1, accurate=True)),
            ]:
                session.add(
                    RecordedEvent(
                        run_id=rid,
                        turn=turn,
                        round=1,
                        kind=kind,
                        actor=None,
                        target=None,
                        visibility="researcher",
                        text="Calibration",
                        data=payload,
                    )
                )
        counts = assistant._evidence_index({rid: 2})["runs"][0]["opportunities"]
        assert counts["reports"] == 2 and counts["inaccurate_reports"] == 0
        assert counts["feasible_commitments"] == 1
        assert counts["infeasible_commitments"] == 1
        assert counts["fulfilled_feasible_commitments"] == 1
        await assistant.close()

    asyncio.run(exercise())


def test_composed_accounting_uses_frozen_evidence_not_later_consumption(runtime, monkeypatch):
    from agent_sim.templates import composed_template

    db, models, research, engine = runtime
    design = composed_template()
    design.rounds, design.seeds = 2, [7]
    design.conditions = design.conditions[:1]
    composition = design.conditions[0].parameters.composition
    assert composition is not None
    composition.resources[0].initial_stock = 12
    rid = research.operational_runs(research.save_design(design))[0].id

    async def equal_sharing(output, **kwargs):
        observation = json.loads(kwargs["prompt"])
        controller = observation["you"]["key"] == "alex"
        return output.model_validate(
            dict(
                action=dict(
                    kind="allocate" if controller else "wait",
                    amount=4 if controller else 0,
                    target="food:*" if controller else "",
                    message="",
                    report=None,
                    promise=None,
                ),
                memory="",
                rationale="Scripted equal sharing.",
                forecast=None,
            )
        )

    monkeypatch.setattr(models, "generate", equal_sharing)

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        assistant = Assistants(db, research, models)
        before = assistant._evidence_index({rid: 1})["runs"][0]
        settled = assistant._evidence_index({rid: 4})["runs"][0]
        final = assistant._evidence_index({rid: 8})["runs"][0]
        for row, stock, inventory, consumed, utility in (
            (before, 8, 1, 0, 0),
            (settled, 8, 0, 1, 8),
            (final, 4, 0, 2, 16),
        ):
            accounting = row["resource_accounting"]
            assert accounting["shared_stocks"] == {"food": stock}
            assert accounting["personal_inventory"]["food"] == dict.fromkeys(
                (p.key for p in design.profiles), inventory
            )
            assert accounting["consumed"]["food"] == dict.fromkeys(
                (p.key for p in design.profiles), consumed
            )
            assert sum(accounting["unmet_need"]["food"].values()) == 0
            assert row["outcome"]["total_utility"] == utility
        assert not before["completed_at_cutoff"] and final["completed_at_cutoff"]
        await assistant.close()

    asyncio.run(exercise())


def test_configured_assistant_model_is_used_without_substitution(runtime, monkeypatch):
    db, llm, research, _ = runtime
    monkeypatch.setenv("JAS_ASSISTANT_MODEL", "openai:gpt-6-luna")

    async def generate(output, **kwargs):
        assert kwargs["model"] == "openai:gpt-6-luna"
        return GeneralResponse(
            answer="Select recorded evidence to inspect outcomes.", citations=[], caveats=[]
        )

    monkeypatch.setattr(llm, "generate", generate)

    async def exercise():
        assistant = Assistants(db, research, llm)
        key = assistant.start("How can I inspect behavior?", purpose="general")
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        await assistant.close()

    asyncio.run(exercise())


def test_turn_tool_preserves_observation_and_outcomes_without_duplicating_memory(runtime, design):
    from agent_sim.assistants import TurnRequest

    db, models, research, engine = runtime
    rid = research.operational_runs(research.save_design(design))[0].id

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        assistant = Assistants(db, research, models)
        full = research.evidence(rid, 2)
        _, compact = assistant._requested_evidence(
            TurnRequest(kind="turn", run_id=rid, turn=2), {rid: 2}
        )
        assert compact["observation"] == full["observation"]
        assert compact["events"] == full["events"]
        assert compact["decision"] == full["decision"]
        assert compact["checkpoint"]["balances"] == full["checkpoint"]["balances"]
        assert set(compact["omitted_checkpoint_fields"]) == {"history", "notes", "experiences"}
        assert "experiences" not in compact["checkpoint"]
        assert research.evidence(rid, 2) == full
        await assistant.close()

    asyncio.run(exercise())


def test_private_goal_conditions_share_the_original_protocol_and_matched_effects(runtime, design):
    db, models, research, engine = runtime
    alternate = design.conditions[0].model_copy(deep=True)
    alternate.key, alternate.name = "alternate", "Alternate private goal"
    alternate.profile_overrides = [
        design.profiles[0].model_copy(
            update={"goal": "Earn credits while considering the shared project."}
        )
    ]
    design.conditions.append(alternate)
    design.seeds, design.repetitions = [17, 43, 89], 2
    runs = research.operational_runs(research.save_design(design))

    async def exercise():
        for identity in runs:
            engine.start(identity.id)
        for identity in runs:
            task = engine.executions[identity.id].task
            assert task is not None
            await task
        assistant = Assistants(db, research, models)
        cutoffs = {r.id: research.configuration(r.id)[0].turn for r in runs}
        index = assistant._evidence_index(cutoffs)
        assert len(index["protocols"]) == 1
        effects = next(iter(index["matched_effects"].values()))
        effect = next(e for e in effects if e["metric"] == "contribution_rate")
        assert effect["seeds"] == 3 and effect["pairs"] == 6
        assert effect["mean"] == 0
        await assistant.close()

    asyncio.run(exercise())


def test_index_execution_cost_is_cutoff_scoped_and_excludes_analysis_calls(runtime, design):
    from agent_sim.db import ProviderCall

    db, models, research, engine = runtime
    design.profiles = design.profiles[:2]
    rid = research.operational_runs(research.save_design(design))[0].id

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        with db.session.begin() as session:
            session.add(
                ProviderCall(
                    run_id=rid,
                    purpose="analysis",
                    model="openai:gpt-6-luna",
                    turn=1,
                    reserved=0,
                    charged=999999,
                    status="complete",
                    input_tokens=999,
                    output_tokens=999,
                )
            )
        assistant = Assistants(db, research, models)
        indexed = assistant._evidence_index({rid: 2})["runs"][0]
        assert indexed["execution_usage"] == dict(
            requests=2, input_tokens=200, output_tokens=100, cost_usd=0.00007, partial=False
        )
        assert indexed["experiment_budget_ceiling_usd"] == design.budget_usd
        assert "shared equally" in indexed["rules_at_last_observed_turn"]
        await assistant.close()

    asyncio.run(exercise())


def test_commons_counterfactuals_use_observed_rules_and_enforce_scope(runtime, design):
    from agent_sim.assistants import CommonsPayoffRequest
    from agent_sim.domain import ResourceChange

    db, models, research, engine = runtime
    design.conditions[0].parameters.endowment = 10
    design.conditions[0].parameters.multiplier = 3
    design.conditions[0].parameters.resource_schedule = [ResourceChange(round=2, endowment=6)]
    rid = research.operational_runs(research.save_design(design))[0].id

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        assistant = Assistants(db, research, models)
        request = CommonsPayoffRequest(
            kind="commons_payoffs",
            run_id=rid,
            turn=1,
            scenarios=[
                dict(agents=2, own_contribution=own, other_contribution_per_agent=10)
                for own in (0, 10)
            ],
        )
        _, data = assistant._requested_evidence(request, {rid: 1})
        assert [c["private_payoff"] for c in data["counterfactual_payoffs"]["scenarios"]] == [
            25,
            30,
        ]
        assert data["counterfactual_payoffs"]["hypothetical"]
        assert data["observation"] and data["number"] == 1
        with pytest.raises(ValueError, match="outside"):
            assistant._requested_evidence(request, {rid: 0})
        request.turn = len(design.profiles) + 1
        with pytest.raises(ValueError, match="exceeds observed"):
            assistant._requested_evidence(request, {rid: request.turn})
        request.scenarios[0].own_contribution = 0
        request.scenarios[0].other_contribution_per_agent = 6
        request.scenarios = request.scenarios[:1]
        _, data = assistant._requested_evidence(request, {rid: request.turn})
        assert data["counterfactual_payoffs"]["endowment"] == 6
        assert data["counterfactual_payoffs"]["scenarios"][0]["private_payoff"] == 15
        await assistant.close()

    asyncio.run(exercise())


@pytest.mark.parametrize("environment", ["commons", "coordination"])
def test_investigation_only_exposes_calculations_supported_by_selected_world(
    runtime, monkeypatch, environment
):
    from agent_sim.domain import Design
    from agent_sim.templates import templates
    from pydantic import ValidationError

    db, models, research, _ = runtime
    designs = (Design.model_validate(t["design"]) for t in templates())
    design = next(d for d in designs if d.environment == environment)
    rid = research.operational_runs(research.save_design(design))[0].id
    seen = []

    async def answer(output, **kwargs):
        request = dict(
            kind="commons_payoffs",
            run_id=rid,
            turn=1,
            scenarios=[dict(agents=2, own_contribution=0, other_contribution_per_agent=10)],
        )
        if environment == "commons":
            assert (
                output.model_validate(dict(requests=[request], answer=None)).requests[0].kind
                == "commons_payoffs"
            )
        else:
            with pytest.raises(ValidationError):
                output.model_validate(dict(requests=[request], answer=None))
            assert output.model_validate(
                dict(requests=[dict(kind="turn", run_id=rid, turn=0)], answer=None)
            )
        seen.append(output)
        return output.model_validate(
            dict(
                requests=[],
                answer=dict(
                    answer="No decisions have been observed.",
                    citations=[],
                    caveats=["Cutoff zero."],
                ),
            )
        )

    monkeypatch.setattr(models, "generate", answer)

    async def exercise():
        assistant = Assistants(db, research, models)
        key = assistant.start("Audit available evidence", purpose="analysis", run_id=rid)
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        assert len(seen) == 1
        await assistant.close()

    asyncio.run(exercise())


@pytest.mark.parametrize("route", ["answer", "proposal", "planner-unavailable"])
def test_general_intent_handoff_preserves_chat_scope_and_accounting(
    runtime, design, monkeypatch, route
):
    from agent_sim.db import Analysis, ProviderCall, Workspace
    from agent_sim.llm import ProviderFailure
    from agent_sim.planning import StudyBrief
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import DeltaToolCall, FunctionModel
    from sqlalchemy import select

    db, models, research, _ = runtime
    sid = research.save_design(design)
    question = "Change the previous protocol to study physical-world prediction"
    conversation = [
        {
            "question": "Design an earlier protocol",
            "answer": "",
            "cutoffs": {},
            "proposal": design.model_dump(mode="json"),
            "explanation": "An earlier reviewed proposal.",
        }
    ]
    with db.session.begin() as session:
        session.add_all(
            [
                Analysis(
                    purpose="design",
                    chat_id="intent-chat",
                    question=conversation[0]["question"],
                    status="complete",
                    cutoffs={},
                    output={
                        "design": design.model_dump(mode="json"),
                        "explanation": conversation[0]["explanation"],
                    },
                ),
                Analysis(
                    purpose="analysis",
                    study_id=sid,
                    chat_id="intent-chat",
                    question="Selected private evidence",
                    status="complete",
                    cutoffs={},
                    output={"answer": "Never pass selected evidence to general planning."},
                ),
            ]
        )
    monkeypatch.setenv("JAS_ASSISTANT_MODEL", "openai:gpt-6-luna")
    monkeypatch.setenv("JAS_PLANNER_MODEL", "openai:gpt-6.1-sol")
    planner_calls = []
    assistant = Assistants(db, research, models)

    async def general_stream(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        assert prompt["conversation"] == conversation
        assert prompt["question"] == question
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name,
                json_args=json.dumps(
                    {
                        "answer": "I can help with that.",
                        "citations": [],
                        "caveats": [],
                        "propose_experiment": route != "answer",
                    }
                ),
            )
        }

    def planner_model(_name):
        if _name == "openai:gpt-6-luna":
            return FunctionModel(stream_function=general_stream)
        # The transition is durable before a planner/provider is entered.
        row = assistant.chat("intent-chat")[-1]
        assert row["purpose"] == "design" and row["status"] == "pending"
        assert row["output"]["stage"] == "scoping"
        assert "partial" not in row["output"]
        with pytest.raises(ValueError, match="current request"):
            assistant.send("Duplicate follow-up", "general", "intent-chat")
        if route == "planner-unavailable":
            raise ProviderFailure("Configured planner provider unavailable")
        return FunctionModel(function=plan)

    async def plan(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        assert prompt["conversation"] == conversation
        assert prompt["question"] == question
        planner_calls.append(prompt)
        brief = StudyBrief(
            supported=False,
            explanation="No calibrated population model.",
            operationalization="Unavailable",
            size_rationale="No experiment",
            agents=2,
            conditions=1,
            seeds=1,
            repetitions=1,
            rounds=1,
            research_query=None,
        )
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, brief.model_dump())])

    monkeypatch.setattr(models, "model", planner_model)

    async def exercise():
        result = assistant.send(question, "general", "intent-chat")
        await assistant.tasks[result["id"]]
        row = assistant.get(result["id"])
        assert len(assistant.chat("intent-chat")) == 3
        assert row["study_id"] is None and row["run_id"] is None and row["cutoffs"] == {}
        assert assistant.chats()[0]["context"] == "general"
        if route == "answer":
            assert row["purpose"] == "general" and row["status"] == "complete"
            assert row["output"] == {
                "answer": "I can help with that.",
                "citations": [],
                "caveats": [],
                "examined": [],
                "activity": ["answering", "writing"],
            }
        elif route == "proposal":
            assert row["purpose"] == "design" and row["status"] == "complete"
            assert row["output"]["supported"] is False and row["output"]["design"] is None
        else:
            assert row["purpose"] == "design" and row["status"] == "failed"
            assert row["error"] == "Configured planner provider unavailable"
        assert "partial" not in row["output"]
        with db.session() as session:
            calls = session.scalars(select(ProviderCall)).all()
            assert len(calls) == (2 if route == "proposal" else 1)
            assert all(call.analysis_id == row["id"] for call in calls)
            assert row["usage"]["requests"] == len(calls)
            assert session.get_one(Workspace, 1).charged == sum(call.charged for call in calls)
        assert len(research.studies()) == 1
        assert all(run["status"] == "ready" for run in research.study(sid)["runs"])
        await assistant.close()

    asyncio.run(exercise())
    assert len(planner_calls) == (1 if route == "proposal" else 0)


@pytest.mark.parametrize("failed", [False, True])
def test_public_activity_survives_completion_failure_and_reload(runtime, monkeypatch, failed):
    db, llm, research, _ = runtime

    async def generate(output, **kwargs):
        kwargs["on_partial"]({"answer": "First draft"})
        kwargs["on_partial"]({"answer": "Updated draft"})
        if failed:
            raise ValueError("Provider stopped")
        return GeneralResponse(answer="Validated answer", citations=[], caveats=[])

    monkeypatch.setattr(llm, "generate", generate)

    async def exercise():
        assistant = Assistants(db, research, llm)
        result = assistant.send("Explain matched seeds", "general")
        await assistant.tasks[result["id"]]
        saved = assistant.get(result["id"])
        assert saved["status"] == ("failed" if failed else "complete")
        assert saved["output"]["activity"] == ["answering", "writing"]
        assert "partial" not in saved["output"]
        await assistant.close()
        restored = Assistants(db, research, llm)
        assert restored.get(result["id"])["output"]["activity"] == ["answering", "writing"]
        await restored.close()

    asyncio.run(exercise())
