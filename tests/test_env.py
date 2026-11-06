import os
import sys
from pathlib import Path

import pytest

from agent_sandbox import cli, policies
from agent_sandbox.store import Store


@pytest.mark.parametrize("local_file", [True, False])
def test_cli_uses_local_api_keys_before_inherited_credentials(
    tmp_path, monkeypatch, capsys, local_file
):
    scenario_path = Path("scenarios/frontier.yaml").resolve()
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "inherited-openai-token")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "inherited-anthropic-token")
    if local_file:
        Path(".env").write_text(
            'OPENAI_API_KEY="local-openai-${LITERAL_SUFFIX}"\n'
            "ANTHROPIC_API_KEY=local-anthropic-key\n"
        )
    expected_openai = "local-openai-${LITERAL_SUFFIX}" if local_file else "inherited-openai-token"
    expected_anthropic = "local-anthropic-key" if local_file else "inherited-anthropic-token"
    original_factory = policies.make_model
    seen = []

    def capture_credentials(name):
        seen.append((os.environ["OPENAI_API_KEY"], os.environ["ANTHROPIC_API_KEY"]))
        return original_factory(name)

    monkeypatch.setattr(policies, "make_model", capture_credentials)
    monkeypatch.setattr(
        sys, "argv", ["sandbox", "--db", "test.sqlite3", "run", str(scenario_path), "--steps", "1"]
    )
    cli.main()
    assert seen == [(expected_openai, expected_anthropic)]
    store = Store("test.sqlite3")
    try:
        assert store.frame(store.runs()[0]["id"])["tick"] == 1
        journal = "\n".join(store.db.iterdump())
    finally:
        store.close()
    output = capsys.readouterr()
    for key in (expected_openai, expected_anthropic):
        assert key not in journal + output.out + output.err


def test_blank_local_key_prevents_using_inherited_oauth(tmp_path, monkeypatch, capsys):
    scenario_path = Path("scenarios/frontier.yaml").resolve()
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "inherited-oauth-token")
    Path(".env").write_text("OPENAI_API_KEY=\nANTHROPIC_API_KEY=\n")
    monkeypatch.setattr(sys, "argv", ["sandbox", "--db", "test.sqlite3", "run", str(scenario_path)])

    def forbidden(name):
        raise AssertionError("Missing API keys must fail before constructing a model")

    monkeypatch.setattr(policies, "make_model", forbidden)
    with pytest.raises(SystemExit) as error:
        cli.main()
    assert error.value.code == 1
    assert "OPENAI_API_KEY is missing" in capsys.readouterr().err
    store = Store("test.sqlite3")
    try:
        assert store.runs() == []
    finally:
        store.close()
