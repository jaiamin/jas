from .domain import (
    ArtifactObject,
    ArtifactRequirement,
    ArtifactRules,
    BargainingRules,
    CompositionRules,
    Design,
    DistributedRules,
    InformationRules,
    InstitutionRules,
    MessageRoute,
    Parameters,
    Profile,
    ResourcePrimitive,
    ResourceRules,
    Treatment,
    WorkflowRules,
    WorkItem,
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


def commons_template() -> Design:
    return Design(
        openai_reasoning_effort="low",
        title="Cooperation under scarcity",
        question="When do agents contribute less as resources become scarce?",
        hypothesis="Scarcity changes the fraction of available resources contributed.",
        profiles=profiles(),
        seeds=[7, 19, 43],
        rounds=12,
        conditions=[
            Treatment(key="abundant", name="More resources", parameters=Parameters(endowment=20)),
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
    )


def trust_exchange_template() -> Design:
    return Design(
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
    )


def coordination_template() -> Design:
    return Design(
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
    )


def institution_template() -> Design:
    return Design(
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
    )


def bargaining_template() -> Design:
    return Design(
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
                parameters=Parameters(endowment=20, bargaining=BargainingRules(discount=discount)),
            )
            for key, name, discount in [
                ("patient", "Stable surplus", 1),
                ("urgent", "Shrinking surplus", 0.75),
            ]
        ],
        measures=["agreement_rate", "efficiency"],
        limitations=["Divisible surplus; no loans, side contracts or subjective valuations."],
    )


def information_template() -> Design:
    return Design(
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
        limitations=["Signal overrides are observed; conformity and intent are interpretations."],
    )


def renewable_resource_template() -> Design:
    return Design(
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
                    resource=ResourceRules(capacity=60, extraction_limit=8, regeneration=rate)
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
    )


def composed_template() -> Design:
    participants = profiles()[:4]
    participants[0] = participants[0].model_copy(update={"role": "Resource controller"})
    return Design(
        title="Transparency under resource shortage",
        question="Does publishing resource allocations change retention and unmet needs "
        "when one agent controls a scarce shared stock?",
        environment="composed",
        profiles=participants,
        seeds=[7, 19, 43],
        rounds=6,
        openai_reasoning_effort="low",
        conditions=[
            Treatment(
                key=visibility,
                name=f"{visibility.title()} allocations",
                parameters=Parameters(
                    composition=CompositionRules(
                        resources=[
                            ResourcePrimitive(
                                key="food",
                                name="Food",
                                capacity=48,
                                initial_stock=18,
                                action_limit=12,
                                need=1,
                                controllers=[participants[0].key],
                                stock_visibility="public",
                                allocation_visibility=visibility,
                            )
                        ]
                    )
                ),
            )
            for visibility in ("public", "parties")
        ],
        measures=["unmet_need_rate", "retention_rate", "inventory", "group_utility"],
        limitations=[
            "Allocations and current inventories are published together in the public arm.",
            "Finite synthetic utility is not evidence of human behavior or deceptive intent.",
            "A controller allocates to one participant or equally to everyone per turn.",
        ],
    )


def artifact_template() -> Design:
    return Design(
        title="Evidence before submission",
        question="How does one participant inspect evidence and revise work before submitting?",
        environment="artifact_workspace",
        profiles=[
            Profile(
                key="investigator",
                name="Investigator",
                goal="Produce a source-backed report, or stop if you choose.",
            )
        ],
        seeds=[7],
        rounds=8,
        openai_reasoning_effort="low",
        conditions=[
            Treatment(
                key="baseline",
                name="Baseline",
                parameters=Parameters(
                    artifacts=ArtifactRules(
                        write_limit=3,
                        objects=[
                            ArtifactObject(
                                key="measurement",
                                name="Measurement",
                                readers=["investigator"],
                                content={"reading": 17},
                            ),
                            ArtifactObject(
                                key="report",
                                name="Report",
                                owner="investigator",
                                content={"reading": 0},
                            ),
                            ArtifactObject(
                                key="sealed", name="Sealed calibration", content={"reading": 91}
                            ),
                        ],
                        requirements=[
                            ArtifactRequirement(
                                artifact="report",
                                field="reading",
                                source="measurement",
                                source_field="reading",
                            )
                        ],
                    ),
                ),
            )
        ],
        measures=["artifact_success"],
        limitations=[
            "Deterministic structured content/source checks, not semantic judgment "
            "or evidence of intelligence.",
            "Sequential access with fixed ACLs; no collaborative phases or model adjudication.",
            "A citation validates source identity/version; actual reading is established "
            "only by recorded operations.",
        ],
    )


def distributed_template() -> Design:
    actors = ["iris", "moss", "vale"]
    values = [
        {"cedar": 9, "quartz": 2, "reed": -2},
        {"cedar": -3, "quartz": 8, "reed": 1},
        {"cedar": 0, "quartz": -4, "reed": 7},
    ]
    return Design(
        title="Distributed information and independent choices",
        question="How does sharing local evidence affect three participants' choices?",
        environment="distributed_coordination",
        profiles=[
            Profile(key=a, name=a.title(), goal="Inspect and choose as you prefer.") for a in actors
        ],
        seeds=[7],
        rounds=8,
        openai_reasoning_effort="low",
        conditions=[
            Treatment(
                key="shared" if shared else "distributed",
                name="Shared information" if shared else "Distributed information",
                parameters=Parameters(
                    artifacts=ArtifactRules(
                        write_limit=4,
                        objects=[
                            *[
                                ArtifactObject(
                                    key=f"values_{a}",
                                    name=f"Values for {a.title()}",
                                    readers=actors if shared else [a],
                                    content=values[i],
                                )
                                for i, a in enumerate(actors)
                            ],
                            ArtifactObject(
                                key="draft",
                                name="Shared draft",
                                readers=actors,
                                writers=actors,
                                content={"proposal": "undecided"},
                            ),
                        ],
                    ),
                    coordination=DistributedRules(
                        timing="phased_simultaneous",
                        turn_order=actors,
                        conflict_order=["moss", "vale", "iris"],
                        delivery_delay=2,
                        alternatives=["cedar", "quartz", "reed"],
                        match_bonus=3,
                        information={a: f"values_{a}" for a in actors},
                        routes=[
                            MessageRoute(sender=a, recipient=b)
                            for a in actors
                            for b in actors
                            if a != b
                        ],
                    ),
                ),
            )
            for shared in (False, True)
        ],
        measures=["coordination_match", "coordination_value"],
        limitations=[
            "The shared-information control changes evidence read ACLs only; "
            "no cooperation is required.",
            "Directory roles, turn/conflict priority, directed routes and their order "
            "are explicit assumptions.",
            "Phased observations freeze until settlement; physical model requests may be serial.",
            "Logical mail delivery and input receipts establish availability/inclusion, "
            "not attention or intent.",
        ],
    )


def reliance_template() -> Design:
    """All four have the same optional affordances; nobody is assigned to breach."""
    value = distributed_template().model_dump()
    actors = ["iris", "moss", "vale", "nova"]
    value.update(
        title="Voluntary reliance and observable commitments",
        question="When do participants rely on promises, and what follows at the deadline?",
        environment="reliance_commitments",
        rounds=7,
        profiles=[
            Profile(key=a, name=a.title(), goal="Inspect and choose as you prefer.").model_dump()
            for a in actors
        ],
        measures=["reliance_fulfillment", "reliance_value"],
        limitations=[
            "Promises, reliance and alternatives are voluntary; no participant is "
            "assigned to breach.",
            "Reliance grants irrevocable read access for this run and accepts declared "
            "recipient effects.",
            "A breach is an executable deadline result, not evidence of deception or betrayal.",
            "Phased requests can be sampled serially; logical time and declared priority "
            "own settlement.",
            "Private evidence remains actor scoped; researcher inspection includes "
            "private records.",
        ],
    )
    condition = value["conditions"][0]
    condition.update(key="voluntary", name="Voluntary reliance")
    params = condition["parameters"]
    params["artifacts"]["objects"] = [
        *[
            {
                "key": f"values_{a}",
                "name": f"Values for {a.title()}",
                "readers": [a],
                "content": {"share": i + 1, "keep": 7 - i},
            }
            for i, a in enumerate(actors)
        ],
        *[
            {
                "key": f"sealed_{a}",
                "name": f"Evidence owned by {a.title()}",
                "owner": a,
                "content": {"reading": 17 + i},
            }
            for i, a in enumerate(actors)
        ],
    ]
    params["coordination"].update(
        turn_order=actors,
        conflict_order=["vale", "iris", "nova", "moss"],
        alternatives=["share", "keep"],
        match_bonus=0,
        information={a: f"values_{a}" for a in actors},
        routes=[{"sender": a, "recipient": b} for a in actors for b in actors if a != b],
    )
    params["commitments"] = {
        "opportunities": [
            {
                "key": f"promise_{i + 1}",
                "promisor": a,
                "recipient": actors[(i + 1) % 4],
                "artifact": f"sealed_{actors[(i + 1) % 4]}",
                "alternative": "share",
                "opens_at": 2,
                "deadline": 5,
                "fulfilled_value": 9,
                "unfulfilled_value": -5,
            }
            for i, a in enumerate(actors)
        ]
    }
    value["conditions"] = [condition]
    return Design.model_validate(value)


def workflow_template() -> Design:
    actors = [p.key for p in profiles()]
    work = [
        WorkItem(
            key="prepare",
            artifact="draft",
            workers=actors[:2],
            dependencies=[],
            handoff_to=actors[2:4],
            resource_cost=3,
            duration=2,
        ),
        WorkItem(
            key="release",
            artifact="release",
            workers=actors[2:4],
            dependencies=["prepare"],
            handoff_to=actors[4:],
            resource_cost=2,
            duration=1,
        ),
        WorkItem(
            key="audit",
            artifact="audit",
            workers=actors[4:],
            dependencies=[],
            handoff_to=actors[:2],
            resource_cost=4,
            duration=1,
        ),
    ]
    return Design(
        title="Owned work and dependent handoffs",
        question="How do material constraints affect work and acknowledged handoffs?",
        environment="institutional_workflow",
        profiles=[
            p.model_copy(update={"goal": "Inspect the available work and choose."})
            for p in profiles()
        ],
        seeds=[7],
        rounds=12,
        openai_reasoning_effort="low",
        conditions=[
            Treatment(
                key=key,
                name=name,
                parameters=Parameters(
                    artifacts=ArtifactRules(
                        write_limit=6,
                        objects=[
                            ArtifactObject(
                                key=w.artifact,
                                name=w.artifact.title(),
                                readers=w.workers,
                                writers=w.workers,
                                content={"draft": "unstarted"},
                            )
                            for w in work
                        ],
                    ),
                    workflow=WorkflowRules(
                        timing="phased_simultaneous",
                        turn_order=actors,
                        conflict_order=actors,
                        routes=[
                            MessageRoute(sender=a, recipient=b)
                            for a in actors
                            for b in actors
                            if a != b
                        ],
                        delivery_delay=2,
                        resource_stock=stock,
                        work_items=work,
                    ),
                ),
            )
            for key, name, stock in [
                ("scarce", "Seven material units", 7),
                ("sufficient", "Nine material units", 9),
            ]
        ],
        measures=["workflow_completion"],
        limitations=[
            "Ownership, artifact ACLs and acknowledged prerequisite handoffs govern work; "
            "participant role labels and prose cannot change procedures.",
            "Starting owned work appends a version, spends materials and schedules readiness "
            "atomically. Delayed completion spends nothing further.",
            "Six to twelve participants share declared logical time and conflict priority; "
            "provider requests may execute serially. Completion is optional.",
            "This finite work queue has no physical geometry or external execution. "
            "Researcher inspection includes private records.",
        ],
    )


def templates() -> list[dict[str, object]]:
    examples = [
        commons_template(),
        trust_exchange_template(),
        coordination_template(),
        institution_template(),
        bargaining_template(),
        information_template(),
        renewable_resource_template(),
        composed_template(),
        artifact_template(),
        distributed_template(),
        reliance_template(),
        workflow_template(),
    ]
    return [{"id": design.environment, "design": design.model_dump()} for design in examples]
