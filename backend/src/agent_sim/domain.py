from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    ValidationInfo,
    field_validator,
    model_validator,
)

ModelId = Annotated[str, Field(pattern=r"^(openai|anthropic):[a-zA-Z0-9._/-]+$")]
EnvironmentId = Literal[
    "commons",
    "trust_exchange",
    "coordination",
    "institution",
    "bargaining",
    "information",
    "renewable_resource",
    "composed",
    "artifact_workspace",
    "sealed_relay",
    "reviewed_finite",
    "distributed_coordination",
    "reliance_commitments",
    "institutional_workflow",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class AdmissionCheck(Strict):
    stage: str
    status: Literal["passed", "blocked", "failed"]
    detail: str


class ExtensionPackage(Strict):
    format: Literal["jas-sealed-relay-package-v1"] = "jas-sealed-relay-package-v1"
    version: Literal["1.0.0"] = "1.0.0"
    profile: Literal["sealed-relay-v1"] = "sealed-relay-v1"
    name: str = Field(min_length=1, max_length=120)
    provenance: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=65536)
    source_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    wasm_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    profile_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    capabilities: list[str]
    review_id: str
    admission_id: str
    created: str
    containment: dict
    checks: list[AdmissionCheck]
    verification: dict
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class FiniteExtensionPackage(Strict):
    format: Literal["jas-reviewed-finite-package-v1"] = "jas-reviewed-finite-package-v1"
    version: Literal["1.0.0"] = "1.0.0"
    profile: Literal["reviewed-finite-v1"] = "reviewed-finite-v1"
    name: str = Field(min_length=1, max_length=120)
    provenance: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=65536)
    source_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    wasm_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    profile_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    contract: dict
    review_id: str
    artifact_check_id: str
    admission_id: str
    created: str
    containment: dict
    checks: list[AdmissionCheck]
    verification: dict
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


type ExecutablePackage = ExtensionPackage | FiniteExtensionPackage


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


class ResourcePrimitive(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,23}$")
    name: str = Field(min_length=1, max_length=60)
    capacity: int = Field(default=60, ge=1, le=500)
    initial_stock: int = Field(default=24, ge=0, le=500)
    replenishment: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Units added after consumption each nonterminal round, capped by capacity.",
    )
    controllers: list[str] = Field(
        default_factory=list,
        max_length=12,
        description="Empty permits shared extraction; otherwise only controllers allocate.",
    )
    action_limit: int = Field(
        default=12,
        ge=1,
        le=100,
        description="Maximum total units requested in one action, independent of hidden stock.",
    )
    need: int = Field(
        default=1,
        ge=0,
        le=20,
        description="Units automatically consumed per participant at each round end.",
    )
    consumption_value: float = Field(default=2, ge=0, le=20)
    shortfall_penalty: float = Field(default=3, ge=0, le=20)
    terminal_value: float = Field(
        default=1,
        ge=0,
        le=20,
        description="Utility per unit left in personal inventory at the end of the run.",
    )
    stock_visibility: Literal["public", "controllers"] = "public"
    allocation_visibility: Literal["public", "parties"] = "public"
    transfers: bool = True

    @model_validator(mode="after")
    def resource_is_valid(self) -> Self:
        if self.initial_stock > self.capacity:
            raise ValueError("Initial stock cannot exceed capacity")
        if len(set(self.controllers)) != len(self.controllers):
            raise ValueError("Resource controllers must be unique")
        return self


class CompositionRules(Strict):
    resources: list[ResourcePrimitive] = Field(min_length=1, max_length=4)
    controllers_first: bool = Field(
        default=True,
        description="Controllers act before other participants, with seeded order within groups.",
    )

    @model_validator(mode="after")
    def distinct_resources(self) -> Self:
        if len({r.key for r in self.resources}) != len(self.resources):
            raise ValueError("Resource keys must be unique")
        return self


ArtifactKey = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")]
ArtifactContent = Annotated[
    dict[ArtifactKey, Annotated[str, Field(max_length=1000)] | StrictInt],
    Field(min_length=1, max_length=12),
]


class ArtifactObject(Strict):
    key: ArtifactKey
    name: str = Field(min_length=1, max_length=100)
    owner: ArtifactKey | None = None
    readers: list[ArtifactKey] = Field(default_factory=list, max_length=12)
    writers: list[ArtifactKey] = Field(default_factory=list, max_length=12)
    content: ArtifactContent

    @model_validator(mode="after")
    def valid_access(self) -> Self:
        if len(set(self.readers)) != len(self.readers) or len(set(self.writers)) != len(
            self.writers
        ):
            raise ValueError("Artifact access lists must be unique")
        if not set(self.writers) <= set(self.readers) | {self.owner}:
            raise ValueError("Artifact writers must also have read access")
        return self


class ArtifactRequirement(Strict):
    artifact: ArtifactKey
    field: ArtifactKey
    source: ArtifactKey
    source_field: ArtifactKey


class JudgmentEvidence(Strict):
    artifact: ArtifactKey
    version: Literal[1]
    fields: list[ArtifactKey] = Field(min_length=1, max_length=12)


class ArtifactJudgment(Strict):
    mechanism: Literal["pickup_note_actionability"]
    version: Literal["1.0.0"]
    artifact: ArtifactKey
    field: Literal["guidance"]
    evidence: list[JudgmentEvidence] = Field(min_length=1, max_length=1)


class Adjudicator(Strict):
    version: Literal["1.0.0"]
    model: Literal["openai:gpt-6.1-sol"]
    openai_reasoning_effort: Literal["low", "medium", "high"]
    response_tokens: int = Field(ge=512, le=2048)


class JudgmentFact(Strict):
    artifact: ArtifactKey
    version: int = Field(ge=1, le=1201)
    field: ArtifactKey
    value: Annotated[str, Field(max_length=1000)] | StrictInt


class AdjudicationRuling(Strict):
    verdict: Literal["accept", "revise", "abstain"]
    explanation: str = Field(min_length=1, max_length=1000)
    facts: list[JudgmentFact] = Field(min_length=1, max_length=12)


class RecordedAdjudication(Strict):
    mechanism: Literal["pickup_note_actionability"]
    version: Literal["1.0.0"]
    adjudicator: Adjudicator
    inputs: dict
    ruling: AdjudicationRuling
    request_id: str = Field(pattern=r"^[a-f0-9]{16}$")


class ArtifactRules(Strict):
    objects: list[ArtifactObject] = Field(min_length=2, max_length=12)
    requirements: list[ArtifactRequirement] = Field(default_factory=list, max_length=12)
    write_limit: int = Field(default=4, ge=1, le=100)
    judgment: ArtifactJudgment | None = None

    @model_validator(mode="after")
    def valid_requirements(self) -> Self:
        objects = {obj.key: obj for obj in self.objects}
        if len(objects) != len(self.objects):
            raise ValueError("Artifact keys must be unique")
        fields = [(r.artifact, r.field) for r in self.requirements]
        if len(set(fields)) != len(fields):
            raise ValueError("Artifact requirements must use distinct output fields")
        for requirement in self.requirements:
            target, source = objects.get(requirement.artifact), objects.get(requirement.source)
            if target is None or source is None or requirement.source_field not in source.content:
                raise ValueError("Artifact requirements need existing objects and source fields")
            if source.owner is not None or source.writers or not (target.owner or target.writers):
                raise ValueError("Requirements need immutable evidence and writable work")
        if self.judgment:
            judgment = self.judgment
            target = objects.get(judgment.artifact)
            source = objects.get(judgment.evidence[0].artifact)
            fields = judgment.evidence[0].fields
            if (
                target is None
                or not isinstance(target.content.get(judgment.field), str)
                or source is None
                or source.owner is not None
                or source.writers
                or set(fields) != {"desk", "closes_at"}
                or len(fields) != 2
                or not isinstance(source.content.get("desk"), str)
                or type(source.content.get("closes_at")) is not int
                or not all(
                    any(
                        r.artifact == judgment.artifact
                        and r.field == field
                        and r.source == source.key
                        and r.source_field == field
                        for r in self.requirements
                    )
                    for field in fields
                )
            ):
                raise ValueError(
                    "Pickup-note judgment requires writable text and immutable desk/hour "
                    "evidence with independent content/source requirements"
                )
        return self


class RelayRules(Strict):
    submitter: ArtifactKey
    reviewer: ArtifactKey
    docket: str = Field(default="counterseal-17", min_length=1, max_length=120)

    @model_validator(mode="after")
    def distinct_permissions(self) -> Self:
        if self.submitter == self.reviewer:
            raise ValueError("Relay submitter and reviewer must be distinct participants")
        return self


class FiniteRules(Strict):
    bindings: dict[ArtifactKey, ArtifactKey] = Field(min_length=1, max_length=12)
    private: dict[ArtifactKey, dict[ArtifactKey, Annotated[str, Field(max_length=120)]]] = Field(
        default_factory=dict, max_length=12
    )

    @model_validator(mode="after")
    def private_scopes(self) -> Self:
        if (
            len(set(self.bindings.values())) != len(self.bindings)
            or not set(self.private) <= set(self.bindings.values())
            or any(len(fields) > 8 for fields in self.private.values())
        ):
            raise ValueError("Finite roles require distinct actors and bounded actor-private facts")
        return self


class MessageRoute(Strict):
    sender: ArtifactKey
    recipient: ArtifactKey


class DistributedRules(Strict):
    timing: Literal["sequential", "phased_simultaneous"]
    turn_order: list[ArtifactKey] = Field(min_length=3, max_length=4)
    conflict_order: list[ArtifactKey] = Field(min_length=3, max_length=4)
    routes: list[MessageRoute] = Field(max_length=12)
    delivery_delay: int = Field(ge=1, le=12)
    alternatives: list[ArtifactKey] = Field(min_length=2, max_length=6)
    information: dict[ArtifactKey, ArtifactKey] = Field(min_length=3, max_length=4)
    match_bonus: int = Field(ge=0, le=100)


class CommitmentOpportunity(Strict):
    key: ArtifactKey
    promisor: ArtifactKey
    recipient: ArtifactKey
    artifact: ArtifactKey
    alternative: ArtifactKey
    opens_at: int = Field(ge=0, le=1200)
    deadline: int = Field(ge=1, le=1200)
    fulfilled_value: int = Field(ge=-100, le=100)
    unfulfilled_value: int = Field(ge=-100, le=100)


class CommitmentRules(Strict):
    opportunities: list[CommitmentOpportunity] = Field(min_length=1, max_length=12)


class WorkItem(Strict):
    key: ArtifactKey
    artifact: ArtifactKey
    workers: list[ArtifactKey] = Field(min_length=1, max_length=12)
    dependencies: list[ArtifactKey] = Field(default_factory=list, max_length=12)
    handoff_to: list[ArtifactKey] = Field(min_length=1, max_length=12)
    resource_cost: int = Field(ge=1, le=1000)
    duration: int = Field(ge=1, le=1200)


class WorkflowRules(Strict):
    timing: Literal["sequential", "phased_simultaneous"]
    turn_order: list[ArtifactKey] = Field(min_length=6, max_length=12)
    conflict_order: list[ArtifactKey] = Field(min_length=6, max_length=12)
    routes: list[MessageRoute] = Field(max_length=132)
    delivery_delay: int = Field(ge=1, le=12)
    resource_stock: int = Field(ge=0, le=12000)
    work_items: list[WorkItem] = Field(min_length=1, max_length=12)


class MechanicsParameters(Strict):
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
    composition: CompositionRules | None = None
    artifacts: ArtifactRules | None = None
    relay: RelayRules | None = None
    finite: FiniteRules | None = None
    coordination: DistributedRules | None = None
    commitments: CommitmentRules | None = None
    workflow: WorkflowRules | None = None
    resource_schedule: list[ResourceChange] = Field(default_factory=list, max_length=12)


class Parameters(MechanicsParameters):
    memory: Literal["episodic", "notes", "history", "none"] = Field(
        default="episodic",
        description="Episodic: bounded experiences, public history and note; "
        "notes: public history and note; history: public history only; none: neither. "
        "Authoritative current state stays visible.",
    )


ParticipantTool = Literal["observe", "rules", "legal_options", "read_artifact"]


class DirectActionHarness(Strict):
    kind: Literal["direct_action"] = "direct_action"
    version: Literal["1.0.0"] = "1.0.0"
    max_requests: Literal[1] = 1
    max_tool_operations: Literal[0] = 0
    tools: list[ParticipantTool] = Field(default_factory=list, max_length=0)


class ParticipantCapabilities(Strict):
    planning: Literal["actor_plan_v1", "disabled"] = "actor_plan_v1"
    memory: Literal["actor_sources_v1", "disabled"] = "actor_sources_v1"
    investigation: Literal["actor_inspection_v1", "disabled"] = "actor_inspection_v1"
    verification: Literal["legal_evidence_v1", "disabled"] = "legal_evidence_v1"


class ToolUsingHarness(Strict):
    kind: Literal["tool_using"] = "tool_using"
    version: Literal["2.0.0"] = "2.0.0"
    max_requests: int = Field(default=4, ge=1, le=8)
    max_tool_operations: int = Field(default=3, ge=0, le=12)
    tools: list[ParticipantTool] = Field(
        default=["observe", "rules", "legal_options"], max_length=4
    )
    capabilities: ParticipantCapabilities = Field(default_factory=ParticipantCapabilities)
    max_context_chars: int = Field(default=16000, ge=4000, le=32000)
    max_memory_items: int = Field(default=8, ge=1, le=16)

    @model_validator(mode="after")
    def unique_tools(self) -> Self:
        if len(set(self.tools)) != len(self.tools):
            raise ValueError("Participant tools must be unique")
        return self


class ScriptedHarness(Strict):
    """Declared non-model control; configured model assignments are not executed."""

    kind: Literal["scripted"] = "scripted"
    version: Literal["1.0.0"] = "1.0.0"
    policy: Literal["commons_keep_v1", "commons_half_v1", "private_signal_v1"]
    max_requests: Literal[0] = 0
    max_tool_operations: Literal[0] = 0
    tools: list[ParticipantTool] = Field(default_factory=list, max_length=0)


ParticipantHarness = Annotated[
    DirectActionHarness | ToolUsingHarness | ScriptedHarness, Field(discriminator="kind")
]


class Treatment(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=1000)
    model: ModelId = "openai:gpt-6-luna"
    harness: ParticipantHarness = Field(default_factory=DirectActionHarness)
    parameters: Parameters = Field(default_factory=Parameters)
    profile_overrides: list[Profile] = Field(default_factory=list, max_length=12)
    adjudicator: Adjudicator | None = None


class TaskDefinition(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=100)
    dependencies: list[str] = Field(default_factory=list, max_length=29)
    effort: int = Field(default=2, ge=1, le=20)


class EnvironmentConfiguration(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=80)
    roles: list[Annotated[str, Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")]] = Field(
        default_factory=list,
        max_length=12,
        description="Unbound mechanic roles, not participant identities or model assignments.",
    )
    parameters: MechanicsParameters = Field(default_factory=MechanicsParameters)
    tasks: list[TaskDefinition] = Field(default_factory=list, max_length=30)


class EnvironmentMechanics(Strict):
    version: Literal[2] = 2
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=2000)
    environment: EnvironmentId
    rule_version: str = Field(min_length=1, max_length=40)
    examples: list[EnvironmentConfiguration] = Field(min_length=1, max_length=6)
    extension: Annotated[ExecutablePackage, Field(discriminator="profile")] | None = None

    @model_validator(mode="after")
    def unique_examples(self) -> Self:
        if len({example.key for example in self.examples}) != len(self.examples):
            raise ValueError("Environment configuration example keys must be unique")
        return self


class SavedEnvironment(Strict):
    format: Literal["jas-environment-v10"] = "jas-environment-v10"
    id: str
    revision: int = Field(ge=1)
    updated: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    definition: EnvironmentMechanics


class DesignSpec(Strict):
    title: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=4000)
    hypothesis: str = Field(
        default="",
        max_length=2000,
        description="Researcher-facing hypothesis and analysis plan. Define observable outcomes, "
        "recorded fields, calculations and comparisons for event-derived outcomes here. "
        "This text is not sent to participants.",
    )
    environment: EnvironmentId = "commons"
    environment_source: SavedEnvironment | None = None
    context: str = Field(default="", max_length=4000)
    profiles: list[Profile] = Field(min_length=1, max_length=12)
    tasks: list[TaskDefinition] = Field(default_factory=list, max_length=30)
    conditions: list[Treatment] = Field(min_length=1, max_length=6)
    seeds: list[Annotated[int, Field(ge=0, le=2**32 - 1)]] = Field(min_length=1, max_length=20)
    repetitions: int = Field(default=1, ge=1, le=10)
    rounds: int = Field(default=12, ge=1, le=100)
    budget_usd: float = Field(default=3.0, ge=0.05, le=25)
    openai_reasoning_effort: Literal["low", "medium", "high"] | None = None
    response_tokens: int = Field(default=4096, ge=512, le=8192)
    limitations: list[str] = Field(default_factory=list, max_length=12)
    measures: list[str] = Field(
        default_factory=list,
        max_length=12,
        description="Registered metric identifiers only. Additional event-derived calculations "
        "belong in hypothesis, not in this list; they are analysis plans, not engine metrics.",
    )

    @field_validator("profiles")
    @classmethod
    def world_population(cls, profiles: list[Profile], info: ValidationInfo) -> list[Profile]:
        if (
            info.data.get("environment")
            in {"commons", "trust_exchange", "institution", "bargaining"}
            and len(profiles) < 2
        ):
            raise ValueError("This environment requires at least two participants")
        return profiles


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
            finite = condition.parameters.finite
            if self.environment == "reviewed_finite":
                from .finite_profile import validate_package as validate_finite_package

                source = self.environment_source
                if (
                    not source
                    or source.definition.environment != self.environment
                    or not isinstance(source.definition.extension, FiniteExtensionPackage)
                ):
                    raise ValueError(
                        "Finite World requires an independently admitted pinned package"
                    )
                contract = validate_finite_package(source.definition.extension).specification
                if (
                    finite is None
                    or set(finite.bindings) != set(contract.roles)
                    or set(finite.bindings.values()) != {p.key for p in self.profiles}
                ):
                    raise ValueError("Bind each reviewed finite role to one distinct participant")
                defaults = MechanicsParameters().model_dump()
                if self.tasks or any(
                    value != defaults[key]
                    for key, value in condition.parameters.model_dump(
                        exclude={"finite", "memory"}
                    ).items()
                ):
                    raise ValueError(
                        "Finite World does not support rich or inactive extra mechanics"
                    )
            elif finite is not None:
                raise ValueError("Finite mechanics require the reviewed finite environment")
            judgment = (
                condition.parameters.artifacts.judgment
                if condition.parameters.artifacts is not None
                else None
            )
            if (judgment or condition.adjudicator) and self.environment != "artifact_workspace":
                raise ValueError("Declared adjudication requires the artifact workspace")
            if condition.adjudicator and judgment is None:
                raise ValueError("An adjudicator requires an explicit judgment mechanism/scope")
            relay = condition.parameters.relay
            if self.environment == "sealed_relay":
                if (
                    not self.environment_source
                    or self.environment_source.definition.environment != "sealed_relay"
                    or not self.environment_source.definition.extension
                    or relay is None
                    or {relay.submitter, relay.reviewer} != {p.key for p in self.profiles}
                    or len(self.profiles) != 2
                ):
                    raise ValueError(
                        "Sealed relay requires an independently admitted pinned package "
                        "and exactly two explicitly authorized participants"
                    )
                defaults = MechanicsParameters().model_dump()
                if any(
                    value != defaults[key]
                    for key, value in condition.parameters.model_dump(
                        exclude={"relay", "memory"}
                    ).items()
                ):
                    raise ValueError("Sealed relay does not support these extra controls")
            elif relay is not None:
                raise ValueError("Relay mechanics require the sealed relay environment")
            artifacts = condition.parameters.artifacts
            if self.environment in {
                "artifact_workspace",
                "distributed_coordination",
                "reliance_commitments",
                "institutional_workflow",
            }:
                if artifacts is None:
                    raise ValueError("Artifact workspace requires explicit artifact mechanics")
                references = {
                    key
                    for obj in artifacts.objects
                    for key in [*obj.readers, *obj.writers, *([obj.owner] if obj.owner else [])]
                }
                if not references <= {p.key for p in self.profiles}:
                    raise ValueError("Artifact permissions must name existing participants")
                if self.environment == "artifact_workspace" and not artifacts.requirements:
                    raise ValueError("Artifact investigation requires content/source requirements")
            elif artifacts is not None:
                raise ValueError("Artifact mechanics require the artifact workspace")
            if (
                self.environment
                not in {
                    "artifact_workspace",
                    "distributed_coordination",
                    "reliance_commitments",
                    "institutional_workflow",
                }
                and "read_artifact" in condition.harness.tools
            ):
                raise ValueError("Artifact read tools require the artifact workspace")
            coordination = condition.parameters.coordination
            if self.environment in {"distributed_coordination", "reliance_commitments"}:
                ids = {p.key for p in self.profiles}
                count = 4 if self.environment == "reliance_commitments" else 3
                if len(ids) != count or coordination is None or artifacts is None:
                    raise ValueError(
                        f"{self.environment} requires exactly {count} participants and rules"
                    )
                if any(
                    len(order) != count or set(order) != ids
                    for order in (coordination.turn_order, coordination.conflict_order)
                ):
                    raise ValueError(
                        "Turn and conflict orders must each list all participants exactly once"
                    )
                routes = [(route.sender, route.recipient) for route in coordination.routes]
                if len(set(routes)) != len(routes) or any(
                    a not in ids or b not in ids or a == b for a, b in routes
                ):
                    raise ValueError("Message routes must be distinct directed participant pairs")
                if len(set(coordination.alternatives)) != len(coordination.alternatives):
                    raise ValueError("Coordination alternatives must be unique")
                if (
                    set(coordination.information) != ids
                    or len(set(coordination.information.values())) != count
                ):
                    raise ValueError("Each participant requires a distinct value artifact")
                objects = {obj.key: obj for obj in artifacts.objects}
                for actor, key in coordination.information.items():
                    obj = objects.get(key)
                    if (
                        obj is None
                        or obj.owner is not None
                        or obj.writers
                        or actor not in obj.readers
                        or set(obj.content) != set(coordination.alternatives)
                        or any(
                            type(v) is not int or not -100 <= v <= 100 for v in obj.content.values()
                        )
                    ):
                        raise ValueError(
                            "Value artifacts must be immutable, readable local integer values"
                        )
                if artifacts.requirements:
                    raise ValueError(
                        "Coordination uses alternative values, not solo submission requirements"
                    )
            elif coordination is not None:
                raise ValueError("Distributed rules require distributed coordination")
            commitments = condition.parameters.commitments
            if self.environment == "reliance_commitments":
                if commitments is None or artifacts is None or coordination is None:
                    raise ValueError("Reliance requires explicit commitment opportunities")
                if len({o.key for o in commitments.opportunities}) != len(
                    commitments.opportunities
                ):
                    raise ValueError("Commitment opportunity keys must be unique")
                objects = {o.key: o for o in artifacts.objects}
                for opportunity in commitments.opportunities:
                    obj = objects.get(opportunity.artifact)
                    if (
                        opportunity.promisor not in ids
                        or opportunity.recipient not in ids
                        or opportunity.promisor == opportunity.recipient
                        or opportunity.alternative not in coordination.alternatives
                        or obj is None
                        or obj.owner != opportunity.recipient
                        or opportunity.promisor in obj.readers
                        or opportunity.artifact in coordination.information.values()
                    ):
                        raise ValueError(
                            "Commitments require distinct parties, a declared alternative "
                            "and recipient-owned evidence not already readable by the promisor"
                        )
            elif commitments is not None:
                raise ValueError("Commitment rules require reliance_commitments")
            workflow = condition.parameters.workflow
            if self.environment == "institutional_workflow":
                ids = {p.key for p in self.profiles}
                if workflow is None or artifacts is None or not 6 <= len(ids) <= 12:
                    raise ValueError("Institutional workflow requires 6–12 participants and rules")
                for order in (workflow.turn_order, workflow.conflict_order):
                    if len(order) != len(ids) or set(order) != ids:
                        raise ValueError("Workflow orders must list every participant once")
                routes = [(r.sender, r.recipient) for r in workflow.routes]
                if len(routes) != len(set(routes)) or any(
                    a not in ids or b not in ids or a == b for a, b in routes
                ):
                    raise ValueError("Workflow routes require distinct declared participant pairs")
                objects = {o.key: o for o in artifacts.objects}
                work = {w.key: w for w in workflow.work_items}
                if len(work) != len(workflow.work_items) or len(
                    {w.artifact for w in work.values()}
                ) != len(work):
                    raise ValueError("Work keys and work artifacts must be distinct")
                for item in work.values():
                    obj = objects.get(item.artifact)
                    if (
                        obj is None
                        or not set(item.workers) <= ids
                        or not set(item.handoff_to) <= ids
                        or len(item.workers) != len(set(item.workers))
                        or len(item.handoff_to) != len(set(item.handoff_to))
                        or len(item.dependencies) != len(set(item.dependencies))
                        or not set(item.dependencies) <= work.keys()
                        or item.key in item.dependencies
                        or not set(item.workers) <= set(obj.writers) | {obj.owner}
                    ):
                        raise ValueError(
                            "Work requires valid artifacts, permissions and dependencies"
                        )
                remaining = {key: set(item.dependencies) for key, item in work.items()}
                while remaining:
                    ready = {key for key, dependencies in remaining.items() if not dependencies}
                    if not ready:
                        raise ValueError("Workflow dependencies must be acyclic")
                    remaining = {
                        key: dependencies - ready
                        for key, dependencies in remaining.items()
                        if key not in ready
                    }
                if artifacts.requirements:
                    raise ValueError("Workflow uses accepted handoffs, not solo submission checks")
            elif workflow is not None:
                raise ValueError("Workflow mechanics require institutional_workflow")
            if condition.harness.kind == "scripted":
                required_world = (
                    "information" if condition.harness.policy == "private_signal_v1" else "commons"
                )
                if self.environment != required_world:
                    raise ValueError(
                        f"This reference policy requires the {required_world} environment"
                    )
            composition = condition.parameters.composition
            if self.environment == "composed":
                if composition is None:
                    raise ValueError("Composed environments require explicit resource mechanics")
                for resource in composition.resources:
                    if not set(resource.controllers) <= {p.key for p in self.profiles}:
                        raise ValueError("Resource controllers must be existing participants")
            elif composition is not None:
                raise ValueError("Composition mechanics require the composed environment")
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
            raise ValueError("A study supports up to 120 planned runs")
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


class ArtifactReference(Strict):
    artifact: ArtifactKey
    version: int = Field(ge=1, le=1201)


class ReadArtifact(Strict):
    kind: Literal["read_artifact"]
    artifact: ArtifactKey
    version: int | None = Field(default=None, ge=1, le=1201)


class WriteArtifact(Strict):
    kind: Literal["write_artifact"]
    artifact: ArtifactKey
    expected_version: int = Field(ge=1, le=1201)
    content: ArtifactContent
    sources: list[ArtifactReference] = Field(max_length=12)


class CheckArtifacts(Strict):
    kind: Literal["check_artifacts"]


class SubmitArtifacts(Strict):
    kind: Literal["submit_artifacts"]


class StopArtifact(Strict):
    kind: Literal["stop"]


class RelayAction(Strict):
    kind: Literal["relay"] = "relay"
    operation: Literal["lodge", "release", "wait", "stop"]


class FiniteAction(Strict):
    kind: Literal["finite"] = "finite"
    operation: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")


class ChooseAlternative(Strict):
    kind: Literal["choose_alternative"]
    alternative: ArtifactKey


class WaitCoordination(Strict):
    kind: Literal["wait_coordination"]


class SendMessage(Strict):
    kind: Literal["send_message"]
    recipient: ArtifactKey
    text: str = Field(min_length=1, max_length=1000)


class MakeCommitment(Strict):
    kind: Literal["make_commitment"]
    opportunity: ArtifactKey


class RelyOnCommitment(Strict):
    kind: Literal["rely_on_commitment"]
    opportunity: ArtifactKey


class ClaimWork(Strict):
    kind: Literal["claim_work"]
    work: ArtifactKey


class PerformWork(Strict):
    kind: Literal["perform_work"]
    work: ArtifactKey
    expected_version: int = Field(ge=1, le=1201)
    content: ArtifactContent
    sources: list[ArtifactReference] = Field(max_length=12)


class WaitWorkflow(Strict):
    kind: Literal["wait_workflow"]


class HandoffWork(Strict):
    kind: Literal["handoff_work"]
    work: ArtifactKey
    recipient: ArtifactKey
    version: int = Field(ge=1, le=1201)


class AcceptHandoff(Strict):
    kind: Literal["accept_handoff"]
    work: ArtifactKey
    version: int = Field(ge=1, le=1201)


class DelegateWork(Strict):
    kind: Literal["delegate_work"]
    work: ArtifactKey
    recipient: ArtifactKey


ArtifactAction = Annotated[
    ReadArtifact | WriteArtifact | CheckArtifacts | SubmitArtifacts | StopArtifact,
    Field(discriminator="kind"),
]
ActionRequest = (
    Action
    | ArtifactAction
    | RelayAction
    | FiniteAction
    | ChooseAlternative
    | WaitCoordination
    | SendMessage
    | MakeCommitment
    | RelyOnCommitment
    | ClaimWork
    | PerformWork
    | WaitWorkflow
    | HandoffWork
    | AcceptHandoff
    | DelegateWork
)


class Decision(Strict):
    action: ActionRequest
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


class ClaimProposal(Strict):
    kind: Literal["calculation", "annotation", "causal", "intent"]
    text: str = Field(min_length=1, max_length=2000)
    calculation_id: str | None = None
    value: float | None = Field(default=None, allow_inf_nan=False)
    scope: Literal["captured_run", "observed_pairs", "planned_sample"] = "captured_run"
    pairs: int | None = Field(default=None, ge=0)


class Finding(Strict):
    answer: str = Field(min_length=1)
    citations: list[Citation]
    caveats: list[str]
    claims: list[ClaimProposal] = Field(
        default_factory=list,
        max_length=24,
        description="Optional assertions about selected recorded evidence. Omit for general "
        "answers. Calculation assertions reference supplied frozen calculation IDs; "
        "wording and annotations are not automatically certified.",
    )


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
