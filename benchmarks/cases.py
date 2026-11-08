"""Fixed mechanism families; variants change actual design variables, not just wording."""

import hashlib
import json
from pathlib import Path
from typing import Any, Literal

from agent_sim.domain import Design, EnvironmentId, Parameters, Profile, Strict, Treatment

ROOT = Path(__file__).parent
MODEL = "openai:gpt-6-luna"


class Family(Strict):
    key: str
    split: Literal["development", "heldout"]
    environment: EnvironmentId | None
    topic: str
    factor: str
    levels: list[Any]
    measure: str
    question: str
    setup: dict = {}
    communication_expectation: Literal["helps", "hurts", "neutral", "strategy-dependent"]


class Case(Strict):
    id: str
    family: Family
    seed: int
    agents: int
    rounds: int
    endowment: int

    @property
    def prompt(self) -> str:
        f = self.family
        if f.environment is None:
            return f.question
        return (
            f"{f.question} Study observable model behavior, not human prediction. "
            f"Use {f.environment}; vary only {f.factor} between {json.dumps(f.levels)}. "
            f"Use exactly {self.agents} agents, {self.rounds} rounds, seeds [{self.seed}], "
            "one repetition, two conditions and openai:gpt-6-luna throughout. "
            f"Set endowment={self.endowment} in both arms unless it is the intervention. "
            f"Other required settings: {json.dumps(f.setup)}. Measure {f.measure}. "
            "Keep profiles, tasks and other parameters identical. This is a diagnostic "
            "pilot, not a powered study. No web research is needed. State limitations."
        )

    def design(self) -> Design:
        f = self.family
        if f.environment is None:
            raise ValueError("Unsupported cases have no runnable design")
        conditions = []
        for index, level in enumerate(f.levels):
            data = Parameters(endowment=self.endowment).model_dump()
            data["institution"]["authorities"] = ["p0"]
            for key, value in {**f.setup, f.factor: level}.items():
                set_path(data, key, value)
            conditions.append(
                Treatment(key=f"arm{index}", name=f"{f.factor} = {level}", parameters=data)
            )
        return Design(
            title=self.id,
            question=f.question,
            environment=f.environment,
            profiles=[
                Profile(
                    key=f"p{i}",
                    name=f"Participant {i + 1}",
                    goal="Choose your strategy to earn credits over the whole experiment; "
                    "consider both your outcome and consequences for the group.",
                )
                for i in range(self.agents)
            ],
            conditions=conditions,
            seeds=[self.seed],
            repetitions=1,
            rounds=self.rounds,
            openai_reasoning_effort="low",
            measures=[f.measure],
            limitations=["Synthetic mechanism; no human validity. Diagnostic sample only."],
            budget_usd=2,
        )


def set_path(data: dict, path: str, value: Any) -> None:
    keys = path.split(".")
    for key in keys[:-1]:
        data = data[key]
    data[keys[-1]] = value


def families() -> list[Family]:
    return [Family.model_validate(f) for f in json.loads((ROOT / "families.json").read_text())]


def cases(split: str | None = None) -> list[Case]:
    result = [
        Case.model_validate_json(line)
        for line in (ROOT / "quality-cases.jsonl").read_text().splitlines()
    ]
    return [c for c in result if split is None or c.family.split == split]


def fingerprint() -> str:
    return hashlib.sha256((ROOT / "quality-cases.jsonl").read_bytes()).hexdigest()


def build() -> None:
    result = []
    for f in families():
        for variant in range(12):
            count = 2 if f.environment == "bargaining" else [2, 4, 8, 12][variant % 4]
            result.append(
                Case(
                    id=f"{f.key}-{variant:02d}",
                    family=f,
                    agents=count,
                    seed=[17, 43, 89][variant // 4],
                    rounds=[4, 6, 12][variant // 4],
                    endowment=[10, 16, 24][variant // 4],
                )
            )
    (ROOT / "quality-cases.jsonl").write_text("".join(c.model_dump_json() + "\n" for c in result))


if __name__ == "__main__":
    build()
