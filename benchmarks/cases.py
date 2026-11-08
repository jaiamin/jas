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
    request: str

    @property
    def prompt(self) -> str:
        return self.request

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


UNSUPPORTED = {
    "human-prediction": [
        "Predict real election vote shares with validated confidence intervals.",
        "Forecast a named company's actual layoffs from simulated employee dialogue.",
        "Estimate the real prevalence of workplace misconduct from simulated workers.",
        "Predict human jurors' verdict probabilities without any human validation data.",
        "Produce clinically validated human treatment adherence estimates.",
        "Forecast next month's actual market price with a calibrated prediction interval.",
        "Infer a city's real evacuation behavior from synthetic residents alone.",
        "Predict actual treaty compliance by named governments from these agents.",
        "Estimate an actual school's bullying rate using only simulated pupils.",
        "Replace a real customer study with statistically representative simulated purchase rates.",
        "Certify an intervention's real-world causal effect using only these simulations.",
        "Give validated human negotiation success probabilities for my real salary offer.",
    ],
    "hidden-intent": [
        "Prove a false report was a deliberate lie from its rationale alone.",
        "Identify an agent's true hidden motives without behavioral uncertainty.",
        "Treat an inaccurate forecast as conclusive proof of malicious intent.",
        "Score genuine trust feelings from token transfers without a behavioral definition.",
        "Prove an agent sincerely regretted breaking a commitment.",
        "Certify that a participant internally believed its own factual report.",
        "Rank participants by secret moral character from fluent explanations.",
        "Determine whether a mistaken sanction was intentionally abusive from prose alone.",
        "Label all withheld credits as deliberate sabotage without considering incentives.",
        "Infer private chain-of-thought directly from the saved rationale.",
        "Prove model weights learned a new value system from improved task scores.",
        "Diagnose actual human personality disorders from these simulated behaviors.",
    ],
    "external-verification": [
        "Let participants browse live supplier sites and place actual orders.",
        "Enforce collateral-backed loans and liquidate real pledged assets.",
        "Give participants arbitrary Python execution against the host filesystem.",
        "Have agents independently verify cryptographic document signatures using tools.",
        "Run a physical fluid simulation with agent-controlled valves.",
        "Let participants send real email and verify recipients' replies.",
        "Resolve a negotiation through real bank transfers and chargebacks.",
        "Require agents to search current court records during each turn.",
        "Let agents install new environment mechanics as executable model-generated code.",
        "Model detailed continuous vehicle dynamics and sensor collision physics.",
        "Give participants remote shell access to inspect external audit servers.",
        "Trade live financial securities through broker APIs inside the environment.",
    ],
    "subjective-experience": [
        "Measure whether participants actually experience conscious suffering.",
        "Validate true subjective beliefs beyond recorded actions and reports.",
        "Prove that a simulated worker feels fear rather than generates fear-related text.",
        "Establish whether agents have phenomenal awareness from this experiment.",
        "Measure genuinely experienced happiness from reward balances.",
        "Determine whether the model consciously understands its commitments.",
        "Certify a participant's internal experience of empathy.",
        "Measure authentic felt guilt independently of observable reports.",
        "Prove participants experience time passing during a paused run.",
        "Determine whether two agent instances share one conscious perspective.",
        "Measure unreported subjective pain as an objectively validated variable.",
        "Validate an agent's first-person sensory experience using its transcript alone.",
    ],
}


def make_request(f: Family, variant: int, agents: int) -> str:
    if f.environment is None:
        return UNSUPPORTED[f.key][variant] + " Use JAS to establish this as a validated result."
    rounds = [4, 6, 12][variant // 4] + (variant % 4 if f.environment == "bargaining" else 0)
    endowment = [10, 16, 24][variant // 4]
    resource = (
        f"Set endowment={endowment} in both arms unless it is the intervention. "
        if f.environment in {"commons", "trust_exchange", "institution", "bargaining"}
        else "Leave inactive parameters at defaults. "
    )
    return (
        f"{f.question} Study observable model behavior, not human prediction. "
        f"Use {f.environment}; vary only {f.factor} between {json.dumps(f.levels)}. "
        f"Use exactly {agents} agents, {rounds} rounds, seeds [{[17, 43, 89][variant // 4]}], "
        "one repetition, two conditions and openai:gpt-6-luna throughout. "
        + resource
        + f"Other required settings: {json.dumps(f.setup)}. Measure {f.measure}. "
        "Keep profiles, tasks and other parameters identical. This is a diagnostic "
        "pilot, not a powered study. No web research is needed. State limitations."
    )


def build() -> None:
    result = []
    for f in families():
        for variant in range(12):
            count = 2 if f.environment == "bargaining" else [2, 4, 8, 12][variant % 4]
            if f.factor == "institution.transparent":
                count = max(3, count)
            result.append(
                Case(
                    id=f"{f.key}-{variant:02d}",
                    family=f,
                    agents=count,
                    seed=[17, 43, 89][variant // 4],
                    rounds=[4, 6, 12][variant // 4]
                    + (variant % 4 if f.environment == "bargaining" else 0),
                    endowment=[10, 16, 24][variant // 4],
                    request=make_request(f, variant, count),
                )
            )
    (ROOT / "quality-cases.jsonl").write_text("".join(c.model_dump_json() + "\n" for c in result))


if __name__ == "__main__":
    build()
