"""User-reviewed finite specifications, independent of generated artifacts."""

from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from .domain import Strict


class FiniteState(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")
    escrow: int = Field(ge=0, le=255, strict=True)
    status: Literal["running", "success", "failure"]


class FiniteOperation(Strict):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")
    roles: list[Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")]] = Field(
        min_length=1, max_length=12
    )


class FiniteContract(Strict):
    format: Literal["jas-finite-contract-v1"]
    name: str = Field(min_length=1, max_length=120)
    provenance: str = Field(min_length=1, max_length=2000)
    requirements: str = Field(min_length=1, max_length=8000)
    roles: list[str] = Field(min_length=1, max_length=12)
    states: list[FiniteState] = Field(min_length=1, max_length=32)
    operations: list[FiniteOperation] = Field(min_length=1, max_length=16)
    initial_state: int = Field(ge=0, le=31, strict=True)
    initial_credits: int = Field(ge=0, le=255, strict=True)
    total_resource: int = Field(ge=1, le=255, strict=True)
    max_credits: int = Field(ge=0, le=255, strict=True)
    table: list[Annotated[int, Field(strict=True)]] = Field(min_length=1, max_length=256)

    @model_validator(mode="after")
    def complete_conservative_domain(self) -> Self:
        width = self.max_credits + 1
        if len(self.table) != len(self.states) * width * len(self.roles) * len(self.operations):
            raise ValueError(
                "An exhaustive external table of at most 256 finite inputs is required"
            )
        for keys in (self.roles, [s.key for s in self.states], [op.key for op in self.operations]):
            if len(keys) != len(set(keys)):
                raise ValueError("Finite contract role, state and operation keys must be unique")
        for operation in self.operations:
            if len(set(operation.roles)) != len(operation.roles) or not set(operation.roles) <= set(
                self.roles
            ):
                raise ValueError("Operation permissions must name distinct declared roles")
        if (
            self.initial_state >= len(self.states)
            or not 0 < self.initial_credits <= self.max_credits
            or self.states[self.initial_state].status != "running"
            or self.initial_credits + self.states[self.initial_state].escrow > self.total_resource
        ):
            raise ValueError("Finite contract requires a valid nonterminal initial resource state")
        for value, output in enumerate(self.table):
            state_credit, residue = divmod(value, len(self.roles) * len(self.operations))
            state, credit = divmod(state_credit, width)
            slot, op = divmod(residue, len(self.operations))
            before = credit + self.states[state].escrow
            if output == -1:
                continue
            if (
                not 0 <= output < len(self.states) * width
                or self.states[state].status != "running"
                or credit == 0
                or before > self.total_resource
                or self.roles[slot] not in self.operations[op].roles
            ):
                raise ValueError("Table accepts an invalid encoding, terminal state or permission")
            next_state, next_credit = divmod(output, width)
            after = next_credit + self.states[next_state].escrow
            if after > before:
                raise ValueError("Table mints resources or refunds already spent units")
        return self


class ReviewedFiniteContract(Strict):
    format: Literal["jas-reviewed-finite-contract-v1"] = "jas-reviewed-finite-contract-v1"
    id: str
    created: str
    specification: FiniteContract
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class FiniteArtifactCheck(Strict):
    format: Literal["jas-finite-artifact-check-v1"] = "jas-finite-artifact-check-v1"
    id: str
    created: str
    contract: ReviewedFiniteContract
    review_id: str
    candidate_sha256: str
    runtime: dict
    code: str
    passed: bool
    runnable: Literal[False] = False
    inputs: list[int]
    expected: list[int]
    observed: list[int]
    wasm_sha256: str | None = None
    detail: str
    sha256: str


def contract_inputs(contract: FiniteContract) -> list[int]:
    return [*range(len(contract.table)), -1, len(contract.table), 2147483647, -2147483648] * 2


def contract_outputs(contract: FiniteContract) -> list[int]:
    return [*contract.table, -1, -1, -1, -1] * 2
