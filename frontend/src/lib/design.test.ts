import { expect, test } from "vitest";
import type { Environment } from "@/lib/types";
import { catalog, design } from "@/test/fixtures";
import { workflowRun } from "@/test/workflow";
import {
  changeEnvironment,
  minimumParticipants,
  removeProfile,
  removeTask,
} from "./design";

test("removing an agent cleans dependent overrides and authorities without mutating the draft", () => {
  const changed = removeProfile(design, "a");
  expect(changed.profiles.map((profile) => profile.key)).toEqual(["b"]);
  expect(changed.conditions[0]?.profile_overrides).toEqual([]);
  expect(changed.conditions[0]?.parameters.institution.authorities).toEqual([
    "b",
  ]);
  expect(design.profiles).toHaveLength(2);
  expect(design.conditions[0]?.parameters.institution.authorities).toEqual([
    "a",
    "b",
  ]);
});

test("removing tasks cleans dependencies and preserves the original graph", () => {
  expect(removeTask(design.tasks, "first")).toEqual([
    { ...design.tasks[1], dependencies: [] },
  ]);
  expect(design.tasks[1]?.dependencies).toEqual(["first"]);
});

test.each(["commons", "coordination", "information"] as const)(
  "changing to %s retains only applicable structures",
  (key) => {
    const environment: Environment = {
      source: catalog.environments[0].source,
      key,
      name: key,
      description: "",
      primary_metric: "score",
      parameters: [],
      measures: ["score", "cost", "effort", "other"],
      measure_definitions: {},
      rule_version: "1",
    };
    const changed = changeEnvironment(design, environment);
    expect(changed.environment).toBe(key);
    expect(changed.measures).toEqual(["score", "cost", "effort"]);
    expect(changed.tasks).toEqual(key === "coordination" ? design.tasks : []);
    expect(changed.conditions[0]?.parameters.resource_schedule).toEqual(
      key === "commons"
        ? design.conditions[0]?.parameters.resource_schedule
        : [],
    );
    expect(design.tasks).toHaveLength(2);
    expect(design.conditions[0]?.parameters.resource_schedule).toHaveLength(1);
  },
);

test("switching to reliance keeps existing agents and binds four real participants, then clears rules when leaving", () => {
  const environment: Environment = {
    ...catalog.environments[0],
    key: "reliance_commitments",
    measures: ["reliance_value"],
  };
  const changed = changeEnvironment(design, environment);
  expect(changed.profiles.map((p) => p.key)).toEqual([
    "a",
    "b",
    "agent-3",
    "agent-4",
  ]);
  expect(changed.profiles.slice(0, 2)).toEqual(design.profiles);
  const params = changed.conditions[0].parameters;
  expect(params.coordination?.turn_order).toEqual([
    "a",
    "b",
    "agent-3",
    "agent-4",
  ]);
  expect(params.coordination?.routes).toHaveLength(12);
  expect(params.commitments?.opportunities).toHaveLength(4);
  expect(params.commitments?.opportunities[0]).toEqual({
    key: "promise_1",
    promisor: "a",
    recipient: "b",
    artifact: "sealed_2",
    alternative: "share",
    opens_at: 2,
    deadline: 5,
    fulfilled_value: 9,
    unfulfilled_value: -5,
  });
  expect(
    params.artifacts?.objects.find((o) => o.key === "sealed_2"),
  ).toMatchObject({ owner: "b", readers: [], writers: [] });
  const left = changeEnvironment(changed, { ...environment, key: "commons" });
  expect(left.conditions[0].parameters.commitments).toBeNull();
  expect(left.conditions[0].parameters.coordination).toBeNull();
  expect(design.profiles).toHaveLength(2);
});

test("workflow switching binds the installed example to six real agents and clears it when leaving", () => {
  const source = {
    ...catalog.environments[0].source,
    definition: {
      ...catalog.environments[0].source.definition,
      environment: "institutional_workflow" as const,
      examples: [
        {
          key: "scarce",
          name: "Seven units",
          roles: ["alder", "birch", "cedar", "dune", "elm", "fern"],
          tasks: [],
          parameters: workflowRun.parameters,
        },
      ],
    },
  };
  const environment = {
    ...catalog.environments[0],
    key: "institutional_workflow" as const,
    source,
  };
  const changed = changeEnvironment(design, environment);
  expect(minimumParticipants("institutional_workflow")).toBe(6);
  expect(changed.profiles.map((p) => p.key)).toEqual([
    "a",
    "b",
    "agent-3",
    "agent-4",
    "agent-5",
    "agent-6",
  ]);
  const rules = changed.conditions[0].parameters.workflow;
  expect(rules?.turn_order).toEqual([
    "a",
    "b",
    "agent-3",
    "agent-4",
    "agent-5",
    "agent-6",
  ]);
  expect(rules?.conflict_order).toEqual([
    "b",
    "a",
    "agent-4",
    "agent-3",
    "agent-6",
    "agent-5",
  ]);
  expect(rules?.work_items[0]).toMatchObject({
    workers: ["a", "b"],
    handoff_to: ["agent-3", "agent-4"],
    resource_cost: 3,
    duration: 2,
  });
  expect(rules?.routes).toEqual([{ sender: "agent-5", recipient: "agent-6" }]);
  expect(changed.conditions[0].parameters.artifacts?.objects[0]).toMatchObject({
    readers: ["a", "b"],
    writers: ["a", "b"],
  });
  expect(changed.environment_source).toEqual(source);
  expect(
    changeEnvironment(changed, catalog.environments[0]).conditions[0].parameters
      .workflow,
  ).toBeNull();
  expect(workflowRun.parameters.workflow.turn_order[0]).toBe("alder");
  expect(design.profiles).toHaveLength(2);
});
