import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { RunTable } from "@/components/run-table";
import type { RunSummary } from "@/lib/types";

const runs: RunSummary[] = Array.from({ length: 5 }, (_, i) => ({
  id: `run-${i}`,
  study_id: "study",
  study_title: i === 4 ? "Other" : "Scarcity",
  revision: 1,
  condition: `Condition ${i}`,
  condition_key: `c${i}`,
  environment: "commons",
  model: "openai:gpt-6-luna",
  models: ["openai:gpt-6-luna"],
  status: "ready",
  turn: 0,
  round: 0,
  total_turns: 12,
  total_rounds: 3,
  seed: i,
  repetition: 1,
  created: "2026-11-07T00:00:00Z",
  error: null,
  usage: {
    requests: 0,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    partial: false,
  },
}));
test("run comparison preserves selections through filtering and caps selection at four", () => {
  render(
    <MemoryRouter>
      <RunTable runs={runs} selectable />
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Compare runs" })).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/^Select Condition 0, seed 0,/));
  fireEvent.change(screen.getByRole("textbox", { name: "Search runs" }), {
    target: { value: "Other" },
  });
  expect(
    screen.queryByRole("link", { name: "Condition 0" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/^Select Condition 4, seed 4,/));
  expect(screen.getByRole("link", { name: "Compare 2 runs" })).toHaveAttribute(
    "href",
    "/compare?runs=run-0,run-4",
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Search runs" }), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByLabelText(/^Select Condition 1, seed 1,/));
  fireEvent.click(screen.getByLabelText(/^Select Condition 2, seed 2,/));
  expect(screen.getByLabelText(/^Select Condition 3, seed 3,/)).toBeDisabled();
});
