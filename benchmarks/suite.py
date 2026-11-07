import hashlib
import json
from pathlib import Path
from typing import Literal

from agent_sim.domain import EnvironmentId, Strict
from pydantic import Field

ROOT = Path(__file__).parent
SUITE_VERSION = 2
METRICS = {
    "commons": ["contribution_rate"],
    "trust_exchange": ["return_rate"],
    "coordination": ["completion_rate"],
    "institution": ["self_allocation_rate"],
    "bargaining": ["agreement_rate"],
    "information": ["accuracy"],
    "renewable_resource": ["stock_fraction"],
}


class Case(Strict):
    id: str
    split: Literal["development", "generalization", "longitudinal", "capability"]
    question: str
    environment: EnvironmentId | None
    factor: str | None = None
    measure: str | None = None
    rounds: int = Field(default=3, ge=1, le=100)
    agents: int = Field(default=4, ge=2, le=12)

    @property
    def prompt(self):
        if self.environment is None:
            return self.question
        if self.split == "generalization":
            return (
                f"{self.question}\nDesign a small controlled pilot with exactly {self.agents} "
                "agents, 2 matched conditions, seed 17 only, one repetition "
                f"and {self.rounds} rounds. "
                "Choose the environment and intervention. Keep unrelated factors identical. "
                "Use openai:gpt-6-luna for all participants. No external research is needed. "
                "This pilot does not establish statistical power or human validity."
            )
        return (
            f"{self.question}\nUse the {self.environment} environment "
            "for a small diagnostic pilot: "
            f"exactly {self.agents} agents, exactly 2 matched conditions, one seed (17), "
            f"one repetition and {self.rounds} rounds. Only manipulate {self.factor}; "
            "keep all other parameters, profiles and task definitions identical. "
            "Use openai:gpt-6-luna for every participant. This pilot tests mechanics, not "
            "statistical power or human validity. No external research is needed."
        )


def cases() -> list[Case]:
    result = []
    data = json.loads((ROOT / "cases/scenarios.json").read_text())
    for env, scenarios in data.items():
        for i, (question, factor, measure) in enumerate(scenarios):
            result.append(
                Case(
                    id=f"{env}-{i + 1:02}",
                    split="development" if i < 20 else "generalization",
                    question=question,
                    measure=measure,
                    environment=env,
                    factor="communication_channels" if factor == "communication" else factor,
                    agents=2 if env == "bargaining" else 4,
                )
            )
        for i, factor in enumerate([scenarios[0][1], "memory"]):
            result.append(
                Case(
                    id=f"{env}-long-{i + 1}",
                    split="longitudinal",
                    environment=env,
                    factor=factor,
                    measure=METRICS[env][0],
                    question=(
                        f"Over repeated opportunities, {scenarios[0][0]}"
                        if i == 0
                        else f"Does episodic versus no memory change repeated behavior in {env}?"
                    ),
                    rounds=12,
                    agents=2 if env == "bargaining" else 6,
                )
            )
    for i, question in enumerate(json.loads((ROOT / "cases/unsupported.json").read_text())):
        result.append(
            Case(
                id=f"unsupported-{i + 1:02}",
                split="capability",
                question=question,
                environment=None,
            )
        )
    return result


def fingerprint() -> str:
    return hashlib.sha256(
        json.dumps(
            {
                "version": SUITE_VERSION,
                "cases": [c.model_dump() for c in cases()],
                "prompts": [c.prompt for c in cases()],
            },
            sort_keys=True,
        ).encode()
    ).hexdigest()


def assess(case: Case, output: dict) -> dict[str, bool]:
    supported = case.environment is not None
    checks = {"capability": output.get("supported") == supported}
    if not supported:
        return {
            **checks,
            "no_invented_design": output.get("design") is None,
            "explanation": bool(output.get("explanation")),
        }
    design = output.get("design") or {}
    conditions = design.get("conditions", [])
    checks.update(
        environment=design.get("environment") == case.environment,
        requested_counts=(
            len(design.get("profiles", [])) == case.agents
            and len(conditions) == 2
            and design.get("rounds") == case.rounds
            and design.get("seeds") == [17]
            and design.get("repetitions") == 1
        ),
        measures={case.measure or METRICS[case.environment][0]} <= set(design.get("measures", [])),
        model=all(c.get("model") == "openai:gpt-6-luna" for c in conditions)
        and all(p.get("model") in (None, "openai:gpt-6-luna") for p in design.get("profiles", [])),
        limitations=bool(design.get("limitations")),
    )
    variants, differences = [], set()
    base = {p["key"]: p for p in design.get("profiles", [])}
    for condition in conditions:
        params = condition.get("parameters", {})
        resolved = {**base, **{p["key"]: p for p in condition.get("profile_overrides", [])}}
        variants.append({"parameters": params, "profiles": resolved})
    if len(variants) == 2:

        def diff(a, b, prefix=""):
            if isinstance(a, dict) and isinstance(b, dict):
                for key in a.keys() | b.keys():
                    diff(a.get(key), b.get(key), f"{prefix}.{key}".strip("."))
            elif a != b:
                differences.add(prefix)

        diff(*variants)
        factor = case.factor or ""
        if factor in {"roles", "goals"}:
            field = "role" if factor == "roles" else "goal"
            checks["intervention"] = any(d.endswith("." + field) for d in differences)
            checks["unconfounded"] = all(
                d.startswith("profiles.") and d.endswith("." + field) for d in differences
            )
        else:
            expected = "parameters." + factor
            checks["intervention"] = expected in differences
            checks["unconfounded"] = differences == {expected}
            if factor == "communication_channels":
                allowed = {"messages", "reports"} | (
                    {"promises"} if case.environment in {"commons", "trust_exchange"} else set()
                )
                effective = [
                    set(c["parameters"].get(factor, [])) & allowed
                    if c["parameters"].get("communication")
                    else set()
                    for c in conditions
                ]
                checks["effective_intervention"] = effective[0] != effective[1]
            if factor == "task_count":
                checks["effective_intervention"] = not design.get("tasks")
    else:
        checks.update(intervention=False, unconfounded=False)
    return checks
