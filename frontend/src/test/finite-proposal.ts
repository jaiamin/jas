import type { FiniteContract } from "@/lib/types";
import { design, parameters } from "@/test/fixtures";
import externalContract from "../../../backend/tests/fixtures/t17_cosigned_escrow_contract.json";

// Synthetic HTTP view data only. This fixture cannot qualify/admit any artifact.
// The semantics are the independently frozen, pre-candidate external contract.
const checksum = "1".repeat(64);
const contract = externalContract as FiniteContract;
const { memory: _memory, ...mechanicalParameters } = parameters;
export const finiteSource = {
  format: "jas-environment-v9" as const,
  id: "1111111111111111",
  revision: 1,
  updated: "2026-11-10T00:00:00Z",
  sha256: checksum,
  definition: {
    version: 2 as const,
    name: "Co-signature DEVELOPMENT",
    description: "An independently reviewed finite synthesis profile.",
    environment: "reviewed_finite" as const,
    rule_version: "1.0.0",
    extension: {
      format: "jas-reviewed-finite-package-v1" as const,
      version: "1.0.0" as const,
      profile: "reviewed-finite-v1" as const,
      name: "Co-signature DEVELOPMENT",
      provenance:
        "UI-only DTO fixture; actual admission is a separate backend witness.",
      source:
        '(module (func (export "step") (param i32) (result i32) i32.const -1))',
      source_sha256: checksum,
      wasm_sha256: checksum,
      profile_sha256: checksum,
      contract: {
        format: "jas-reviewed-finite-contract-v1" as const,
        id: "2222222222222222",
        created: "2026-11-10T00:00:00Z",
        specification: {
          ...contract,
          format: "jas-finite-contract-v1" as const,
        },
        sha256: checksum,
      },
      review_id: "3333333333333333",
      artifact_check_id: "4444444444444444",
      admission_id: "5555555555555555",
      created: "2026-11-10T00:00:00Z",
      containment: {
        status: "qualified" as const,
        validation_enabled: true,
        execution_enabled: false,
        detail: "UI DTO only; not current runtime qualification.",
        fingerprint: checksum,
        case_sha256: checksum,
        wasmtime_version: "41.0.1",
        checks: [],
      },
      checks: [
        {
          stage: "external_full_domain",
          status: "passed" as const,
          detail:
            "180 literal inputs and 4 invalid encodings, each checked twice.",
        },
      ],
      verification: { fresh_instances: 368 },
      sha256: checksum,
    },
    examples: [
      {
        key: "consent",
        name: "Explicit consent",
        roles: ["initiator", "counterparty"],
        parameters: {
          ...mechanicalParameters,
          communication: false,
          communication_channels: [],
          finite: {
            bindings: { initiator: "initiator", counterparty: "counterparty" },
            private: { initiator: { docket: "consent-37" } },
          },
        },
        tasks: [],
      },
    ],
  },
};

export const finiteProposal = {
  ...design,
  title: "Co-signature review",
  question: "How do voluntary signatures change irrevocable release choices?",
  environment: "reviewed_finite" as const,
  environment_source: finiteSource,
  profiles: [
    {
      key: "member_1",
      name: "Initiator",
      role: "Choose freely",
      goal: "Inspect",
      model: null,
    },
    {
      key: "member_2",
      name: "Counterparty",
      role: "Choose freely",
      goal: "Inspect",
      model: null,
    },
  ],
  tasks: [],
  seeds: [23],
  rounds: 4,
  measures: ["finite_success"],
  limitations: [
    "Finite table conformance does not establish natural-language understanding.",
  ],
  conditions: [
    {
      ...design.conditions[0],
      profile_overrides: [],
      parameters: {
        ...parameters,
        communication: false,
        communication_channels: [],
        finite: {
          bindings: { initiator: "member_1", counterparty: "member_2" },
          private: { member_1: { docket: "consent-37" } },
        },
      },
    },
  ],
};
