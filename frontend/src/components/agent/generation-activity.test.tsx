import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { ResearchArtifact } from "@/lib/types";
import { frozenAuthoringContract } from "@/test/finite-authoring";
import {
  draftQuestion,
  generationWorkspace,
} from "@/test/generation-workspace";

const recordedGeneration = {
  id: "7777777777777777",
  chat_id: "first",
  question: draftQuestion,
  purpose: "general",
  status: "complete",
  output: {
    answer:
      "The generated protocol is pending your review. No participants ran.",
    activity: ["discovering", "generating", "writing"],
  },
  error: null,
  cutoffs: {},
  created: "2026-11-10T18:30:00Z",
  study_id: null,
  run_id: null,
  usage: {
    requests: 5,
    input_tokens: 500,
    output_tokens: 200,
    cost_usd: 0.0123,
    partial: false,
  },
  generation: {
    authorization: {
      contract_id: "2222222222222222",
      max_candidates: 2,
      max_requests: 8,
      max_output_tokens: 1024,
      max_input_bytes: 32000,
      budget_usd: 0.25,
    },
    contract: frozenAuthoringContract,
    requests: 5,
    candidates: 2,
    charged_usd: 0.0123,
  },
};

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

test("pending generation names the actual public generation stage", async () => {
  const { writes } = generationWorkspace({
    initial: "/agent?chat=first",
    messages: () => [
      {
        ...recordedGeneration,
        status: "pending",
        output: { stage: "generating", partial: "" },
      },
    ],
  });
  expect(
    await screen.findByRole("heading", { name: draftQuestion }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Generating checked mechanics",
  );
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  expect(writes).toEqual([]);
});

test("recorded generation allowance and charged work remain inspectable after reload", async () => {
  const { writes } = generationWorkspace({
    initial: "/agent?chat=first",
    messages: () => [recordedGeneration],
  });
  expect(
    await screen.findByText(
      "The generated protocol is pending your review. No participants ran.",
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Activity" }));
  fireEvent.click(screen.getByRole("button", { name: "Generation allowance" }));
  expect(
    screen.getByText("5/8 model requests · 2/2 candidate attempts"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("$0.012300 charged · $0.25 ceiling"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("1024 output tokens · 32000 input bytes per request"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Unknown usage keeps its reservation/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Frozen generation contract" }),
  ).toHaveAttribute("href", "/api/extensions/contracts/2222222222222222");
  expect(
    screen.getByRole("link", { name: "Frozen generation contract" }),
  ).toHaveAttribute("title", `SHA-256 ${"2".repeat(64)}`);
  expect(writes).toEqual([]);
});

test("failed and explicitly repaired generation activity exposes immutable public source records", async () => {
  const operations: ResearchArtifact[] = [
    {
      id: "first-operation",
      request: { kind: "generate_extension", contract_id: "2222222222222222" },
      status: "rejected",
      summary:
        "First candidate failed the independent external table. No participants ran.",
      data: {
        id: "8888888888888888",
        contract_id: "2222222222222222",
        stop_reason: "external_check_failed",
        repair_of: null,
      },
      sources: [
        {
          kind: "finite_contract",
          id: "2222222222222222",
          hash: "2".repeat(64),
        },
        {
          kind: "extension_generation",
          id: "8888888888888888",
          hash: "8".repeat(64),
        },
        {
          kind: "extension_review",
          id: "9999999999999999",
          hash: "9".repeat(64),
        },
        { kind: "finite_check", id: "aaaaaaaaaaaaaaaa", hash: "a".repeat(64) },
      ],
    },
    {
      id: "second-operation",
      request: {
        kind: "generate_extension",
        contract_id: "2222222222222222",
        repair_of: "8888888888888888",
      },
      status: "complete",
      summary:
        "Explicit repair admitted against the same table; pending user review, no participant execution.",
      data: {
        id: "bbbbbbbbbbbbbbbb",
        contract_id: "2222222222222222",
        stop_reason: "admitted_pending_review",
        repair_of: "8888888888888888",
      },
      sources: [
        {
          kind: "finite_contract",
          id: "2222222222222222",
          hash: "2".repeat(64),
        },
        {
          kind: "extension_generation",
          id: "bbbbbbbbbbbbbbbb",
          hash: "b".repeat(64),
        },
        {
          kind: "extension_review",
          id: "cccccccccccccccc",
          hash: "c".repeat(64),
        },
        { kind: "finite_check", id: "dddddddddddddddd", hash: "d".repeat(64) },
        {
          kind: "finite_admission",
          id: "eeeeeeeeeeeeeeee",
          hash: "e".repeat(64),
        },
      ],
    },
  ];
  const { writes } = generationWorkspace({
    initial: "/agent?chat=first",
    messages: () => [
      {
        ...recordedGeneration,
        output: {
          ...recordedGeneration.output,
          research: {
            version: 2,
            scope: {
              chat_id: "first",
              before: "2026-11-10T18:30:00Z",
              cutoffs: {},
              context_limit: 50,
            },
            operations,
            stop_reason: "planner_handoff",
          },
        },
      },
    ],
  });
  expect(
    await screen.findByText(recordedGeneration.output.answer),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Activity" }));
  const attempts = screen.getAllByRole("button", {
    name: "Generate checked mechanics",
  });
  expect(attempts).toHaveLength(2);
  fireEvent.click(attempts[0]);
  fireEvent.click(attempts[1]);
  expect(screen.getByText(operations[0].summary)).toBeInTheDocument();
  expect(screen.getByText(operations[1].summary)).toBeInTheDocument();
  expect(
    screen.getByText(/"stop_reason": "external_check_failed"/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/"stop_reason": "admitted_pending_review"/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/"repair_of": "8888888888888888"/),
  ).toBeInTheDocument();
  expect(screen.getByText("Passed to protocol review")).toBeInTheDocument();
  for (const [label, paths] of [
    [
      "Source finite contract",
      ["contracts/2222222222222222", "contracts/2222222222222222"],
    ],
    [
      "Source generation attempt",
      ["generations/8888888888888888", "generations/bbbbbbbbbbbbbbbb"],
    ],
    [
      "Source executable review",
      ["reviews/9999999999999999", "reviews/cccccccccccccccc"],
    ],
    [
      "Source external check",
      ["finite-checks/aaaaaaaaaaaaaaaa", "finite-checks/dddddddddddddddd"],
    ],
    ["Source finite admission", ["finite-admissions/eeeeeeeeeeeeeeee"]],
  ] as const) {
    const links = screen.getAllByRole("link", { name: new RegExp(label) });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      paths.map((path) => `/api/extensions/${path}`),
    );
    for (const link of links)
      expect(link.getAttribute("title")).toMatch(/^SHA-256 [a-f0-9]{64}$/);
  }
  expect(writes).toEqual([]);
});
