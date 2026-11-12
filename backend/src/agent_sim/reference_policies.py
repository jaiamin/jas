"""Concrete non-model controls. Inputs are only an actor projection and legal schema."""

from .domain import Decision
from .simulation.checkpoints import Observation


def reference_decision(
    policy: str, observation: Observation, decision_type: type[Decision]
) -> Decision:
    if policy == "local_value_v1":
        alternatives = observation["coordination"]["alternatives"]
        last = observation.get("last_result") or {}
        content = last.get("content", {})
        if set(content) == set(alternatives) and all(type(v) is int for v in content.values()):
            action = {
                "kind": "choose_alternative",
                "alternative": max(alternatives, key=lambda a: content[a]),
            }
        else:
            readable = next((a for a in observation["artifacts"] if not a["writable"]), None)
            if readable is None:
                raise ValueError("Local-value reference requires a readable immutable table")
            action = {"kind": "read_artifact", "artifact": readable["key"], "version": None}
        return Decision.model_validate(
            decision_type.model_validate(
                {
                    "action": action,
                    "memory": "",
                    "rationale": "Declared first-readable-table local-value control.",
                    "forecast": None,
                }
            )
        )
    if policy == "private_signal_v1":
        kind, amount = "choose", observation["your_private_signal"]
    elif policy in {"commons_keep_v1", "commons_half_v1"}:
        contribution = next(
            (a for a in observation["legal_actions"] if a["kind"] == "contribute"), None
        )
        if contribution is None:
            raise ValueError("Reference policy has no supported legal action")
        kind = "contribute"
        amount = 0 if policy == "commons_keep_v1" else contribution["amount_max"] // 2
    else:
        raise ValueError("Unsupported reference policy")
    return Decision.model_validate(
        decision_type.model_validate(
            {
                "action": {
                    "kind": kind,
                    "amount": amount,
                    "target": "",
                    "message": "",
                    "report": None,
                    "promise": None,
                },
                "memory": "",
                "rationale": f"Declared non-model control: {policy}.",
                "forecast": None,
            }
        )
    )
