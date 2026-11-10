import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithQueries } from "@/test/queries";
import { InvestigationProgress } from "./investigation-progress";

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test("stopped investigation keeps clarification, attempt identity and a rejected repair draft", async () => {
  const record = {
    id: "bounded",
    chat_id: "parent-chat",
    study_id: "study",
    status: "stopped",
    stage: "design",
    stop_reason: "material_ambiguity_or_unsupported_scope",
    clarification: "Which accessible record should be described?",
    analysis: null,
    authorization: {
      question: "Describe an artifact trajectory",
      environments: ["artifact_workspace"],
      harnesses: ["direct_action"],
      intent: "exploratory",
      researcher_model: "openai:gpt-6.1-sol",
      participant_model: "openai:gpt-6-luna",
      budget_usd: 1,
      study_budget_usd: 1,
      max_requests: 16,
      max_runs: 2,
      max_turns: 14,
      max_agents: 1,
      max_rounds: 7,
      max_operations: 32,
      max_design_attempts: 2,
      pilot: false,
      adapt_after_pilot: false,
      stopping: "scope_ambiguity_allowance_or_failure",
    },
    requests: 1,
    runs: 0,
    turns: 0,
    operations: 1,
    charged_usd: 0.0007,
    study_charged_usd: 0.0007,
    study_budget_usd: 1,
    usage: { partial: false },
    decisions: [],
    confirmation: null,
    result: null,
    ledger: [],
    attempts: [
      {
        design_id: "ambiguous-design",
        chat_id: "design-chat",
        kind: "exploratory",
        revision: null,
        run_ids: [],
        status: "stopped",
        adaptation: null,
      },
    ],
  };
  const requests: { path: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        requests.push({ path, body: JSON.parse(String(init.body)) });
        return Response.json(
          { detail: "The original allowance is exhausted" },
          { status: 422 },
        );
      }
      return Response.json(record);
    }),
  );
  renderWithQueries(
    <MemoryRouter>
      <InvestigationProgress id="bounded" />
    </MemoryRouter>,
  );
  expect(await screen.findByText(record.clarification)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Exploratory · design attempt/ }),
  );
  expect(
    screen.getByRole("link", { name: "Inspect design attempt" }),
  ).toHaveAttribute("href", "/agent?chat=design-chat");
  const instruction = screen.getByLabelText("Adaptation instruction");
  fireEvent.change(instruction, {
    target: { value: "Describe only the accessible measurement." },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Adapt within remaining allowance" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The original allowance is exhausted",
  );
  expect(instruction).toHaveValue("Describe only the accessible measurement.");
  expect(requests).toEqual([
    {
      path: "/api/investigations/bounded/adapt",
      body: { instruction: "Describe only the accessible measurement." },
    },
  ]);
  expect(sessionStorage.getItem("jas:investigation-adaptation:bounded")).toBe(
    "Describe only the accessible measurement.",
  );
});
