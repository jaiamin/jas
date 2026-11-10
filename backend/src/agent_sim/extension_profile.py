"""Installed independent DEVELOPMENT contract. Candidate text cannot change it."""

import hashlib
from pathlib import Path

from .db import digest
from .domain import ExtensionPackage

PROFILE = "sealed-relay-v1"
CAPABILITIES = [
    "finite_sealed_relay_v1",
    "explicit_actor_permissions",
    "reviewer_private_docket",
    "three_action_credits",
    "sequential_logical_time",
    "complete_checkpoint",
    "exact_call_free_replay",
]
OPERATIONS = ("lodge", "release", "wait", "stop")
INPUTS = [*range(128), -1, 128, 2147483647, -2147483648]


def profile_hash() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def expected(value: int) -> int:
    """Frozen finite specification; deliberately independent of guest code."""
    if not 0 <= value < 128:
        return -1
    phase, residue = divmod(value, 32)
    credits, residue = divmod(residue, 8)
    slot, operation = divmod(residue, 4)
    if phase >= 2:
        return -1
    if operation == 0:
        if (phase, slot) != (0, 0):
            return -1
        next_phase, cost = 1, 1
    elif operation == 1:
        if (phase, slot) != (1, 1):
            return -1
        next_phase, cost = 2, 2
    else:
        next_phase, cost = (phase if operation == 2 else 3), 1
    return next_phase * 4 + credits - cost if credits >= cost else -1


def validate_package(package: ExtensionPackage) -> None:
    if (
        package.sha256 != digest(package.model_dump(exclude={"sha256"}))
        or package.source_sha256 != hashlib.sha256(package.source.encode()).hexdigest()
        or package.profile_sha256 != profile_hash()
        or package.capabilities != CAPABILITIES
        or [check.stage for check in package.checks]
        != [
            "containment",
            "action_authorization_consequence",
            "observation",
            "restoration",
            "world_permissions_projection_restoration_replay",
        ]
        or any(check.status != "passed" for check in package.checks)
        or package.containment.get("status") != "qualified"
        or not package.containment.get("validation_enabled")
        or package.verification
        != {
            "inputs_sha256": digest(INPUTS + INPUTS),
            "expected_sha256": digest([expected(value) for value in INPUTS] * 2),
            "observed_sha256": digest([expected(value) for value in INPUTS] * 2),
            "fresh_instances": len(INPUTS) * 2,
            "world_checks_sha256": hashlib.sha256(
                Path(__file__).with_name("extension_checks.py").read_bytes()
            ).hexdigest(),
        }
    ):
        raise ValueError(
            "Invalid or unsupported pinned extension package; independent admission required"
        )
