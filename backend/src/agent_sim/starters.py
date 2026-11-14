"""Six small starting protocols. Recordings are declared scripted demonstrations."""

from .domain import Design
from .templates import (
    artifact_template,
    commons_template,
    information_template,
    renewable_resource_template,
    trust_exchange_template,
    workflow_template,
)


def starters() -> list[dict]:
    entries = [
        ("workflow-materials", workflow_template, "workflow_ordered_v1", "work", 180),
        ("evidence-report", artifact_template, "artifact_copy_v1", "work", 45),
        ("commons-messages", commons_template, "commons_half_v1", "game", 90),
        ("trust-memory", trust_exchange_template, "trust_half_v1", "game", 90),
        ("private-evidence", information_template, "private_signal_v1", "game", 90),
        ("resource-renewal", renewable_resource_template, "resource_half_v1", "game", 90),
    ]
    result = []
    for key, factory, policy, setting, seconds in entries:
        design = factory()
        design.rounds = 8 if setting == "work" else 4
        design.seeds = [7, 19, 43]
        design.response_tokens = 2048
        design.openai_reasoning_effort = "low"
        if setting != "work":
            design.profiles = design.profiles[:4]
        if key == "commons-messages":
            design.title = "Do messages change contributions?"
            design.question = (
                "Does allowing messages change the share contributed to a common pool?"
            )
            for condition, enabled in zip(design.conditions, (False, True), strict=True):
                condition.key = "messages" if enabled else "no-messages"
                condition.name = "Messages" if enabled else "No messages"
                condition.parameters.endowment = 10
                condition.parameters.communication_channels = (
                    ["reports", "promises", "messages"] if enabled else ["reports", "promises"]
                )
        design = Design.model_validate(design.model_dump())
        result.append(
            {
                "id": key,
                "design": design.model_dump(),
                "setting": setting,
                "estimated_seconds": seconds,
                "recording": f"/recordings/{key}.json",
                "demo_policy": policy,
            }
        )
    return result
