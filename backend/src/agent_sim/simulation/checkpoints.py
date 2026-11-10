"""In-memory simulation contracts; snapshots contain each world's current state."""

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
    balances: NotRequired[dict[str, float]]
    history: list[dict[str, Any]]
    notes: dict[str, str]
    experiences: dict[str, list[dict[str, Any]]]
    signals: NotRequired[dict[str, int]]


class ArtifactCheckpoint(Checkpoint):
    artifacts: dict[str, dict[str, Any]]
    writes_remaining: int
    last_results: dict[str, dict[str, Any]]
    artifact_history: list[dict[str, Any]]
    outcome: dict[str, Any] | None


class DistributedCheckpoint(ArtifactCheckpoint):
    logical_time: int
    phase_actors: list[str]
    pending_actions: dict[str, dict[str, Any]]
    choices: dict[str, str | None]
    pending_deliveries: list[dict[str, Any]]
    inboxes: dict[str, list[dict[str, Any]]]
    outboxes: dict[str, list[dict[str, Any]]]
    message_sequences: dict[str, int]
    proposal_count: int
    pending_reads: dict[str, dict[str, Any]]


class RelianceCheckpoint(DistributedCheckpoint):
    commitments: dict[str, dict[str, Any]]
    choice_times: dict[str, int]
    read_grants: dict[str, list[str]]
    reliance_effects: dict[str, int]
    commitment_history: list[dict[str, Any]]
    withdrawn: list[str]


class WorkflowCheckpoint(ArtifactCheckpoint):
    logical_time: int
    phase_actors: list[str]
    pending_actions: dict[str, dict[str, Any]]
    pending_reads: dict[str, dict[str, Any]]
    withdrawn: list[str]
    resource_stock: int
    resource_spent: int
    work: dict[str, dict[str, Any]]
    work_history: list[dict[str, Any]]
    read_grants: dict[str, list[str]]
    pending_deliveries: list[dict[str, Any]]
    inboxes: dict[str, list[dict[str, Any]]]
    outboxes: dict[str, list[dict[str, Any]]]
    message_sequences: dict[str, int]


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


class ComposedCheckpoint(Checkpoint):
    stocks: dict[str, float]
    inventories: dict[str, dict[str, float]]
    consumed: dict[str, dict[str, float]]
    unmet: dict[str, dict[str, float]]


class Observation(TypedDict):
    round: int
    total_rounds: int
    rules: str
    context: str
    participants: list[dict[str, str]]
    your_balance: NotRequired[float]
    your_private_signal: NotRequired[int]
    public_signals: NotRequired[dict[str, int]]
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
    sanction_visibility: NotRequired[Literal["public", "parties"]]
    shared_output: NotRequired[int]
    sanctions: NotRequired[list[Sanction]]
    pie: NotRequired[int]
    offer: NotRequired[Offer | None]
    proposer: NotRequired[str]
    choices: NotRequired[dict[str, int] | dict[str, str | None]]
    stock: NotRequired[float]
    resources: NotRequired[list[dict[str, Any]]]
    artifacts: NotRequired[list[dict[str, Any]]]
    artifact_requirements: NotRequired[list[dict[str, Any]]]
    writes_remaining: NotRequired[int]
    last_result: NotRequired[dict[str, Any] | None]
    artifact_history: NotRequired[list[dict[str, Any]]]
    relay: NotRequired[dict[str, Any]]
    finite: NotRequired[dict[str, Any]]
    private_information: NotRequired[dict[str, str]]
    logical_time: NotRequired[int]
    coordination: NotRequired[dict[str, Any]]
    inbox: NotRequired[list[dict[str, Any]]]
    outbox: NotRequired[list[dict[str, Any]]]
    commitment_opportunities: NotRequired[list[dict[str, Any]]]
    reliance_effect: NotRequired[int]
    commitment_history: NotRequired[list[dict[str, Any]]]
    withdrawn: NotRequired[list[str]]
    workflow: NotRequired[dict[str, Any]]
