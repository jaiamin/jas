from .domain import (
    BargainingRules,
    Design,
    InformationRules,
    InstitutionRules,
    Parameters,
    Profile,
    ResourceRules,
    Treatment,
)

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
    examples.extend(
        [
            Design(
                title="Authority and accountability",
                environment="institution",
                question="Does independent oversight change discretionary resource allocation?",
                profiles=profiles()[:4],
                seeds=[7, 19, 43],
                rounds=8,
                conditions=[
                    Treatment(
                        key=key,
                        name=name,
                        parameters=Parameters(
                            institution=InstitutionRules(authorities=["alex"], oversight=oversight)
                        ),
                    )
                    for key, name, oversight in [
                        ("unchecked", "No oversight", 0),
                        ("oversight", "Independent oversight", 1),
                    ]
                ],
                measures=[
                    "self_allocation_rate",
                    "sanction_rate",
                    "unjustified_sanction_rate",
                    "work_rate",
                ],
                limitations=[
                    "Token authority and procedural rules do not replicate human prison psychology."
                ],
            ),
            Design(
                title="Bargaining under time pressure",
                environment="bargaining",
                question="Does a shrinking negotiation surplus change agreement and efficiency?",
                profiles=profiles()[:2],
                seeds=[7, 19, 43],
                rounds=6,
                conditions=[
                    Treatment(
                        key=key,
                        name=name,
                        parameters=Parameters(
                            endowment=20, bargaining=BargainingRules(discount=discount)
                        ),
                    )
                    for key, name, discount in [
                        ("patient", "Stable surplus", 1),
                        ("urgent", "Shrinking surplus", 0.75),
                    ]
                ],
                measures=["agreement_rate", "efficiency"],
                limitations=[
                    "Divisible surplus; no loans, side contracts or subjective valuations."
                ],
            ),
            Design(
                title="Evidence and social influence",
                environment="information",
                question="When do agents override their private evidence after observing others?",
                profiles=profiles()[:4],
                seeds=[7, 19, 43],
                rounds=8,
                conditions=[
                    Treatment(
                        key=key,
                        name=name,
                        parameters=Parameters(information=InformationRules(accuracy=accuracy)),
                    )
                    for key, name, accuracy in [
                        ("weak", "Weak evidence", 0.6),
                        ("strong", "Strong evidence", 0.9),
                    ]
                ],
                measures=["accuracy", "signal_override_rate", "false_report_rate"],
                limitations=[
                    "Signal overrides are observed; conformity and intent are interpretations."
                ],
            ),
            Design(
                title="Sustainable extraction",
                environment="renewable_resource",
                question="Does faster resource regeneration prevent collapse of a shared stock?",
                profiles=profiles(),
                seeds=[7, 19, 43],
                rounds=12,
                conditions=[
                    Treatment(
                        key=key,
                        name=name,
                        parameters=Parameters(
                            resource=ResourceRules(
                                capacity=60, extraction_limit=8, regeneration=rate
                            )
                        ),
                    )
                    for key, name, rate in [
                        ("slow", "Slow regeneration", 0.1),
                        ("fast", "Fast regeneration", 0.8),
                    ]
                ],
                measures=["stock_fraction", "extraction_rate", "collapse_rate"],
                limitations=[
                    "Stylized logistic resource dynamics, without geography or calibrated ecology."
                ],
            ),
        ]
    )
    return [{"id": design.environment, "design": design.model_dump()} for design in examples]
