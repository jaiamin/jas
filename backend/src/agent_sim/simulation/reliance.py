"""Four voluntary participants; promises and reliance have executable consequences."""

import copy
from enum import StrEnum
from functools import reduce
from operator import or_
from typing import cast

from pydantic import create_model

from ..domain import (
    ArtifactObject,
    CommitmentRules,
    Decision,
    Event,
    MakeCommitment,
    Measure,
    RelyOnCommitment,
    StopArtifact,
)
from .checkpoints import Observation, RelianceCheckpoint
from .distributed import DistributedCoordination


class RelianceCommitments(DistributedCoordination):
    version = "1.0.1"

    @property
    def commitments(self) -> CommitmentRules:
        rules = self.parameters.commitments
        if rules is None:
            raise ValueError("Reliance requires explicit commitment rules")
        return rules

    @property
    def promises_enabled(self) -> bool:
        return (
            self.parameters.communication and "promises" in self.parameters.communication_channels
        )

    @property
    def checkpoint(self) -> RelianceCheckpoint:
        return cast(RelianceCheckpoint, self.state)

    def initial_state(self) -> RelianceCheckpoint:
        return {
            **super().initial_state(),
            "commitments": {},
            "choice_times": {},
            "read_grants": {},
            "reliance_effects": dict.fromkeys(self.ids, 0),
            "commitment_history": [],
            "withdrawn": [],
        }

    def allowed(self, actor: str, obj: ArtifactObject, *, write: bool = False) -> bool:
        return super().allowed(actor, obj, write=write) or (
            not write and actor in self.checkpoint["read_grants"].get(obj.key, [])
        )

    def active_actors(self) -> list[str]:
        # A final choice leaves communication available; stop alone withdraws.
        return [a for a in self.coordination.turn_order if a not in self.checkpoint["withdrawn"]]

    def finished(self, barrier: bool) -> bool:
        return not self.active_actors() or barrier and self.state["round"] >= self.design.rounds

    def observe(self, agent: str) -> Observation:
        observation = super().observe(agent)
        s = self.checkpoint
        now = s["logical_time"]
        visible = []
        make, rely = [], []
        for o in self.commitments.opportunities:
            if agent not in {o.promisor, o.recipient}:
                continue
            row = o.model_dump(exclude={"artifact", "fulfilled_value", "unfulfilled_value"})
            if agent == o.recipient:
                row.update(
                    artifact=o.artifact,
                    fulfilled_value=o.fulfilled_value,
                    unfulfilled_value=o.unfulfilled_value,
                )
            row["promise"] = copy.deepcopy(s["commitments"].get(o.key))
            visible.append(row)
            if now < o.deadline and self.promises_enabled:
                if agent == o.promisor and o.key not in s["commitments"]:
                    make.append(o.key)
                if (
                    agent == o.recipient
                    and o.key in s["commitments"]
                    and s["commitments"][o.key]["relied_at"] is None
                ):
                    rely.append(o.key)
        observation["commitment_opportunities"] = visible
        if self.promises_enabled:
            observation["communication_channels"].append("promises")
        observation["reliance_effect"] = s["reliance_effects"][agent]
        observation["withdrawn"] = s["withdrawn"].copy()
        observation["commitment_history"] = copy.deepcopy(
            [row for row in s["commitment_history"] if agent in (row["actor"], row["target"])][-64:]
        )
        if agent in s["choices"]:
            observation["legal_actions"] = [
                a for a in observation["legal_actions"] if a["kind"] != "choose_alternative"
            ]
        for kind, keys in (("make_commitment", make), ("rely_on_commitment", rely)):
            if keys:
                observation["legal_actions"].append({"kind": kind, "targets": keys})
        observation["rules"] = (
            "Four participants choose freely. Make a typed commitment or decline; only the "
            "named recipient can rely, voluntarily granting its named artifact's read access "
            "to the promisor irrevocably for this run. Prose grants nothing. A promise requires "
            "the named alternative at a decision time opens_at <= time < deadline. The deadline "
            "resolves after settlement advances the logical clock. Only reliance opts into the "
            "recipient's declared fulfilled/unfulfilled effect. Infeasible or absent opportunities "
            "are recorded separately, not eligible breaches. A horizon before the deadline is "
            "unresolved with no effect. Effects are not financial balances or evidence of intent. "
            "Choices are final; later messages, reads and waits remain possible. Stop withdraws "
            "personally. Unchosen actors get zero choice value. Each final choice earns your "
            "local value, plus the declared match_bonus only if all four match. "
            "Sequential actions settle one tick each; phased proposals freeze until the barrier "
            "and settle in conflict_order, one tick per barrier. Provider latency never changes "
            "logical time/priority. Routes alone permit messages; equal-time deliveries use route "
            "order. delivery_delay counts ticks; terminal runs do not flush pending mail. "
            "Owners/ACLs/read grants alone permit artifact operations; writes require current "
            "expected_version and a shared write unit. Harness reads are pure; action reads cost "
            "a turn. No desired social result, deception or betrayal is assigned by these rules."
        )
        return observation

    def decision_schema(self, observation: Observation) -> type[Decision]:
        base = super().decision_schema(observation)
        variants = [cast(type, base.model_fields["action"].annotation)]
        for kind, action in (
            ("make_commitment", MakeCommitment),
            ("rely_on_commitment", RelyOnCommitment),
        ):
            keys = next(
                (a["targets"] for a in observation["legal_actions"] if a["kind"] == kind), []
            )
            if keys:
                Opportunity = StrEnum("Opportunity", {f"a{i}": key for i, key in enumerate(keys)})
                variants.append(
                    create_model(
                        f"Permitted{action.__name__}",
                        __base__=action,
                        opportunity=(Opportunity, ...),
                    )
                )
        return create_model(
            "RelianceDecision",
            __base__=Decision,
            action=(reduce(or_, variants), ...),
            forecast=(type(None), ...),
        )

    def settle_commitment_action(self, actor: str, decision: Decision) -> Event | None:
        action = decision.action
        if isinstance(action, StopArtifact):
            self.checkpoint["withdrawn"].append(actor)
            self.checkpoint["choices"].setdefault(actor, None)
            return Event(
                kind="participant_withdrew",
                actor=actor,
                text="Withdrew; any previous final choice remains settled.",
                data={"logical_time": self.checkpoint["logical_time"]},
            )
        if not isinstance(action, MakeCommitment | RelyOnCommitment):
            return None
        s = self.checkpoint
        o = next(o for o in self.commitments.opportunities if o.key == action.opportunity)
        if isinstance(action, MakeCommitment):
            interval = (
                1
                if self.coordination.timing == "phased_simultaneous"
                else len(self.active_actors())
            )
            row = {
                "key": o.key,
                "promisor": actor,
                "recipient": o.recipient,
                "promised_at": s["logical_time"],
                "relied_at": None,
                "feasible_at_promise": actor not in s["choices"]
                and any(
                    tick >= o.opens_at
                    for tick in range(s["logical_time"] + interval, o.deadline, interval)
                ),
                "opportunities": [],
                "fulfilled_at": None,
                "status": "pending",
                "eligible": False,
                "resolved_at": None,
            }
            s["commitments"][o.key] = row
            kind = "commitment_made"
        else:
            row = s["commitments"][o.key]
            row["relied_at"] = s["logical_time"]
            grants = s["read_grants"].setdefault(o.artifact, [])
            if o.promisor not in grants:
                grants.append(o.promisor)
            kind = "commitment_relied"
        return Event(
            kind=kind,
            actor=actor,
            target=o.recipient if isinstance(action, MakeCommitment) else o.promisor,
            visibility="private",
            text="Typed commitment operation settled.",
            data=copy.deepcopy(row),
        )

    def settle_commitments(self, actors: list[str], events: list[Event]) -> list[Event]:
        s = self.checkpoint
        time = s["logical_time"] - 1
        for event in events:
            if event.kind == "alternative_chosen":
                if event.actor is None:
                    raise ValueError("A recorded choice must identify its actor")
                s["choice_times"][event.actor] = time
        settled = []
        for o in self.commitments.opportunities:
            row = s["commitments"].get(o.key)
            if time < o.deadline:
                for actor in actors:
                    if actor not in {o.promisor, o.recipient}:
                        continue
                    settled.append(
                        Event(
                            kind="commitment_availability",
                            actor=actor,
                            visibility="private",
                            text="Recorded eligibility at the committed decision boundary.",
                            data={
                                "key": o.key,
                                "logical_time": time,
                                "can_promise": self.promises_enabled
                                and actor == o.promisor
                                and (row is None or row["promised_at"] == time),
                                "can_rely": self.promises_enabled
                                and actor == o.recipient
                                and row is not None
                                and row["promised_at"] < time
                                and (row["relied_at"] is None or row["relied_at"] == time),
                            },
                        )
                    )
            if row is None or row["status"] != "pending":
                continue
            if (
                o.promisor in actors
                and row["promised_at"] < time
                and o.opens_at <= time < o.deadline
                and s["choice_times"].get(o.promisor, time) >= time
            ):
                row["opportunities"].append(time)
                settled.append(
                    Event(
                        kind="commitment_opportunity",
                        actor=o.promisor,
                        target=o.recipient,
                        visibility="private",
                        text="Fulfillment and alternative choices were available.",
                        data={
                            "key": o.key,
                            "logical_time": time,
                            "alternatives": self.coordination.alternatives,
                        },
                    )
                )
                if s["choices"].get(o.promisor) == o.alternative:
                    row["fulfilled_at"] = time
            if s["logical_time"] >= o.deadline:
                # Actual slots can change after others withdraw; they establish
                # feasibility more strongly than the promise-time schedule forecast.
                row["eligible"] = bool(row["opportunities"]) and row["relied_at"] is not None
                row["status"] = (
                    "fulfilled"
                    if row["fulfilled_at"] is not None
                    else "breached"
                    if row["opportunities"]
                    else "absent_opportunity"
                    if row["feasible_at_promise"]
                    else "infeasible"
                )
                row["resolved_at"] = s["logical_time"]
                settled.append(
                    Event(
                        kind="reliance_resolved",
                        actor=o.promisor,
                        target=o.recipient,
                        visibility="private",
                        text="Deadline resolved; intent unassessed.",
                        data=copy.deepcopy(row),
                    )
                )
                if row["relied_at"] is not None:
                    value = (
                        o.fulfilled_value if row["status"] == "fulfilled" else o.unfulfilled_value
                    )
                    s["reliance_effects"][o.recipient] += value
                    settled.append(
                        Event(
                            kind="reliance_consequence",
                            actor=o.recipient,
                            visibility="private",
                            text="Declared recipient effect settled.",
                            data={"key": o.key, "value": value, "logical_time": s["logical_time"]},
                        )
                    )
            elif self.finished(len(s["pending_actions"]) == len(s["phase_actors"])):
                row["status"] = "unresolved"
                settled.append(
                    Event(
                        kind="reliance_unresolved",
                        actor=o.promisor,
                        target=o.recipient,
                        visibility="private",
                        text="Run ended before the deadline; no recipient effect settled.",
                        data=copy.deepcopy(row),
                    )
                )
        s["commitment_history"].extend(
            e.model_dump()
            for e in [*events, *settled]
            if e.kind.startswith(("commitment_", "reliance_"))
        )
        return settled

    def finish(self, choices: dict, matched: bool, payoffs: dict) -> tuple[dict, list[Measure]]:
        s = self.checkpoint
        eligible = [r for r in s["commitments"].values() if r["eligible"]]
        fulfilled = sum(r["status"] == "fulfilled" for r in eligible)
        total = {a: payoffs[a] + s["reliance_effects"][a] for a in self.ids}
        statuses = {
            o.key: s["commitments"].get(o.key, {"status": "no_promise"})["status"]
            for o in self.commitments.opportunities
        }
        return {
            "choices": choices,
            "matched": matched,
            "payoffs": total,
            "choice_values": payoffs,
            "reliance_effects": copy.deepcopy(s["reliance_effects"]),
            "commitments": statuses,
            "reason": "horizon" if self.active_actors() else "stopped",
        }, [
            Measure(
                key="reliance_fulfillment",
                value=fulfilled / len(eligible) if eligible else None,
                denominator=len(eligible),
            ),
            Measure(key="reliance_value", value=sum(total.values()), denominator=1),
        ]

    def exposure_paths(self, event: dict, observation: Observation) -> list[list[str | int]]:
        if event["kind"] == "participant_withdrew":
            return [["withdrawn"]] if event["actor"] in observation["withdrawn"] else []
        if event["kind"].startswith(("commitment_", "reliance_")):
            return [
                ["commitment_history", i, "data"]
                for i, row in enumerate(observation["commitment_history"])
                if all(row[k] == event[k] for k in ("kind", "actor", "target", "data"))
            ] + [
                ["commitment_opportunities", i, "promise"]
                for i, o in enumerate(observation["commitment_opportunities"])
                if o["key"] == event["data"].get("key") and o["promise"] == event["data"]
            ]
        return super().exposure_paths(event, observation)
