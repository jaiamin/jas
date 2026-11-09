import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { RecordSearch } from "@/components/record-list-heading";
import { RunTable } from "@/components/run-table";
import { useRecordFilters } from "@/hooks/use-record-filters";
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
function RunTableFixture() {
  const filters = useRecordFilters();
  return (
    <MemoryRouter>
      <RecordSearch
        label="Search runs"
        value={filters.search}
        onChange={filters.setSearch}
      />
      <RunTable runs={runs} filters={filters} selectable />
    </MemoryRouter>
  );
}

test("run selection survives filtering while comparison accepts only two to four runs", () => {
  render(<RunTableFixture />);
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
  fireEvent.click(screen.getByLabelText(/^Select Condition 3, seed 3,/));
  expect(
    screen.getByRole("button", { name: "Compare up to 4 runs" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("checkbox", { name: "Select all runs on this page" }),
  ).toBeChecked();
  fireEvent.click(screen.getByLabelText(/^Select Condition 3, seed 3,/));
  expect(
    screen.getByRole("checkbox", { name: "Select all runs on this page" }),
  ).toHaveAttribute("aria-checked", "mixed");
  expect(screen.getByRole("link", { name: "Compare 4 runs" })).toHaveAttribute(
    "href",
    "/compare?runs=run-0,run-4,run-1,run-2",
  );
});

test("select all respects the current filter and preserves selections outside it", () => {
  render(<RunTableFixture />);
  fireEvent.click(screen.getByLabelText(/^Select Condition 0, seed 0,/));
  fireEvent.change(screen.getByRole("textbox", { name: "Search runs" }), {
    target: { value: "Other" },
  });
  const all = screen.getByRole("checkbox", {
    name: "Select all runs on this page",
  });
  fireEvent.click(all);
  expect(screen.getByRole("link", { name: "Compare 2 runs" })).toHaveAttribute(
    "href",
    "/compare?runs=run-0,run-4",
  );
  fireEvent.click(all);
  expect(
    screen.getByLabelText(/^Select Condition 4, seed 4,/),
  ).not.toBeChecked();
  fireEvent.change(screen.getByRole("textbox", { name: "Search runs" }), {
    target: { value: "" },
  });
  expect(screen.getByLabelText(/^Select Condition 0, seed 0,/)).toBeChecked();
  expect(all).toHaveAttribute("aria-checked", "mixed");
});
