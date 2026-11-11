import type { ExtensionRuntime, Settings } from "@/lib/types";
import contract from "../../../backend/tests/fixtures/t17_cosigned_escrow_contract.json";

// Synthetic HTTP DTOs, not freeze/admission/runtime qualification witnesses.
// The input contract is the unchanged, independently reviewed DEVELOPMENT fixture.
export const authoringContract = contract;
export const frozenAuthoringContract = {
  format: "jas-reviewed-finite-contract-v1",
  id: "2222222222222222",
  created: "2026-11-10T18:30:00Z",
  specification: contract,
  sha256: "2".repeat(64),
};

export const authoringRuntime: ExtensionRuntime = {
  status: "qualified",
  validation_enabled: true,
  execution_enabled: true,
  detail: "Synthetic current-runtime response for the UI dispatch test only.",
  fingerprint: "3".repeat(64),
  case_sha256: "4".repeat(64),
  wasmtime_version: "50.0.1",
  checks: [],
};

// Schema documentation is public boundary data. Neither this schema nor UI
// parsing replaces server validation or the independently literal full table.
export const authoringProfile = {
  profile: "reviewed-finite-v1",
  prerequisite:
    "Independently user-authored, reviewed, frozen exhaustive finite table.",
  interpretation:
    "Conformance to an external finite table, not independently understood intent.",
  finite_input_limit: 256,
  invalid_inputs: [-1, "domain_size", 2147483647, -2147483648],
  supported: [
    "deterministic role/state/credit transitions",
    "conserved resource/escrow",
    "static actor-private facts",
    "fixed role order",
    "terminal or bounded horizon",
  ],
  unsupported: [
    "dynamic information policy",
    "richer world semantics",
    "host imports",
    "external systems",
    "native code",
    "arbitrary programs",
  ],
  candidate_self_tests_admit: false,
  requires_current_runtime: true,
  requires_separate_participant_execution: true,
  contract_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "format",
      "name",
      "provenance",
      "requirements",
      "roles",
      "states",
      "operations",
      "initial_state",
      "initial_credits",
      "total_resource",
      "max_credits",
      "table",
    ],
    properties: {
      format: { type: "string", const: "jas-finite-contract-v1" },
      name: { type: "string", minLength: 1, maxLength: 120 },
      provenance: { type: "string", minLength: 1, maxLength: 2000 },
      requirements: { type: "string", minLength: 1, maxLength: 8000 },
      roles: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: { type: "string" },
      },
      states: {
        type: "array",
        minItems: 1,
        maxItems: 32,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "escrow", "status"],
          properties: {
            key: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
            escrow: { type: "integer", minimum: 0, maximum: 255 },
            status: { type: "string", enum: ["running", "success", "failure"] },
          },
        },
      },
      operations: {
        type: "array",
        minItems: 1,
        maxItems: 16,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "roles"],
          properties: {
            key: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
            roles: {
              type: "array",
              minItems: 1,
              maxItems: 12,
              items: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
            },
          },
        },
      },
      initial_state: { type: "integer", minimum: 0, maximum: 31 },
      initial_credits: { type: "integer", minimum: 0, maximum: 255 },
      total_resource: { type: "integer", minimum: 1, maximum: 255 },
      max_credits: { type: "integer", minimum: 0, maximum: 255 },
      table: {
        type: "array",
        minItems: 1,
        maxItems: 256,
        items: { type: "integer" },
      },
    },
  },
  authorization_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "contract_id",
      "max_candidates",
      "max_requests",
      "max_output_tokens",
      "max_input_bytes",
      "budget_usd",
    ],
    properties: {
      contract_id: { type: "string", pattern: "^[a-f0-9]{16}$" },
      max_candidates: { type: "integer", minimum: 1, maximum: 3 },
      max_requests: { type: "integer", minimum: 1, maximum: 12 },
      max_output_tokens: { type: "integer", minimum: 512, maximum: 16384 },
      max_input_bytes: { type: "integer", minimum: 4096, maximum: 180000 },
      budget_usd: { type: "number", minimum: 0.01, maximum: 10 },
    },
  },
};

export const authoringSettings: Settings = {
  planner_model: "openai:gpt-6.1-sol",
  assistant_model: "openai:gpt-6.1-sol",
  providers: { openai: true, anthropic: false },
  models: [],
  budget_usd: 10,
  charged_usd: 0,
  usage: {
    requests: 0,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    partial: false,
  },
  storage: "sqlite",
  concurrent_runs: 1,
  concurrent_requests: 1,
  mode: "local",
};
