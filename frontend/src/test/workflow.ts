import { runDetail, state } from "@/test/fixtures";

const actors = ["alder", "birch", "cedar", "dune", "elm", "fern"];
export const workflowRules = {
  timing: "phased_simultaneous" as const,
  turn_order: actors,
  conflict_order: ["birch", "alder", "dune", "cedar", "fern", "elm"],
  routes: [{ sender: "elm", recipient: "fern" }],
  delivery_delay: 2,
  resource_stock: 7,
  work_items: [
    {
      key: "intake",
      artifact: "intake_record",
      workers: ["alder", "birch"],
      dependencies: [],
      handoff_to: ["cedar", "dune"],
      resource_cost: 3,
      duration: 2,
    },
    {
      key: "release",
      artifact: "release_record",
      workers: ["cedar", "dune"],
      dependencies: ["intake"],
      handoff_to: ["elm", "fern"],
      resource_cost: 2,
      duration: 1,
    },
    {
      key: "audit",
      artifact: "audit_record",
      workers: ["elm", "fern"],
      dependencies: [],
      handoff_to: ["alder", "birch"],
      resource_cost: 4,
      duration: 1,
    },
  ],
};
const profiles = actors.map((key) => ({
  key,
  name: key[0].toUpperCase() + key.slice(1),
  goal: "Choose available work.",
  role: "",
  model: null,
}));
const objects = workflowRules.work_items.map((w) => ({
  key: w.artifact,
  name: `${w.key[0].toUpperCase()}${w.key.slice(1)} record`,
  owner: null,
  readers: w.workers,
  writers: w.workers,
  content: { batch: 0 },
}));
const workflowParameters = {
  ...runDetail.parameters,
  workflow: workflowRules,
  artifacts: { objects, write_limit: 20, requirements: [] },
};
export const workflowRun = {
  ...runDetail,
  design: {
    ...runDetail.design,
    environment: "institutional_workflow" as const,
    profiles,
    conditions: [
      { ...runDetail.design.conditions[0], parameters: workflowParameters },
    ],
  },
  parameters: workflowParameters,
};
export const workflowState = {
  ...state,
  rule_version: "1.0.0",
  logical_time: 2,
  resource_stock: 4,
  resource_spent: 3,
  writes_remaining: 19,
  pending_actions: {},
  pending_deliveries: [],
  work: {
    intake: {
      owner: "alder",
      status: "in_progress" as const,
      due_at: 3,
      artifact_version: 2,
      handoff: null,
    },
    release: {
      owner: null,
      status: "unclaimed" as const,
      due_at: null,
      artifact_version: null,
      handoff: null,
    },
    audit: {
      owner: null,
      status: "unclaimed" as const,
      due_at: null,
      artifact_version: null,
      handoff: null,
    },
  },
  artifacts: Object.fromEntries(
    objects.map((obj) => [
      obj.key,
      {
        ...obj,
        versions: [
          {
            version: 1,
            content: { batch: 0 },
            sources: [],
            author: null,
            operation: 0,
          },
          ...(obj.key === "intake_record"
            ? [
                {
                  version: 2,
                  content: { batch: 17 },
                  sources: [],
                  author: "alder",
                  operation: 8,
                },
              ]
            : []),
        ],
      },
    ]),
  ),
  inboxes: {
    fern: [
      {
        id: "elm:fern:1",
        sender: "elm",
        recipient: "fern",
        text: "private-mail-431",
        sent_at: 0,
        due_at: 2,
        delivered_at: 2,
      },
    ],
  },
  outcome: null,
};
