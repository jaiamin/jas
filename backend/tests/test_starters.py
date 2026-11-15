import asyncio
import json
from collections import Counter
from copy import deepcopy
from pathlib import Path

from agent_sim.domain import Design
from agent_sim.public_records import verify_run
from agent_sim.starters import starters

from benchmarks.generate_recordings import record


def test_eight_starters_have_reusable_protocols_in_three_work_and_five_game_settings():
    entries = starters()
    assert len(entries) == len({entry["id"] for entry in entries}) == 8
    assert Counter(entry["setting"] for entry in entries) == {"work": 3, "game": 5}
    for entry in entries:
        design = Design.model_validate(entry["design"])
        assert len(design.seeds) >= 3
        assert all(condition.harness.kind != "scripted" for condition in design.conditions)


def test_preparation_example_isolates_duration_with_the_same_resources_and_rules():
    entry = next(entry for entry in starters() if entry["id"] == "workflow-timing")
    fast, slow = entry["design"]["conditions"]
    assert fast["parameters"]["workflow"]["resource_stock"] == 9
    assert fast["parameters"]["workflow"]["work_items"][0]["duration"] == 1
    expected = deepcopy(fast)
    expected.update(key=slow["key"], name=slow["name"])
    expected["parameters"]["workflow"]["work_items"][0]["duration"] = 4
    assert expected == slow


def test_bundled_index_and_recordings_match_current_examples_and_replay():
    directory = Path(__file__).resolve().parents[2] / "frontend/public/recordings"
    assert json.loads((directory / "index.json").read_text()) == starters()
    for entry in starters():
        value = json.loads((directory / f"{entry['id']}.json").read_text())
        assert value["run"]["design"]["title"] == entry["design"]["title"]
        assert value["provenance"] == "scripted"
        assert value["run"]["summary"]["usage"]["requests"] == 0
        assert verify_run({"record": value["run"], "evidence": value["evidence"]})["verified"]


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
