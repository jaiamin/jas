"""Explicit registration keeps environment discovery unsurprising."""

from ..sandbox import SandboxSpec

SANDBOXES: dict[str, SandboxSpec] = {}


def get_sandbox(name: str) -> SandboxSpec:
    if "frontier_colony" not in SANDBOXES:
        from .colony import SPEC

        SANDBOXES["frontier_colony"] = SPEC
    try:
        return SANDBOXES[name]
    except KeyError:
        raise ValueError(f"Unknown sandbox {name!r}; available: {', '.join(SANDBOXES)}") from None
