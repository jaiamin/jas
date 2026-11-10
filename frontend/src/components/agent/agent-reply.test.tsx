import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Analysis } from "@/lib/types";
import { design } from "@/test/fixtures";
import { AgentReply } from "./agent-reply";

// jsdom has no media/visibility APIs; real animation is exercised in browser tests.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

const row: Analysis = {
  id: "answer",
  purpose: "analysis",
  question: "What happened?",
  status: "pending",
  output: {
    partial: "Unvalidated draft",
    answer: "Validated answer",
    citations: [{ run_id: "run", turn: 3 }],
  },
  error: null,
  cutoffs: { run: 3 },
  created: "2026-11-07",
  study_id: "study",
  run_id: "run",
};

test("activity exposes hypothetical operation sources, results and the stop reason", () => {
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{
            ...row,
            purpose: "general",
            status: "complete",
            output: {
              answer: "The hypothetical split is five and nine.",
              activity: ["probing", "writing"],
              research: {
                version: 1,
                scope: {
                  chat_id: "chat",
                  before: "2026-11-10",
                  cutoffs: { run: 1 },
                  context_limit: 50,
                },
                stop_reason: "request_limit",
                operations: [
                  {
                    id: "artifact",
                    request: { kind: "probe" },
                    status: "complete",
                    summary: "A copied world accepted the offer.",
                    sources: [
                      { kind: "run", id: "run", turn: 1, hash: "source-hash" },
                    ],
                    data: { hypothetical: true, outcome: { balances: [5, 9] } },
                  },
                ],
              },
            },
          }}
          disabled={false}
          onRetry={() => {}}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Activity" }));
  expect(screen.getByText("Request limit reached")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "World probe" }));
  expect(
    screen.getByText("A copied world accepted the offer."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Source turn 1/ })).toHaveAttribute(
    "href",
    "/runs/run?turn=1&tab=decisions",
  );
  expect(screen.getByText(/"hypothetical": true/)).toBeInTheDocument();
});

test("only completion replaces pending prose and publishes citation links", () => {
  const onRetry = vi.fn();
  const view = render(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply row={row} disabled={false} onRetry={onRetry} />
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText("Unvalidated draft")).toBeInTheDocument();
  expect(screen.queryByText("Validated answer")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Turn 3" }),
  ).not.toBeInTheDocument();
  view.rerender(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{ ...row, status: "complete" }}
          disabled={false}
          onRetry={onRetry}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(screen.queryByText("Unvalidated draft")).not.toBeInTheDocument();
  expect(screen.getByText("Validated answer")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Turn 3" })).toHaveAttribute(
    "href",
    "/runs/run?turn=3&tab=decisions",
  );
  view.rerender(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{ ...row, status: "failed", error: "Interrupted" }}
          disabled={false}
          onRetry={onRetry}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(screen.queryByText("Unvalidated draft")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});

test("findings expose contradictory assertions without certifying their wording", () => {
  const reanalyze = vi.fn();
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{
            ...row,
            status: "complete",
            output: {
              answer: "The total was 440.",
              lens: {
                version: 1,
                key: "behavior",
                name: "Recorded behavior",
                inputs_sha256: "hash",
                requirements: ["cutoff_checkpoint"],
                limitations: ["One fixed seed."],
                account: [
                  {
                    run_id: "run",
                    turn: 3,
                    text: "3 recorded decisions; cumulative utility 44.",
                  },
                ],
                calculations: [
                  {
                    id: "run:run:total_utility",
                    label: "Recorded total utility",
                    value: 44,
                    scope: "captured_run",
                    formula: "sum(balances.values())",
                    inputs: { balances: { alex: 22, morgan: 22 } },
                    sources: [],
                    assumptions: [],
                  },
                ],
                coverage: {
                  planned_cells: 1,
                  failed_cells: 0,
                  nonterminal_cells: 0,
                  not_captured_cells: 0,
                  runs: [],
                },
              },
              support: {
                version: 1,
                status: "contradicted",
                prose_status: "unassessed",
                limitation: "Wording requires review.",
                claims: [
                  {
                    kind: "calculation",
                    text: "The total was 440.",
                    calculation_id: "run:run:total_utility",
                    value: 440,
                    computed: 44,
                    status: "contradicted",
                    scope: "captured_run",
                    reason: "Only the value is checked.",
                  },
                ],
              },
            },
          }}
          disabled={false}
          onRetry={() => {}}
          onReanalyze={reanalyze}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(
    screen.getByText("3 recorded decisions; cumulative utility 44."),
  ).toBeVisible();
  expect(screen.getByText("Wording unassessed")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Evidence & claim status" }),
  );
  expect(screen.getByText("Contradicted")).toBeVisible();
  expect(screen.getByText("Claimed 440 · computed 44")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Reanalyze communication" }),
  );
  expect(reanalyze).toHaveBeenCalledWith("communication");
});

test("completed replies retain their recorded public activity in a collapsed disclosure", () => {
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{
            ...row,
            purpose: "general",
            status: "complete",
            output: {
              answer: "Validated answer",
              activity: ["answering", "writing"],
            },
          }}
          disabled={false}
          onRetry={() => {}}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  const activity = screen.getByRole("button", { name: "Activity" });
  expect(activity).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(activity);
  expect(screen.getByText("Thinking")).toBeVisible();
  expect(screen.getByText("Writing")).toBeVisible();
});

test("proposal draft notes stay out of the answer and remain available in activity", () => {
  const notes =
    "Supported: finite_stock maps directly. No preflight evidence was supplied.";
  const summary =
    "Compare resource conditions using matched seeds before reviewing the protocol.";
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{
            ...row,
            purpose: "design",
            status: "complete",
            output: {
              supported: true,
              design,
              summary,
              explanation: notes,
              activity: ["scoping", "drafting", "checking", "reviewing"],
            },
          }}
          disabled={false}
          onRetry={() => {}}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(summary)).toBeVisible();
  expect(screen.queryByText(notes)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Protocol reviewed" }));
  fireEvent.click(
    screen.getByRole("button", {
      name: "Draft notes (before checks)",
    }),
  );
  expect(screen.getByText(notes)).toBeVisible();
});

test("design drafting does not publish unvalidated notes as answer prose", () => {
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply
          row={{
            ...row,
            purpose: "design",
            output: {
              stage: "drafting",
              partial: "No preflight tool was supplied.",
            },
          }}
          disabled={false}
          onRetry={() => {}}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(
    screen.queryByText("No preflight tool was supplied."),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Drafting the protocol")).toBeVisible();
});

test("live activity stays open when the reply finishes so its content remains readable", () => {
  const pending: Analysis = {
    ...row,
    purpose: "design",
    output: {
      stage: "checking",
      activity: ["scoping", "drafting", "checking"],
      planning: {
        sources: [],
        brief: {
          operationalization: "Compare cooperation under two resource levels.",
          size_rationale: "A small matched pilot.",
        },
      },
    },
  };
  const reply = (value: Analysis) => (
    <MemoryRouter>
      <TooltipProvider>
        <AgentReply row={value} disabled={false} onRetry={() => {}} />
      </TooltipProvider>
    </MemoryRouter>
  );
  const view = render(reply(pending));
  const activity = screen.getByRole("button", { name: "Checking mechanics" });
  expect(activity).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.queryByRole("button", { name: "Study scope" }),
  ).not.toBeInTheDocument();
  fireEvent.click(activity);
  fireEvent.click(screen.getByRole("button", { name: "Study scope" }));
  expect(
    screen.getByText("Compare cooperation under two resource levels."),
  ).toBeVisible();
  view.rerender(
    reply({
      ...pending,
      status: "complete",
      output: {
        ...pending.output,
        supported: true,
        design,
        summary: "A reviewed comparison.",
      },
    }),
  );
  expect(
    screen.getByText("Compare cooperation under two resource levels."),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Protocol reviewed" }),
  ).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("button", { name: "Protocol reviewed" }));
  expect(
    screen.queryByText("Compare cooperation under two resource levels."),
  ).not.toBeInTheDocument();
});
