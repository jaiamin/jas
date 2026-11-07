from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

ModelId = Annotated[str, Field(pattern=r"^(openai|anthropic):[a-zA-Z0-9._/-]+$")]
EnvironmentId = Literal[
    "commons",
    "trust_exchange",
    "coordination",
    "institution",
    "bargaining",
    "information",
    "renewable_resource",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Profile(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=60)
    goal: str = Field(min_length=1, max_length=2000)
    role: str = Field(default="Participant", max_length=80)
    model: ModelId | None = None


class ResourceChange(Strict):
    round: int = Field(ge=2, le=100)
    endowment: int = Field(ge=2, le=100)


class InstitutionRules(Strict):
    authorities: list[str] = Field(default_factory=list, max_length=12)
    oversight: float = Field(default=0.5, ge=0, le=1)
    sanction_cap: int = Field(default=3, ge=0, le=20)
    transparent: bool = True
    appeal: bool = True


class BargainingRules(Strict):
    discount: float = Field(
        default=0.9, ge=0.1, le=1, description="Fraction of the pie retained each round."
    )
    outside_option: int = Field(
        default=1,
        ge=0,
        le=50,
        description="Credits paid to each negotiator on exit or no agreement.",
    )


class InformationRules(Strict):
    accuracy: float = Field(default=0.75, ge=0.5, le=1)
    correct_reward: int = Field(default=10, ge=1, le=100)
    reveal_outcome: bool = True


class ResourceRules(Strict):
    capacity: int = Field(default=60, ge=2, le=500)
    initial_stock: int | None = Field(
        default=None, ge=1, le=500, description="Starting stock; null starts at carrying capacity."
    )
    regeneration: float = Field(default=0.25, ge=0, le=1)
    extraction_limit: int = Field(default=10, ge=1, le=100)

    @model_validator(mode="after")
    def stock_fits_capacity(self) -> Self:
        if self.initial_stock is not None and self.initial_stock > self.capacity:
            raise ValueError("Initial resource stock cannot exceed carrying capacity")
        return self


class Parameters(Strict):
    endowment: int = Field(
        default=10,
        ge=2,
        le=100,
        description="Fresh credits per round in commons/trust; allocation budget in institutions; "
        "INITIAL divisible pie in bargaining. Changing it changes bargaining surplus.",
    )
    multiplier: float = Field(
        default=2.0,
        ge=1,
        le=5,
        description="Shared-fund return in commons; multiplier on sent credits in trust exchange.",
    )
    communication: bool = Field(
        default=True, description="Enables messages, factual reports and supported promises."
    )
    communication_channels: list[Literal["messages", "reports", "promises"]] = Field(
        default=["messages", "reports", "promises"],
        max_length=3,
        description="Independently enabled channels when communication=true. "
        "Remove only messages to isolate messaging while keeping reports/promises available.",
    )
    memory: Literal["episodic", "notes", "history", "none"] = Field(
        default="episodic",
        description="Episodic: bounded experiences, public history and note; "
        "notes: public history and note; history: public history only; none: neither. "
        "Authoritative current state stays visible.",
    )
    private_signal: bool = Field(
        default=True,
        description="True: each agent sees only its own signal. "
        "False: public_signals exposes every participant's signal to everyone.",
    )
    task_count: int = Field(
        default=8,
        ge=3,
        le=30,
        description="Generated coordination task count; ignored when design.tasks is supplied.",
    )
    institution: InstitutionRules = Field(default_factory=InstitutionRules)
    bargaining: BargainingRules = Field(default_factory=BargainingRules)
    information: InformationRules = Field(default_factory=InformationRules)
    resource: ResourceRules = Field(default_factory=ResourceRules)
    resource_schedule: list[ResourceChange] = Field(default_factory=list, max_length=12)


class Treatment(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=1000)
    model: ModelId = "openai:gpt-6-luna"
    parameters: Parameters = Field(default_factory=Parameters)
    profile_overrides: list[Profile] = Field(default_factory=list, max_length=12)


class TaskDefinition(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=100)
    dependencies: list[str] = Field(default_factory=list, max_length=29)
    effort: int = Field(default=2, ge=1, le=20)


class DesignSpec(Strict):
    title: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=4000)
    hypothesis: str = Field(default="", max_length=2000)
    environment: EnvironmentId = "commons"
    context: str = Field(default="", max_length=4000)
    profiles: list[Profile] = Field(min_length=2, max_length=12)
    tasks: list[TaskDefinition] = Field(default_factory=list, max_length=30)
    conditions: list[Treatment] = Field(min_length=1, max_length=6)
    seeds: list[Annotated[int, Field(ge=0, le=2**32 - 1)]] = Field(min_length=1, max_length=20)
    repetitions: int = Field(default=1, ge=1, le=10)
    rounds: int = Field(default=12, ge=1, le=100)
    budget_usd: float = Field(default=3.0, ge=0.05, le=25)
    openai_reasoning_effort: Literal["low", "medium", "high"] | None = None
    response_tokens: int = Field(default=4096, ge=512, le=8192)
    limitations: list[str] = Field(default_factory=list, max_length=12)
    measures: list[str] = Field(default_factory=list, max_length=12)


class Design(DesignSpec):
    @model_validator(mode="after")
    def matrix_is_valid(self) -> Self:
        for values, label in [
            ([p.key for p in self.profiles], "Agent"),
            ([c.key for c in self.conditions], "Condition"),
            (self.seeds, "Seed"),
        ]:
            if len(set(values)) != len(values):
                raise ValueError(f"{label} identifiers must be unique")
        for condition in self.conditions:
            rounds = [change.round for change in condition.parameters.resource_schedule]
            if rounds and self.environment not in {"commons", "trust_exchange"}:
                raise ValueError("Resource changes require commons or trust exchange")
            if len(rounds) != len(set(rounds)) or any(r > self.rounds for r in rounds):
                raise ValueError("Resource changes need unique rounds within the run")
            authorities = condition.parameters.institution.authorities
            if self.environment == "institution" and (
                not authorities
                or len(authorities) != len(set(authorities))
                or not set(authorities) < {p.key for p in self.profiles}
            ):
                raise ValueError(
                    "Institutions require unique existing authorities and participants"
                )
            if self.environment == "bargaining" and (
                condition.parameters.bargaining.outside_option * 2 > condition.parameters.endowment
            ):
                raise ValueError("Bargaining outside options cannot exceed the initial pie")
            keys = [p.key for p in condition.profile_overrides]
            if len(set(keys)) != len(keys) or not set(keys) <= {p.key for p in self.profiles}:
                raise ValueError("Profile overrides must use unique existing agent keys")
        if self.tasks:
            if self.environment != "coordination":
                raise ValueError("Custom tasks require the coordination environment")
            keys = {t.key for t in self.tasks}
            if len(keys) != len(self.tasks):
                raise ValueError("Task identifiers must be unique")
            resolved: set[str] = set()
            for _ in self.tasks:
                resolved.update(t.key for t in self.tasks if set(t.dependencies) <= resolved)
            if resolved != keys:
                raise ValueError("Task dependencies must exist and form an acyclic graph")
        if len(self.conditions) * len(self.seeds) * self.repetitions > 120:
            raise ValueError("A study supports up to 120 independent runs")
        if self.environment == "trust_exchange" and len(self.profiles) % 2:
            raise ValueError("Trust exchange requires an even number of agents")
        if self.environment == "bargaining" and len(self.profiles) != 2:
            raise ValueError("Bargaining requires exactly two agents")
        return self

    def resolve(self, condition: Treatment) -> Self:
        overrides = {p.key: p for p in condition.profile_overrides}
        return self.model_copy(
            update={"profiles": [overrides.get(p.key, p) for p in self.profiles]}
        )

    @property
    def run_count(self) -> int:
        return len(self.conditions) * len(self.seeds) * self.repetitions

    @property
    def turn_count(self) -> int:
        return self.rounds * len(self.profiles)


class Action(Strict):
    kind: Literal[
        "contribute",
        "send",
        "return",
        "work",
        "wait",
        "allocate",
        "sanction",
        "appeal",
        "offer",
        "accept",
        "reject",
        "exit",
        "choose",
        "extract",
    ]
    amount: int = Field(ge=0, le=500)
    target: str = Field(max_length=80)
    message: str = Field(max_length=1000)
    report: int | None = Field(ge=0, le=100)
    promise: int | None = Field(ge=0, le=100)


class Decision(Strict):
    action: Action
    rationale: str = Field(max_length=1000)
    memory: str = Field(max_length=2000)
    forecast: float | None = Field(ge=0, le=1)


class Event(Strict):
    kind: str
    actor: str | None = None
    target: str | None = None
    visibility: Literal["public", "private", "researcher"] = "public"
    text: str
    data: dict = Field(default_factory=dict)


class Measure(Strict):
    key: str
    value: float | None
    denominator: float | None = None
    agent: str | None = None


class Citation(Strict):
    run_id: str
    turn: int = Field(ge=0)


class Finding(Strict):
    answer: str = Field(min_length=1)
    citations: list[Citation]
    caveats: list[str]


class PlannedStudy(Strict):
    supported: bool
    explanation: str
    design: Design | None

    @model_validator(mode="after")
    def supported_has_design(self) -> Self:
        if self.supported != (self.design is not None):
            raise ValueError(
                "Supported questions require a design; unsupported ones must not invent one"
            )
        return self
