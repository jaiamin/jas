import pytest
from agent_sim.db import Analysis, Database, Workspace
from sqlalchemy import select, text


def test_current_schema_reopens_without_changing_usage_or_conversations(tmp_path):
    url = f"sqlite:///{tmp_path}/workspace.sqlite3"
    first = Database(url)
    with first.session.begin() as session:
        session.get_one(Workspace, 1).charged = 123
        row = Analysis(
            question="Saved question",
            purpose="general",
            status="complete",
            output={"answer": "Saved answer"},
        )
        session.add(row)
        session.flush()
        chat_id = row.chat_id
    first.close()
    reopened = Database(url, ceiling=8_000_000)
    with reopened.session() as session:
        workspace = session.get_one(Workspace, 1)
        assert workspace.charged == 123 and workspace.ceiling == 8_000_000
        saved = session.scalars(select(Analysis)).one()
        assert saved.chat_id == chat_id and saved.output == {"answer": "Saved answer"}
    reopened.close()


@pytest.mark.parametrize("version", [1, 2, 3, 4, 5, 99])
def test_incompatible_schema_is_rejected_without_migration(tmp_path, version):
    url = f"sqlite:///{tmp_path}/workspace.sqlite3"
    db = Database(url)
    with db.engine.begin() as connection:
        connection.execute(text("UPDATE schema_version SET version=:version"), {"version": version})
    with pytest.raises(ValueError, match="create a fresh workspace"):
        Database(url)
    with db.engine.connect() as connection:
        assert connection.execute(text("SELECT version FROM schema_version")).scalar() == version
    db.close()
