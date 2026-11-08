import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { ExperimentPreflight } from "@/lib/types";
import { ExperimentCheck } from "./experiment-check";

test("mechanical findings never certify an unassessed question", () => {
  const report: ExperimentPreflight = {
    status: "checked",
    probe_turns: 60,
    comparisons: [],
    issues: [],
    limits: "First seed only.",
  };
  render(<ExperimentCheck report={report} />);
  expect(screen.getByText("No mechanical issues found")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Review scope and question mapping" }),
  );
  expect(
    screen.getByText(/Question fidelity has not been checked/),
  ).toBeInTheDocument();
  expect(screen.getByText("First seed only.")).toBeInTheDocument();
});

test("an unavailable construct stays visible with its source question", () => {
  render(
    <ExperimentCheck
      report={{
        status: "blocked",
        probe_turns: 9,
        comparisons: [],
        limits: "Bounded.",
        original_question: "Does stock transparency help?",
        question_mapping: [
          {
            source: "stock transparency",
            capability: "stock_visibility",
            mapping: "missing",
            explanation: "Stock is always visible.",
          },
        ],
        issues: [
          {
            code: "missing_construct",
            severity: "error",
            message: "Missing stock visibility.",
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("Resolve before execution")).toBeInTheDocument();
  expect(screen.getByText("Does stock transparency help?")).toBeInTheDocument();
  expect(screen.getByText("Stock is always visible.")).toBeInTheDocument();
  expect(screen.getByText("missing")).toBeInTheDocument();
});
