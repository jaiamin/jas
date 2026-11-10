import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import JSON, ForeignKey, Index, UniqueConstraint, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def uid() -> str:
    return uuid4().hex[:16]


def now() -> str:
    return datetime.now(UTC).isoformat()


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "workspace"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    charged: Mapped[int] = mapped_column(default=0)
    ceiling: Mapped[int]


class Study(Base):
    __tablename__ = "studies"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    created: Mapped[str] = mapped_column(default=now)
    title: Mapped[str]
    question: Mapped[str]
    revision: Mapped[int] = mapped_column(default=1)
    charged: Mapped[int] = mapped_column(default=0)
    ceiling: Mapped[int]


class Revision(Base):
    __tablename__ = "revisions"
    __table_args__ = (UniqueConstraint("study_id", "number"),)
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    study_id: Mapped[str] = mapped_column(ForeignKey("studies.id"), index=True)
    number: Mapped[int]
    created: Mapped[str] = mapped_column(default=now)
    design: Mapped[dict] = mapped_column(JSON)
    sha256: Mapped[str]
    source: Mapped[str]


class Condition(Base):
    __tablename__ = "conditions"
    __table_args__ = (UniqueConstraint("revision_id", "key"),)
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    revision_id: Mapped[str] = mapped_column(ForeignKey("revisions.id"), index=True)
    key: Mapped[str]
    name: Mapped[str]
    specification: Mapped[dict] = mapped_column(JSON)


class Run(Base):
    __tablename__ = "runs"
    __table_args__ = (UniqueConstraint("condition_id", "seed", "repetition"),)
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    study_id: Mapped[str] = mapped_column(ForeignKey("studies.id"), index=True)
    condition_id: Mapped[str] = mapped_column(ForeignKey("conditions.id"), index=True)
    seed: Mapped[int]
    repetition: Mapped[int]
    status: Mapped[str] = mapped_column(default="ready", index=True)
    created: Mapped[str] = mapped_column(default=now)
    updated: Mapped[str] = mapped_column(default=now)
    turn: Mapped[int] = mapped_column(default=0)
    round: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None]
    checkpoint: Mapped[dict] = mapped_column(JSON)


class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = (UniqueConstraint("run_id", "key"),)
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    key: Mapped[str]
    profile: Mapped[dict] = mapped_column(JSON)
    model: Mapped[str]


class Turn(Base):
    __tablename__ = "turns"
    __table_args__ = (UniqueConstraint("run_id", "number"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    number: Mapped[int]
    round: Mapped[int]
    actor: Mapped[str]
    created: Mapped[str] = mapped_column(default=now)
    observation: Mapped[dict] = mapped_column(JSON)
    decision: Mapped[dict] = mapped_column(JSON)
    checkpoint: Mapped[dict] = mapped_column(JSON)
    state_hash: Mapped[str]
    latency_ms: Mapped[int]


class RecordedEvent(Base):
    __tablename__ = "events"
    __table_args__ = (Index("ix_event_run_turn", "run_id", "turn"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    turn: Mapped[int]
    round: Mapped[int]
    kind: Mapped[str] = mapped_column(index=True)
    actor: Mapped[str | None]
    target: Mapped[str | None]
    visibility: Mapped[str]
    text: Mapped[str]
    data: Mapped[dict] = mapped_column(JSON)


class Measurement(Base):
    __tablename__ = "measurements"
    __table_args__ = (Index("ix_measurement_run_key", "run_id", "key", "turn"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    turn: Mapped[int]
    round: Mapped[int]
    key: Mapped[str]
    value: Mapped[float | None]
    denominator: Mapped[float | None]
    agent: Mapped[str | None]
    version: Mapped[int] = mapped_column(default=1)


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    chat_id: Mapped[str] = mapped_column(default=uid, index=True)
    study_id: Mapped[str | None] = mapped_column(ForeignKey("studies.id"), index=True)
    run_id: Mapped[str | None] = mapped_column(ForeignKey("runs.id"), index=True)
    purpose: Mapped[str]
    question: Mapped[str]
    created: Mapped[str] = mapped_column(default=now)
    status: Mapped[str] = mapped_column(default="pending")
    cutoffs: Mapped[dict] = mapped_column(JSON, default=dict)
    output: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None]


class Annotation(Base):
    __tablename__ = "annotations"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    turn: Mapped[int]
    created: Mapped[str] = mapped_column(default=now)
    label: Mapped[str]
    note: Mapped[str]


class ProviderCall(Base):
    __tablename__ = "provider_calls"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    study_id: Mapped[str | None] = mapped_column(ForeignKey("studies.id"), index=True)
    run_id: Mapped[str | None] = mapped_column(ForeignKey("runs.id"), index=True)
    analysis_id: Mapped[str | None] = mapped_column(ForeignKey("analyses.id"), index=True)
    activation_id: Mapped[str | None] = mapped_column(
        ForeignKey("participant_activations.id"), index=True
    )
    purpose: Mapped[str]
    model: Mapped[str]
    created: Mapped[str] = mapped_column(default=now)
    status: Mapped[str] = mapped_column(default="pending")
    turn: Mapped[int | None]
    request_payload: Mapped[dict | None] = mapped_column(JSON)
    response_payload: Mapped[list | None] = mapped_column(JSON)
    reserved: Mapped[int]
    charged: Mapped[int]
    input_tokens: Mapped[int] = mapped_column(default=0)
    output_tokens: Mapped[int] = mapped_column(default=0)
    reasoning_tokens: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None]


class ParticipantActivation(Base):
    __tablename__ = "participant_activations"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    turn: Mapped[int]
    round: Mapped[int]
    actor: Mapped[str]
    created: Mapped[str] = mapped_column(default=now)
    updated: Mapped[str] = mapped_column(default=now)
    status: Mapped[str] = mapped_column(default="running")
    stop_reason: Mapped[str | None]
    error: Mapped[str | None]
    checkpoint_hash: Mapped[str]
    observation: Mapped[dict] = mapped_column(JSON)
    identity: Mapped[dict] = mapped_column(JSON)
    requests: Mapped[int] = mapped_column(default=0)


class ParticipantOperation(Base):
    __tablename__ = "participant_operations"
    __table_args__ = (UniqueConstraint("activation_id", "number"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    activation_id: Mapped[str] = mapped_column(ForeignKey("participant_activations.id"), index=True)
    number: Mapped[int]
    created: Mapped[str] = mapped_column(default=now)
    kind: Mapped[str]
    status: Mapped[str]
    request: Mapped[dict] = mapped_column(JSON)
    result: Mapped[object] = mapped_column(JSON)


class Database:
    def __init__(self, url: str, ceiling: int = 25_000_000):
        if url.startswith("sqlite:///") and not url.endswith(":memory:"):
            Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
        self.engine = create_engine(
            url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {}
        )
        if url.startswith("sqlite"):

            @event.listens_for(self.engine, "connect")
            def configure(connection, _record):
                connection.execute("PRAGMA foreign_keys=ON")
                connection.execute("PRAGMA journal_mode=WAL")
                connection.execute("PRAGMA busy_timeout=5000")

        self.session = sessionmaker(self.engine, expire_on_commit=False)
        self.initialize(ceiling)

    def initialize(self, ceiling: int) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)")
            )
            version = connection.execute(text("SELECT version FROM schema_version")).scalar()
            if version not in (None, 8):
                raise ValueError(
                    f"Unsupported database schema version: {version}; create a fresh workspace"
                )
            if version is None:
                Base.metadata.create_all(connection)
                connection.execute(text("INSERT INTO schema_version VALUES (8)"))
        with self.session.begin() as session:
            workspace = session.get(Workspace, 1)
            if workspace is None:
                session.add(Workspace(id=1, ceiling=ceiling))
            else:
                workspace.ceiling = ceiling

    def close(self) -> None:
        self.engine.dispose()
