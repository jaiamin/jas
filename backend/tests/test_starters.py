import asyncio
import json

from agent_sim.domain import Design
from agent_sim.starters import starters

from benchmarks.generate_recordings import record


def test_six_starters_have_reusable_protocols_and_two_work_settings():
    entries = starters()
    assert len(entries) == 6
    assert len({entry["id"] for entry in entries}) == 6
    assert sum(entry["setting"] == "work" for entry in entries) >= 2
    for entry in entries:
        design = Design.model_validate(entry["design"])
        assert len(design.seeds) >= 3
        assert all(condition.harness.kind != "scripted" for condition in design.conditions)


def test_bundled_recordings_use_real_engine_replay_without_model_calls(tmp_path):
    asyncio.run(record(tmp_path))
    for entry in starters():
        result = json.loads((tmp_path / f"{entry['id']}.json").read_text())
        run = result["run"]
        assert result["provenance"] == "scripted"
        assert run["summary"]["status"] == "complete"
        assert run["summary"]["usage"]["requests"] == 0
        assert len(result["evidence"]) == run["summary"]["turn"] + 1
        assert result["verification"]["verified_turns"] == run["summary"]["turn"]
        if entry["id"] == "evidence-report":
            assert run["metrics"]["artifact_success"] == 1
            assert [turn["action"]["kind"] for turn in run["turns"]] == [
                "read_artifact",
                "write_artifact",
                "submit_artifacts",
            ]
        if entry["id"] == "workflow-materials":
            assert any(event["kind"] == "accept_handoff" for event in run["events"])
