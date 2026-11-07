import type { Design, Parameters } from "@/lib/types";
export const parameters: Parameters = {
  endowment: 10,
  multiplier: 2,
  communication: true,
  communication_channels: ["messages"],
  memory: "notes",
  private_signal: false,
  task_count: 3,
  institution: {
    authorities: [],
    oversight: 0.5,
    sanction_cap: 5,
    transparent: true,
    appeal: true,
  },
  bargaining: { discount: 0.9, outside_option: 2 },
  information: { accuracy: 0.8, correct_reward: 10, reveal_outcome: true },
  resource: {
    capacity: 100,
    initial_stock: 50,
    regeneration: 0.1,
    extraction_limit: 10,
  },
  resource_schedule: [],
};

export const design: Design = {
  title: "Fixture",
  question: "Does oversight help?",
  hypothesis: "",
  environment: "institution",
  context: "",
  profiles: [
    { key: "a", name: "Alice", role: "Monitor", goal: "Observe", model: null },
    {
      key: "b",
      name: "Bob",
      role: "Participant",
      goal: "Contribute",
      model: null,
    },
  ],
  tasks: [
    { key: "first", name: "First", effort: 2, dependencies: [] },
    { key: "second", name: "Second", effort: 3, dependencies: ["first"] },
  ],
  conditions: [
    {
      key: "baseline",
      name: "Baseline",
      description: "",
      model: "openai:gpt-6-luna",
      parameters: {
        ...parameters,
        institution: { ...parameters.institution, authorities: ["a", "b"] },
        resource_schedule: [{ round: 2, endowment: 5 }],
      },
      profile_overrides: [
        {
          key: "a",
          name: "Alice",
          role: "Monitor",
          goal: "Enforce rules",
          model: null,
        },
      ],
    },
  ],
  seeds: [7],
  repetitions: 1,
  rounds: 3,
  budget_usd: 1,
  openai_reasoning_effort: null,
  response_tokens: 1024,
  limitations: [],
  measures: ["cooperation"],
};
