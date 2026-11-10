import json

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Design
from agent_sim.environment_library import (
    EnvironmentConflict,
    EnvironmentLibrary,
    definition_from_design,
)
from agent_sim.templates import composed_template
from fastapi.testclient import TestClient
from sqlalchemy.exc import NoResultFound


def test_library_update_delete_and_corruption_are_explicit(tmp_path):
    library = EnvironmentLibrary(str(tmp_path / "workspace.sqlite3"))
    original = definition_from_design(composed_template())
    saved = library.save(original)
    assert EnvironmentLibrary(str(tmp_path / "workspace.sqlite3")).get(saved.id) == saved
    updated = library.save(original.model_copy(update={"name": "Changed"}), saved.id, 1)
    assert updated.revision == 2
    assert original.name != "Changed"
    with pytest.raises(EnvironmentConflict):
        library.save(original, saved.id, 1)
    with pytest.raises(EnvironmentConflict):
        library.delete(saved.id, 1)
    path = library.root / f"{saved.id}.json"
    content = json.loads(path.read_text())
    content["definition"]["name"] = "Tampered"
    path.write_text(json.dumps(content))
    with pytest.raises(ValueError, match="content hash"):
        library.get(saved.id)
    path.write_text(updated.model_dump_json())
    content = json.loads(path.read_text())
    assert content["format"] == "jas-environment-v6"
    for unsupported in ["jas-environment-v1", "jas-environment-v2", "jas-environment-v5"]:
        content["format"] = unsupported
        path.write_text(json.dumps(content))
        with pytest.raises(ValueError, match="Unsupported custom environment format"):
            library.get(saved.id)
    path.write_text(updated.model_dump_json())
    library.delete(saved.id, 2)
    assert library.list() == []
    with pytest.raises(NoResultFound):
        library.get(saved.id)
    with pytest.raises(NoResultFound):
        library.delete("../workspace", 1)


def test_environment_lifecycle_preserves_pinned_runs_and_replay(tmp_path, monkeypatch, fake_model):
    app = create_app(f"sqlite:///{tmp_path}/app.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _name: fake_model)
    plan = "Researcher-only plan: compare allocations to others against self-allocation."
    generate = app.state.models.generate

    async def private_plan(output, **kwargs):
        assert plan not in kwargs["prompt"]
        return await generate(output, **kwargs)

    monkeypatch.setattr(app.state.models, "generate", private_plan)
    with TestClient(app, base_url="http://localhost") as client:
        design = composed_template().model_dump()
        design["hypothesis"] = plan
        design["rounds"] = 2
        design["seeds"] = [7]
        definition = definition_from_design(Design.model_validate(design)).model_dump()
        created = client.post("/api/environments", json={"definition": definition})
        assert created.status_code == 201, created.text
        record = created.json()
        key = record["id"]
        pinned = client.post(
            "/api/design/validate", json={"design": design | {"environment_source": record}}
        ).json()
        study_id = client.post("/api/studies", json={"design": pinned}).json()["id"]
        run_id = client.get(f"/api/studies/{study_id}").json()["runs"][0]["id"]
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert client.delete(f"/api/environments/{key}?revision=2").status_code == 409
        changed = Design.model_validate(design)
        changed.title = "Edited custom world"
        composition = changed.conditions[0].parameters.composition
        assert composition is not None
        composition.resources[0].initial_stock = 9
        updated = client.put(
            f"/api/environments/{key}",
            json={"definition": definition_from_design(changed).model_dump(), "revision": 1},
        )
        assert updated.status_code == 200
        assert updated.json()["revision"] == 2
        assert (
            client.put(
                f"/api/environments/{key}", json={"definition": definition, "revision": 1}
            ).status_code
            == 409
        )
        assert client.delete(f"/api/environments/{key}?revision=2").status_code == 200
        assert client.get(f"/api/environments/{key}").status_code == 404
        study = client.get(f"/api/studies/{study_id}").json()
        assert study["design"] == pinned
        assert study["runs"][0]["id"] == run_id
        assert (
            client.post(f"/api/runs/{run_id}/control", json={"action": "step"}).status_code == 200
        )

        async def finish():
            await app.state.engine.executions[run_id].task

        assert client.portal is not None
        client.portal.call(finish)
        assert client.post(f"/api/runs/{run_id}/verify", json={}).json()["verified_turns"] == 1
        exported = client.get(f"/api/studies/{study_id}/export").json()
        assert exported["rule_versions"] == ["1.0.0"]
        assert exported["study"]["design"]["hypothesis"] == plan
        assert client.get(f"/api/studies/{study_id}").json()["design"] == pinned
        assert client.delete("/api/environments/commons?revision=1").status_code == 404
        assert (
            client.post(
                "/api/environments",
                json={"definition": definition},
                headers={"Origin": "https://outside.example"},
            ).status_code
            == 403
        )


def test_planner_receives_saved_mechanics_and_frozen_snapshot(runtime):
    from agent_sim.planning import Planner

    db, models, research, _ = runtime
    record = research.environments.save(definition_from_design(composed_template()))
    context = Planner(db, research, models)._context("Study shortage", [])
    examples = context["custom_environments"]
    assert isinstance(examples, list)
    assert examples[0]["id"] == record.id
    assert examples[0]["definition"] == record.definition.model_dump()
    research.environments.delete(record.id, 1)
    assert examples[0]["definition"] == record.definition.model_dump()
    assert Planner(db, research, models)._context("Study shortage", [])["custom_environments"] == []


def test_custom_environment_can_switch_supported_engine_without_altering_original(tmp_path):
    from agent_sim.templates import commons_template

    library = EnvironmentLibrary(str(tmp_path / "workspace.sqlite3"))
    previous = library.save(definition_from_design(commons_template()))
    changed = library.save(
        definition_from_design(composed_template()), previous.id, previous.revision
    )
    assert (
        changed.definition.rule_version == "1.0.0" and changed.definition.environment == "composed"
    )
    assert (
        previous.definition.rule_version == "4.0.0" and previous.definition.environment == "commons"
    )
