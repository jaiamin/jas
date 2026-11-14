import copy

import pytest
from agent_sim.public_records import (
    encode_record,
    scan_record,
    validate_record,
    verify_record,
)


def test_public_record_is_selected_version_only_and_independently_replays(publication):
    record, models, research, sid = publication
    before = models.usage()
    design = research.configuration(record["runs"][0]["record"]["summary"]["id"])[1]
    design.title = "Discarded newer draft"
    research.save_design(design, study_id=sid)
    assert record["experiment"]["revision"] == 1
    assert "Discarded newer draft" not in encode_record(record).decode()
    assert "plan_id" not in record["experiment"]
    assert all(result["verified"] for result in verify_record(record))
    assert models.usage() == before


@pytest.mark.parametrize("field", ["checkpoint", "observation", "decision", "state_hash"])
def test_public_replay_detects_tampered_evidence(publication, field):
    record = copy.deepcopy(publication[0])
    record["runs"][0]["evidence"][1][field] = {} if field != "state_hash" else "wrong"
    assert not verify_record(record)[0]["verified"]


def test_record_boundary_rejects_missing_runs_and_wrong_hash(publication):
    record = copy.deepcopy(publication[0])
    record["runs"] = []
    with pytest.raises(ValueError, match="planned"):
        validate_record(record)
    record = copy.deepcopy(publication[0])
    record["experiment"]["sha256"] = "wrong"
    with pytest.raises(ValueError, match="hash"):
        validate_record(record)


@pytest.mark.parametrize("field", ["runs", "comparison", "results", "headline"])
def test_public_display_cannot_disagree_with_recorded_metrics(publication, field):
    record = copy.deepcopy(publication[0])
    if field == "comparison":
        record["experiment"][field]["cells"][0]["metrics"]["contribution_rate"] = 99
    elif field == "runs":
        record["experiment"][field][0]["seed"] = 999
    elif field == "headline":
        record["experiment"][field]["metric"] = "a_more_favorable_metric"
    else:
        record["experiment"][field][0]["mean"] = 99
    with pytest.raises(ValueError, match="differ"):
        validate_record(record)


def test_shared_headline_keeps_an_undefined_declared_outcome(publication):
    from agent_sim.domain import AnalysisPlan, PlannedOutcome
    from agent_sim.public_records import headline_data

    record = copy.deepcopy(publication[0])
    record["experiment"]["design"]["analysis_plan"] = AnalysisPlan(
        outcomes=[
            PlannedOutcome(
                key="manual_assessment",
                calculation="manual",
                manual_reason="Needs independent coding.",
            )
        ]
    ).model_dump()
    headline = headline_data(record)
    assert headline["metric"] == "manual_assessment"
    assert all(not cell["metrics"] for cell in headline["cells"])


def test_scanner_blocks_credentials_paths_reasoning_and_reviews_only_email():
    key = "canary_credential_never_echo_123456"
    value = {"prompt": f"{key} /home/someone/private.txt me@example.org", "thinking": "hidden"}
    hits = scan_record(value, secrets=[key])
    assert {hit["rule"] for hit in hits} == {
        "credential",
        "local_path",
        "email",
        "hidden_reasoning",
    }
    assert key not in str(hits)
    reviews = {hit["fingerprint"]: "Synthetic example address, not a person." for hit in hits}
    reviewed = scan_record(value, secrets=[key], reviews=reviews)
    assert [hit["rule"] for hit in reviewed if hit["resolved"]] == ["email"]


def test_final_serialization_has_no_configured_key(publication, monkeypatch):
    from agent_sim.providers import ProviderConfiguration
    from agent_sim.public_records import PublicationDescription
    from agent_sim.publishing_routes import prepare

    original, models, research, sid = publication
    saved_key = "saved-provider-key-canary-123456"
    environment_key = "environment-provider-key-canary-654321"
    models.registry.set_provider(
        "local",
        ProviderConfiguration(
            kind="compatible", base_url="http://localhost:11434/v1", api_key=saved_key
        ),
    )
    monkeypatch.setenv("OPENAI_API_KEY", environment_key)
    description = PublicationDescription.model_validate(original["description"])
    record, hits = prepare(research, models, sid, 1, description)
    assert not hits
    serialized = encode_record(record).decode()
    assert all(key not in serialized for key in (saved_key, environment_key))
    for key in (saved_key, environment_key):
        description.finding = key
        _, hits = prepare(research, models, sid, 1, description)
        assert any(hit["rule"] == "credential" and not hit["resolved"] for hit in hits)
        assert key not in str(hits)
