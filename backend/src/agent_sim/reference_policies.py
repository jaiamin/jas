"""Concrete non-model controls. Inputs are only an actor projection and legal schema."""

from .domain import Decision
from .simulation.checkpoints import Observation


def reference_decision(
    policy: str, observation: Observation, decision_type: type[Decision]
) -> Decision:
    if policy in {"artifact_copy_v1", "workflow_ordered_v1"}:
        action = (
            artifact_copy(observation)
            if policy == "artifact_copy_v1"
            else workflow_ordered(observation)
        )
        return Decision.model_validate(
            decision_type.model_validate(
                {
                    "action": action,
                    "memory": "",
                    "forecast": None,
                    "rationale": f"Declared non-model control: {policy}.",
                }
            )
        )
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
    elif policy in {"trust_half_v1", "resource_half_v1"}:
        legal = next(
            a for a in observation["legal_actions"] if a["kind"] in {"send", "return", "extract"}
        )
        kind, amount = legal["kind"], legal["amount_max"] // 2
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


def artifact_copy(observation: Observation) -> dict:
    """Copy one declared required field after reading its authorized evidence."""
    requirements = observation.get("artifact_requirements", [])
    if len(requirements) != 1:
        raise ValueError("Artifact-copy control requires one observable requirement")
    requirement = requirements[0]
    work = next(a for a in observation["artifacts"] if a["key"] == requirement["artifact"])
    if work["version"] > 1:
        return {"kind": "submit_artifacts"}
    result = observation.get("last_result") or {}
    if result.get("artifact") != requirement["source"] or "content" not in result:
        return {"kind": "read_artifact", "artifact": requirement["source"], "version": 1}
    return {
        "kind": "write_artifact",
        "artifact": requirement["artifact"],
        "expected_version": work["version"],
        "content": {requirement["field"]: result["content"][requirement["source_field"]]},
        "sources": [{"artifact": requirement["source"], "version": result["version"]}],
    }


def workflow_ordered(observation: Observation) -> dict:
    """First eligible work in declared order; accept, hand off, perform, then claim."""
    legal = {a["kind"]: a for a in observation["legal_actions"]}
    work = {w["key"]: w for w in observation["workflow"]["work"]}
    for kind in ("accept_handoff", "handoff_work", "perform_work", "claim_work"):
        if kind not in legal:
            continue
        key = legal[kind]["targets"][0]
        item = work[key]
        action = {"kind": kind, "work": key}
        if kind == "handoff_work":
            action.update(recipient=item["handoff_to"][0], version=item["artifact_version"])
        elif kind == "accept_handoff":
            action["version"] = item["handoff"]["version"]
        elif kind == "perform_work":
            artifact = next(a for a in observation["artifacts"] if a["key"] == item["artifact"])
            action.update(
                expected_version=artifact["version"], content={"draft": "Prepared work"}, sources=[]
            )
        return action
    return {"kind": "wait_workflow"}
