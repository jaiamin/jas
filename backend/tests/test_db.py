from agent_sim.db import Database, Workspace
from sqlalchemy import text


def test_v1_migration_preserves_usage_and_adds_optional_trace_columns(tmp_path):
    url = f"sqlite:///{tmp_path}/migration.sqlite3"
    first = Database(url)
    with first.session.begin() as session:
        session.get_one(Workspace, 1).charged = 123
    with first.engine.begin() as connection:
        for column in ("turn", "request_payload", "response_payload"):
            connection.execute(text(f"ALTER TABLE provider_calls DROP COLUMN {column}"))
        connection.execute(text("DROP INDEX ix_analyses_chat_id"))
        connection.execute(text("ALTER TABLE analyses DROP COLUMN chat_id"))
        connection.execute(text("UPDATE schema_version SET version=1"))
    first.close()
    migrated = Database(url)
    with migrated.engine.connect() as connection:
        assert connection.execute(text("SELECT version FROM schema_version")).scalar() == 3
        columns = {r[1] for r in connection.execute(text("PRAGMA table_info(provider_calls)"))}
        assert {"turn", "request_payload", "response_payload"} <= columns
    with migrated.session() as session:
        assert session.get_one(Workspace, 1).charged == 123
    migrated.close()


def test_v2_migration_preserves_answers_and_groups_legacy_conversations(tmp_path):
    from agent_sim.db import Analysis
    from sqlalchemy import select

    url = f"sqlite:///{tmp_path}/history.sqlite3"
    first = Database(url)
    with first.session.begin() as session:
        session.add_all(
            [
                Analysis(
                    id="first",
                    purpose="general",
                    question="First",
                    status="complete",
                    output={"answer": "Saved answer"},
                    cutoffs={},
                ),
                Analysis(
                    id="followup",
                    purpose="general",
                    question="Follow-up",
                    status="failed",
                    error="Saved error",
                    cutoffs={},
                ),
                Analysis(
                    id="proposal",
                    purpose="design",
                    question="A proposal",
                    status="complete",
                    output={"supported": False},
                    cutoffs={},
                ),
                Analysis(
                    id="another-proposal",
                    purpose="design",
                    question="Another proposal",
                    status="complete",
                    output={"supported": False},
                    cutoffs={},
                ),
            ]
        )
    with first.engine.begin() as connection:
        connection.execute(text("DROP INDEX ix_analyses_chat_id"))
        connection.execute(text("ALTER TABLE analyses DROP COLUMN chat_id"))
        connection.execute(text("UPDATE schema_version SET version=2"))
    first.close()
    migrated = Database(url)
    with migrated.session() as session:
        rows = {row.id: row for row in session.scalars(select(Analysis))}
        assert rows["first"].chat_id == rows["followup"].chat_id
        assert len({row.chat_id for row in rows.values()}) == 3
        assert rows["first"].output == {"answer": "Saved answer"}
        assert rows["followup"].error == "Saved error"
        identities = {key: row.chat_id for key, row in rows.items()}
    migrated.close()
    reopened = Database(url)
    with reopened.session() as session:
        assert {row.id: row.chat_id for row in session.scalars(select(Analysis))} == identities
    reopened.close()
