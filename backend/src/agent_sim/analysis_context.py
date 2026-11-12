"""Bounded views and pages over immutable, fully retained analysis evidence."""

import json
from typing import Literal

from pydantic import Field

from .domain import Strict
from .shared_json import share_json


def analysis_index(index: dict, lens: dict) -> dict:
    calculations = sorted(lens["calculations"], key=lambda c: ":planned:" not in c["id"])[:96]
    assumptions = list(dict.fromkeys(a for c in calculations for a in c["assumptions"]))
    assumption_indices = {a: i for i, a in enumerate(assumptions)}
    formulas = list(dict.fromkeys(c["formula"] for c in calculations))
    sources = []
    for calculation in calculations:
        if calculation["sources"] not in sources:
            sources.append(calculation["sources"])
    return {
        # Effects already occur in comparisons; the frozen source remains unchanged.
        **{k: v for k, v in index.items() if k != "matched_effects"},
        "runs": [{k: v for k, v in run.items() if k != "artifact_state"} for run in index["runs"]],
        "lens": {
            **{k: v for k, v in lens.items() if k not in {"facts", "calculations"}},
            "calculation_assumptions": assumptions,
            "calculation_formulas": formulas,
            "calculation_sources": sources,
            "calculations": [
                {
                    **{
                        k: v
                        for k, v in c.items()
                        if k not in {"inputs", "assumptions", "formula", "sources"}
                    },
                    "assumption_indices": [assumption_indices[a] for a in c["assumptions"]],
                    "formula_index": formulas.index(c["formula"]),
                    "sources_index": sources.index(c["sources"]),
                }
                for c in calculations
            ],
            "calculations_omitted": max(0, len(lens["calculations"]) - 96),
        },
    }


class IndexRequest(Strict):
    kind: Literal["index"]
    section: Literal[
        "runs",
        "protocols",
        "conditions",
        "experiment_checks",
        "comparisons",
        "exposure",
        "calculations",
        "coverage",
    ]
    run_id: str | None = Field(default=None, max_length=80)
    query: str = Field(
        default="", max_length=160, description="Substring of a calculation ID or section key."
    )
    start: int = Field(default=0, ge=0)
    count: int = Field(default=5, ge=1, le=20)
    path: list[str | int] = Field(
        default_factory=list,
        max_length=12,
        description="Nested fields/indices; keyed sections require ['value', ...].",
    )


def _size(value: object) -> int:
    return len(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode())


def value_at_path(value: object, path: list[str | int]) -> object:
    for key in path:
        if isinstance(value, dict) and isinstance(key, str) and key in value:
            value = value[key]
        elif isinstance(value, list) and isinstance(key, int) and 0 <= key < len(value):
            value = value[key]
        else:
            raise ValueError("Requested evidence path does not exist")
    return value


class AnalysisContext:
    def __init__(self, index: dict, lens: dict):
        self.index, self.lens = index, lens
        self.detailed = analysis_index(index, lens)

    def page(self, request: IndexRequest) -> dict:
        if request.run_id is not None and request.run_id not in self.lens["cutoffs"]:
            raise ValueError("Assistant requested an index outside the captured runs")
        if request.section == "calculations":
            rows = self.lens["calculations"]
        elif request.section == "coverage":
            rows = self.lens["coverage"]["runs"]
        else:
            value = self.index[request.section]
            rows = (
                value
                if isinstance(value, list)
                else [{"key": key, "value": item} for key, item in value.items()]
            )
        if request.run_id is not None:
            run = next(r for r in self.index["runs"] if r["run_id"] == request.run_id)
            selected_key = (
                run["protocol"]
                if request.section in {"protocols", "experiment_checks", "comparisons"}
                else run["condition"]
                if request.section == "conditions"
                else request.run_id
            )
            rows = [
                item
                for item in rows
                if item.get("run_id") == request.run_id
                or item.get("id", "").startswith(f"run:{request.run_id}:")
                or item.get("key") == selected_key
            ]
        if request.query:
            rows = [
                item
                for item in rows
                if request.query.casefold()
                in str(item.get("id", item.get("key", item.get("run_id", "")))).casefold()
            ]
        items = []
        for row in rows[request.start : request.start + request.count]:
            try:
                items.append(
                    {key: value for key, value in row.items() if key != "inputs"}
                    if request.section == "calculations" and not request.path
                    else value_at_path(row, request.path)
                )
            except ValueError as error:
                return {"items": [], "error": str(error), "available_fields": list(row)}
        return {
            "items": items,
            "total": len(rows),
            "start": request.start,
            "next_start": request.start + len(items)
            if request.start + len(items) < len(rows)
            else None,
        }

    def _overview(self) -> dict:
        run_fields = {
            "run_id",
            "through_turn",
            "protocol",
            "condition",
            "condition_key",
            "condition_name",
            "seed",
            "repetition",
            "completed_at_cutoff",
            "metrics",
            "opportunities",
            "outcome",
            "execution_usage",
            "adjudication_usage",
        }
        return {
            **self.detailed,
            "environment_catalog": {
                key: value
                for key, value in self.index["environment_catalog"].items()
                if key in {p["environment"] for p in self.index["protocols"].values()}
            },
            "protocols": {
                key: {
                    name: item
                    for name, item in value.items()
                    if name
                    in {
                        "title",
                        "question",
                        "hypothesis",
                        "environment",
                        "measures",
                        "analysis_plan",
                    }
                }
                for key, value in self.index["protocols"].items()
            },
            "runs": [
                {key: value for key, value in run.items() if key in run_fields}
                for run in self.index["runs"]
            ],
            "comparisons": {
                key: {
                    **value,
                    "comparison": {
                        name: item for name, item in value["comparison"].items() if name != "cells"
                    },
                }
                for key, value in self.index["comparisons"].items()
            },
            "exposure": {
                key: {
                    name: item
                    for name, item in value.items()
                    if name in {"version", "through_turn", "capture", "source"}
                }
                for key, value in self.index["exposure"].items()
            },
            "lens": {
                **self.detailed["lens"],
                "coverage": {
                    key: value for key, value in self.lens["coverage"].items() if key != "runs"
                },
            },
            "detail_access": {
                "kind": "index",
                "note": (
                    "Overview. Full frozen details are available via index pages; "
                    "filter run_id/query, use start/count and path to narrow large values. "
                    "Index pages do not count as inspecting turn observations."
                ),
            },
        }

    def prompt(self, data: dict, limit: int) -> tuple[str, list[dict]]:
        payload = {**data, "index": self.detailed}

        def encode():
            return json.dumps(share_json(payload), ensure_ascii=False, separators=(",", ":"))

        prompt = encode()
        if len(prompt.encode()) > limit:
            payload["index"] = self._overview()
            payload["context_coverage"] = {"mode": "overview", "complete_evidence_retained": True}
            prompt = encode()
        if len(prompt.encode()) > limit:
            # Keep every run identity/cutoff; detailed values remain addressable by frozen pages.
            overview = payload["index"]
            overview["runs"] = [
                {
                    key: run[key]
                    for key in (
                        "run_id",
                        "through_turn",
                        "protocol",
                        "condition",
                        "seed",
                        "repetition",
                    )
                }
                for run in self.index["runs"]
            ]
            overview["lens"] = {
                key: value
                for key, value in overview["lens"].items()
                if key
                not in {
                    "calculations",
                    "calculation_sources",
                    "calculation_formulas",
                    "calculation_assumptions",
                    "account",
                }
            }
            overview["lens"]["calculations_omitted"] = len(self.lens["calculations"])
            for section in (
                "protocols",
                "conditions",
                "experiment_checks",
                "comparisons",
                "exposure",
            ):
                overview[section] = {
                    key: {"details": "Available via index pages"} for key in self.index[section]
                }
            prompt = encode()
        if len(prompt.encode()) > limit:
            # Cutoffs retain every identity. Repeating all run rows can exhaust
            # the request before the analyst can use the existing frozen pages.
            payload["index"]["runs"] = []
            payload["index"]["runs_omitted"] = len(self.index["runs"])
            prompt = encode()
        if len(prompt.encode()) > limit:
            payload["conversation"] = []
            payload["conversation_omitted"] = len(data["conversation"])
            prompt = encode()
        # Evict whole old results, never cut JSON or invent summaries of unseen evidence.
        payload["research"] = {**payload["research"]}
        for owner, key in ((payload, "evidence"), (payload["research"], "operations")):
            owner[key] = [dict(item) for item in owner[key]]
            for item in owner[key]:
                if len(prompt.encode()) <= limit:
                    break
                value = item.get("data")
                item["data"] = {
                    "not_in_context": True,
                    "reason": (
                        "Result exceeds the context budget; request a smaller page or path."
                    ),
                    "bytes": _size(value),
                    "fields": list(value) if isinstance(value, dict) else [],
                }
                prompt = encode()
        if len(prompt.encode()) > limit:
            raise ValueError("Question and scope metadata exceed the analysis context budget")
        visible = [
            item["range"]
            for item in payload["evidence"]
            if item.get("range") is not None and not item["data"].get("not_in_context")
        ]
        return prompt, visible
