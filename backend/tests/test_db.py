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
        connection.execute(text("UPDATE schema_version SET version=1"))
    first.close()
    migrated = Database(url)
    with migrated.engine.connect() as connection:
        assert connection.execute(text("SELECT version FROM schema_version")).scalar() == 2
        columns = {r[1] for r in connection.execute(text("PRAGMA table_info(provider_calls)"))}
        assert {"turn", "request_payload", "response_payload"} <= columns
    with migrated.session() as session:
        assert session.get_one(Workspace, 1).charged == 123
    migrated.close()
