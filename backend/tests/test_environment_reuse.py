"""T03 DEVELOPMENT cases at the approved public workflow API seam."""

import copy
import json
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from agent_sim import environment_library
from agent_sim.api import create_app
from agent_sim.domain import Action, Decision, Design
from agent_sim.simulation.environments import create_world
from agent_sim.templates import commons_template
from fastapi.testclient import TestClient


def mechanics():
    return {
        "version": 1,
        "name": "Allocated finite stock",
        "description": "A controller distributes a private stock with consumption needs.",
        "environment": "composed",
        "rule_version": "1.0.0",
        "examples": [
            {
                "key": "scarce",
                "name": "Scarce stock",
                "roles": ["controller"],
                "parameters": {
                    "composition": {
                        "resources": [
                            {
                                "key": "food",
                                "name": "Food",
                                "capacity": 48,
                                "initial_stock": 16,
                                "controllers": ["controller"],
                                "stock_visibility": "controllers",
                                "allocation_visibility": "parties",
                            }
                        ]
                    }
                },
            }
        ],
    }


def allocate(amount, target):
    return Decision(
        action=Action(
            kind="allocate", amount=amount, target=target, message="", report=None, promise=None
        ),
        rationale="Independent fixed action",
        memory="",
        forecast=None,
    )


def test_environment_record_is_reusable_mechanics_not_an_experiment(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/workspace.sqlite3"), base_url="http://localhost"
    ) as client:
        response = client.post("/api/environments", json={"definition": mechanics()})
        assert response.status_code == 201, response.text
        saved = response.json()
        assert saved["format"] == "jas-environment-v3"
        assert set(saved) == {"format", "id", "revision", "updated", "sha256", "definition"}
        assert saved["definition"]["environment"] == "composed"
        example = saved["definition"]["examples"][0]
        assert example["roles"] == ["controller"]
        assert example["parameters"]["composition"]["resources"][0]["initial_stock"] == 16
        assert not {
            "design",
            "question",
            "profiles",
            "conditions",
            "seeds",
            "repetitions",
            "hypothesis",
            "measures",
            "memory",
            "model",
            "harness",
        }.intersection(saved["definition"] | example | example["parameters"])
        assert client.get(f"/api/environments/{saved['id']}").json() == saved
        assert client.get("/api/environments").json() == [saved]
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_two_questions_and_populations_reuse_pinned_mechanics_without_importing_a_study(
    tmp_path, monkeypatch, fake_model
):
    app = create_app(f"sqlite:///{tmp_path}/workspace.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _name: fake_model)
    with TestClient(app, base_url="http://localhost") as client:
        saved = client.post("/api/environments", json={"definition": mechanics()}).json()
        studies = []
        for question, keys, seeds in [
            ("Who retains scarce stock?", ["alice", "ben"], [11]),
            ("How does group size affect unmet needs?", ["cy", "dee", "eli"], [19, 23]),
        ]:
            design = commons_template().model_dump()
            design.update(
                question=question,
                title=question,
                hypothesis=f"Private analysis: {question}",
                profiles=[
                    {"key": key, "name": key.title(), "goal": "Inspect and decide."} for key in keys
                ],
                seeds=seeds,
                rounds=2,
                conditions=design["conditions"][:1],
            )
            design["conditions"][0]["parameters"]["memory"] = "none"
            applied = client.post(
                "/api/design/use-environment",
                json={
                    "design": design,
                    "source": saved,
                    "example": "scarce",
                    "bindings": {"controller": keys[0]},
                },
            )
            assert applied.status_code == 200, applied.text
            reused = applied.json()
            for field in ("question", "hypothesis", "seeds", "rounds", "repetitions", "profiles"):
                # Profile defaults are normalized by the public design contract.
                if field != "profiles":
                    assert reused[field] == design[field]
            assert [p["key"] for p in reused["profiles"]] == keys
            assert reused["environment_source"] == saved
            assert reused["conditions"][0]["key"] == design["conditions"][0]["key"]
            params = reused["conditions"][0]["parameters"]
            assert params["memory"] == "none"
            assert params["composition"]["resources"][0]["controllers"] == [keys[0]]
            assert params["composition"]["resources"][0]["initial_stock"] == 16
            response = client.post("/api/studies", json={"design": reused})
            assert response.status_code == 201, response.text
            study = client.get(f"/api/studies/{response.json()['id']}").json()
            studies.append(study)
            (tmp_path / f"{keys[0]}-study.json").write_text(json.dumps(study, indent=2))
        changed = copy.deepcopy(saved["definition"])
        changed["examples"][0]["parameters"]["composition"]["resources"][0]["initial_stock"] = 9
        update = client.put(
            f"/api/environments/{saved['id']}", json={"definition": changed, "revision": 1}
        )
        assert update.status_code == 200, update.text
        assert update.json()["revision"] == 2
        assert (
            client.put(
                f"/api/environments/{saved['id']}", json={"definition": changed, "revision": 1}
            ).status_code
            == 409
        )
        assert client.delete(f"/api/environments/{saved['id']}?revision=1").status_code == 409
        assert client.delete(f"/api/environments/{saved['id']}?revision=2").status_code == 200
        for study in studies:
            for run in study["runs"]:
                assert (
                    client.post(
                        f"/api/runs/{run['id']}/control", json={"action": "start"}
                    ).status_code
                    == 200
                )
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    current = client.get(f"/api/runs/{run['id']}").json()
                    if current["summary"]["status"] in {"complete", "failed"}:
                        break
                    time.sleep(0.01)
                assert current["summary"]["status"] == "complete", current
                assert client.post(f"/api/runs/{run['id']}/verify", json={}).json()[
                    "verified_turns"
                ] == 2 * len(study["design"]["profiles"])
            retained = client.get(f"/api/studies/{study['id']}").json()
            assert retained["design"] == study["design"]
            exported = client.get(f"/api/studies/{study['id']}/export").json()
            assert exported["version"] == 7
            assert exported["revisions"][0]["design"]["environment_source"] == saved
            assert exported["rule_versions"] == ["1.0.0"]
            for request in exported["requests"]:
                assert "Private analysis:" not in json.dumps(request["request"])
            (tmp_path / f"{study['id']}-export.json").write_text(json.dumps(exported, indent=2))
        assert client.get("/api/settings").json()["usage"]["requests"] == 16


def test_catalog_and_editor_extract_examples_without_study_commitments(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/workspace.sqlite3"), base_url="http://localhost"
    ) as client:
        design = commons_template().model_dump()
        design["hypothesis"] = "Never import this analysis plan."
        response = client.post("/api/design/environment", json={"design": design})
        assert response.status_code == 200, response.text
        definition = response.json()
        assert definition["name"] == design["title"]
        assert len(definition["examples"]) == 2
        assert {e["name"] for e in definition["examples"]} == {"Configuration 1", "Configuration 2"}
        assert "Never import" not in json.dumps(definition)
        assert all("memory" not in e["parameters"] for e in definition["examples"])
        saved = client.post("/api/environments", json={"definition": definition}).json()
        fresh = client.post(
            "/api/design/use-environment",
            json={
                "source": saved,
                "example": definition["examples"][1]["key"],
            },
        )
        assert fresh.status_code == 200, fresh.text
        reused = fresh.json()
        assert reused["question"] != design["question"]
        assert reused["hypothesis"] == ""
        assert len(reused["profiles"]) == 2
        assert len(reused["conditions"]) == 1
        assert reused["conditions"][0]["parameters"]["communication"] is True
        assert all(p["goal"] == "Inspect the rules and decide." for p in reused["profiles"])
        for entry in client.get("/api/catalog").json()["environments"]:
            assert entry["source"]["definition"]["rule_version"] == entry["rule_version"]
            selected = client.post(
                "/api/design/use-environment",
                json={
                    "source": entry["source"],
                    "example": entry["source"]["definition"]["examples"][0]["key"],
                },
            )
            assert selected.status_code == 200, selected.text
            assert selected.json()["environment_source"] == entry["source"]


@pytest.mark.parametrize(
    "change, message",
    [
        ({"version": 99}, "version"),
        ({"rule_version": "999.0.0"}, "Unsupported environment rule version"),
        ({"question": "Study commitment"}, "Extra inputs"),
    ],
)
def test_unsupported_environment_contracts_are_rejected_without_changing_library(
    tmp_path, change, message
):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/workspace.sqlite3"), base_url="http://localhost"
    ) as client:
        saved = client.post("/api/environments", json={"definition": mechanics()}).json()
        changed = saved["definition"] | change
        response = client.put(
            f"/api/environments/{saved['id']}", json={"definition": changed, "revision": 1}
        )
        assert response.status_code == 422
        assert message in response.text
        assert client.get(f"/api/environments/{saved['id']}").json() == saved
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_explicit_bindings_hashes_and_independent_world_privacy_remain_enforced(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/workspace.sqlite3"), base_url="http://localhost"
    ) as client:
        source = client.post("/api/environments", json={"definition": mechanics()}).json()
        design = commons_template().model_dump()
        design["profiles"] = [
            {"key": key, "name": key, "goal": "Inspect and decide.", "role": "Controller"}
            for key in ["alice", "ben", "cy"]
        ]
        body = {
            "design": design,
            "source": source,
            "example": "scarce",
            "bindings": {"controller": "alice"},
        }
        for bindings in [{}, {"controller": "absent"}, {"extra": "alice"}]:
            response = client.post(
                "/api/design/use-environment", json=body | {"bindings": bindings}
            )
            assert response.status_code == 422
            assert "Bind every mechanic role" in response.text
        tampered = copy.deepcopy(source)
        tampered["definition"]["examples"][0]["parameters"]["composition"]["resources"][0][
            "initial_stock"
        ] = 9
        invalid = client.post("/api/design/use-environment", json=body | {"source": tampered})
        assert invalid.status_code == 422 and "content hash" in invalid.text
        worlds = []
        for stock in [16, 9]:
            definition = mechanics()
            definition["examples"][0]["parameters"]["composition"]["resources"][0][
                "initial_stock"
            ] = stock
            source = client.post("/api/environments", json={"definition": definition}).json()
            response = client.post("/api/design/use-environment", json=body | {"source": source})
            assert response.status_code == 200, response.text
            selected = Design.model_validate(response.json())
            worlds.append(create_world(selected, selected.conditions[0].parameters, 7))
        left, right = worlds
        assert left.observe("cy") == right.observe("cy")
        assert left.observe("cy")["resources"][0]["stock"] is None
        assert (
            left.decision_schema(left.observe("cy")).model_json_schema()
            == right.decision_schema(right.observe("cy")).model_json_schema()
        )
        assert left.observe("alice")["resources"][0]["stock"] == 16
        assert right.observe("alice")["resources"][0]["stock"] == 9
        before = left.snapshot()
        with pytest.raises(ValueError):
            left.step("alice", allocate(99, "food:*"))
        assert left.snapshot() == before
        left.step("alice", allocate(4, "food:ben"))
        observer = left.observe("cy")
        assert observer["resources"][0]["inventories"] == {"cy": 0}
        assert not observer["public_history"] and not observer["your_experiences"]
        actor = left.actor()
        assert actor is not None and actor != "alice"
        before = left.snapshot()
        with pytest.raises(ValueError):
            left.step(actor, allocate(1, "food:*"))
        assert left.snapshot() == before


def test_atomic_library_failure_and_competing_updates_preserve_a_complete_record(
    tmp_path, monkeypatch
):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/workspace.sqlite3"),
        base_url="http://localhost",
        raise_server_exceptions=False,
    ) as client:
        saved = client.post("/api/environments", json={"definition": mechanics()}).json()
        url = f"/api/environments/{saved['id']}"

        def unavailable(_descriptor):
            raise OSError("Controlled T03 storage failure")

        with monkeypatch.context() as failure:
            failure.setattr(environment_library.os, "fsync", unavailable)
            response = client.put(
                url,
                json={"definition": saved["definition"] | {"name": "Not committed"}, "revision": 1},
            )
            assert response.status_code == 500
        assert client.get(url).json() == saved

        def update(name):
            return client.put(
                url, json={"definition": saved["definition"] | {"name": name}, "revision": 1}
            )

        with ThreadPoolExecutor(max_workers=2) as pool:
            attempts = list(pool.map(update, ["First contender", "Second contender"]))
        assert sorted(response.status_code for response in attempts) == [200, 409]
        winner = next(response.json() for response in attempts if response.status_code == 200)
        assert winner["revision"] == 2
        assert winner["definition"]["name"] in {"First contender", "Second contender"}
        assert client.get(url).json() == winner


def test_reusing_mechanics_preserves_each_conditions_participant_harness_and_memory(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/workspace.sqlite3"), base_url="http://localhost"
    ) as client:
        source = client.post("/api/environments", json={"definition": mechanics()}).json()
        design = commons_template().model_dump()
        design["conditions"][0]["harness"] = {"kind": "direct_action", "version": "1.0.0"}
        design["conditions"][1]["harness"] = {
            "kind": "tool_using",
            "version": "2.0.0",
            "max_requests": 2,
            "max_tool_operations": 1,
            "tools": ["rules"],
        }
        design["conditions"][0]["parameters"]["memory"] = "none"
        design["conditions"][1]["parameters"]["memory"] = "notes"
        design["profiles"][0]["model"] = "openai:gpt-6-luna"
        original = client.post("/api/design/validate", json={"design": design}).json()
        response = client.post(
            "/api/design/use-environment",
            json={
                "design": original,
                "source": source,
                "example": "scarce",
                "bindings": {"controller": design["profiles"][0]["key"]},
            },
        )
        assert response.status_code == 200, response.text
        reused = response.json()
        assert reused["profiles"] == original["profiles"]
        for before, after in zip(original["conditions"], reused["conditions"], strict=True):
            assert after["harness"] == before["harness"]
            assert after["model"] == before["model"]
            assert after["parameters"]["memory"] == before["parameters"]["memory"]
        extracted = client.post("/api/design/environment", json={"design": reused})
        assert extracted.status_code == 200, extracted.text
        assert len(extracted.json()["examples"]) == 1
        assert "harness" not in json.dumps(extracted.json())
        assert "openai:" not in json.dumps(extracted.json())
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
