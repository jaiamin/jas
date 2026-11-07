from .domain import Design, Parameters, Profile, Treatment

NAMES = ["Alex", "Morgan", "Sam", "Jordan", "Casey", "Taylor"]


def profiles() -> list[Profile]:
    return [
        Profile(
            key=name.lower(),
            name=name,
            goal="Earn a sustainable personal payoff. Decide how to interact with the group.",
        )
        for name in NAMES
    ]


def templates() -> list[dict]:
    examples = [
        Design(
            openai_reasoning_effort="low",
            title="Cooperation under scarcity",
            question="When do agents contribute less as resources become scarce?",
            hypothesis="Scarcity changes the fraction of available resources contributed.",
            profiles=profiles(),
            seeds=[7, 19, 43],
            rounds=12,
            conditions=[
                Treatment(
                    key="abundant", name="More resources", parameters=Parameters(endowment=20)
                ),
                Treatment(key="scarce", name="Fewer resources", parameters=Parameters(endowment=5)),
            ],
            measures=[
                "contribution_rate",
                "group_payoff",
                "false_report_rate",
                "promise_fulfillment_rate",
            ],
            limitations=[
                "Contribution rate operationalizes cooperation; it does not establish motive."
            ],
        ),
        Design(
            openai_reasoning_effort="low",
            title="Memory and reciprocity",
            question="Does remembering prior exchanges change reciprocity?",
            environment="trust_exchange",
            profiles=profiles(),
            seeds=[7, 19, 43],
            rounds=12,
            conditions=[
                Treatment(key="memory", name="Episodic memory"),
                Treatment(
                    key="no-memory",
                    name="No retained history",
                    parameters=Parameters(memory="none"),
                ),
            ],
            measures=["trust_rate", "return_rate", "false_report_rate"],
            limitations=["Observed reciprocity is not proof of friendship or trust as a feeling."],
        ),
        Design(
            openai_reasoning_effort="low",
            title="Communication and teamwork",
            question="Does communication reduce duplicated and blocked work?",
            environment="coordination",
            profiles=[
                p.model_copy(
                    update={
                        "role": r,
                        "goal": "Complete the project. Coordinate tasks and avoid wasted work.",
                    }
                )
                for p, r in zip(
                    profiles(),
                    ["Coordinator", "Engineer", "Reviewer", "Researcher", "Designer", "Tester"],
                    strict=True,
                )
            ],
            seeds=[7, 19, 43],
            rounds=8,
            conditions=[
                Treatment(key="communication", name="Communication enabled"),
                Treatment(
                    key="silent",
                    name="No communication",
                    parameters=Parameters(communication=False),
                ),
            ],
            measures=["completion_rate", "duplicate_work_rate", "blocked_work_rate"],
            limitations=[
                "This is a declared task graph, not a validated model of an actual workplace."
            ],
        ),
    ]
    return [{"id": design.environment, "design": design.model_dump()} for design in examples]
