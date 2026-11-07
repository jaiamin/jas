"""In-memory simulation contracts; snapshots retain the versioned JSON envelope."""

from typing import Any, Literal, NotRequired, TypedDict


class LegalAction(TypedDict):
    kind: str
    amount_min: NotRequired[int]
    amount_max: NotRequired[int]
    target: NotRequired[str]
    targets: NotRequired[list[str]]


class ActionPayload(TypedDict):
    kind: str
    amount: int
    target: str
    message: str
    report: int | None
    promise: int | None


class Promise(TypedDict):
    amount: int
    due_round: NotRequired[int]


class TaskState(TypedDict):
    key: str
    name: str
    dependencies: list[str]
    effort: int
    progress: int
    completed_by: str | None


class Sanction(TypedDict):
    actor: str
    target: str
    amount: float
    justified: bool
    resolved: bool
    round: int


class Offer(TypedDict):
    actor: str
    amount: int
    pie: int


class Checkpoint(TypedDict):
    rule_version: str
    round: int
    position: int
    done: bool
    balances: dict[str, float]
    history: list[dict[str, Any]]
    notes: dict[str, str]
    experiences: dict[str, list[dict[str, Any]]]
    signals: dict[str, int]


class CommonsCheckpoint(Checkpoint):
    pending: dict[str, ActionPayload]
    promises: dict[str, Promise]
    forecasts: NotRequired[dict[str, float | None]]


class Relation(TypedDict):
    amount: int
    count: int


class TrustCheckpoint(Checkpoint):
    relations: dict[str, Relation]
    promises: dict[str, Promise]
    escrow: dict[str, int]
    forecasts: NotRequired[dict[str, float | None]]


class CoordinationCheckpoint(Checkpoint):
    tasks: list[TaskState]
    forecasts: NotRequired[dict[str, float | None]]


class InstitutionCheckpoint(Checkpoint):
    sanctions: NotRequired[list[Sanction]]
    last_actions: NotRequired[dict[str, str]]
    shared_output: NotRequired[int]


class BargainingCheckpoint(Checkpoint):
    offer: NotRequired[Offer]


class InformationCheckpoint(Checkpoint):
    pending: dict[str, int]
    unsettled_rewards: NotRequired[dict[str, int]]


class ResourceCheckpoint(Checkpoint):
    pending: dict[str, ActionPayload]
    stock: float


class Observation(TypedDict):
    round: int
    total_rounds: int
    rules: str
    context: str
    participants: list[dict[str, str]]
    your_balance: float
    your_private_signal: int
    public_signals: dict[str, int]
    public_history: list[dict[str, Any]]
    your_experiences: list[dict[str, Any]]
    your_note: str
    communication: bool
    communication_channels: list[Literal["messages", "reports", "promises"]]
    legal_actions: list[LegalAction]
    you: NotRequired[dict[str, Any]]
    partner: NotRequired[str]
    available: NotRequired[int]
    role: NotRequired[str]
    tasks: NotRequired[list[TaskState]]
    authority: NotRequired[bool]
    shared_output: NotRequired[int]
    sanctions: NotRequired[list[Sanction]]
    pie: NotRequired[int]
    offer: NotRequired[Offer | None]
    proposer: NotRequired[str]
    choices: NotRequired[dict[str, int]]
    stock: NotRequired[float]
