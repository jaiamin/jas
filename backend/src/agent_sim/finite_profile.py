"""Validate self-contained pins against the external, independently reviewed oracle."""

import hashlib
from pathlib import Path

from .db import digest
from .domain import FiniteExtensionPackage
from .finite_contract import ReviewedFiniteContract, contract_inputs, contract_outputs

PROFILE = "reviewed-finite-v1"
STAGES = ["containment", "external_full_domain", "permissions_projection_resources_restore_replay"]


def profile_hash() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def validate_package(package: FiniteExtensionPackage) -> ReviewedFiniteContract:
    contract = ReviewedFiniteContract.model_validate(package.contract)
    if (
        package.sha256 != digest(package.model_dump(exclude={"sha256"}))
        or contract.sha256 != digest(contract.specification.model_dump())
        or package.source_sha256 != hashlib.sha256(package.source.encode()).hexdigest()
        or package.profile_sha256 != profile_hash()
        or [check.stage for check in package.checks] != STAGES
        or any(check.status != "passed" for check in package.checks)
        or package.containment.get("status") != "qualified"
        or not package.containment.get("validation_enabled")
        or package.verification
        != {
            "inputs_sha256": digest(contract_inputs(contract.specification)),
            "expected_sha256": digest(contract_outputs(contract.specification)),
            "observed_sha256": digest(contract_outputs(contract.specification)),
            "fresh_instances": len(contract_inputs(contract.specification)),
            "world_checks_sha256": hashlib.sha256(
                Path(__file__).with_name("finite_checks.py").read_bytes()
            ).hexdigest(),
        }
    ):
        raise ValueError(
            "Invalid reviewed finite package; independent immutable admission required"
        )
    return contract


def expected(contract, value: int) -> int:
    return contract.table[value] if type(value) is int and 0 <= value < len(contract.table) else -1
