import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import type { Analysis } from "@/lib/types";
import { AgentReply } from "./agent-reply";

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

test("only completion replaces pending prose and publishes citation links", () => {
  const onRetry = vi.fn();
  const view = render(
    <MemoryRouter>
      <AgentReply row={row} disabled={false} onRetry={onRetry} />
    </MemoryRouter>,
  );
  expect(screen.getByText("Unvalidated draft")).toBeInTheDocument();
  expect(screen.queryByText("Validated answer")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Turn 3" }),
  ).not.toBeInTheDocument();
  view.rerender(
    <MemoryRouter>
      <AgentReply
        row={{ ...row, status: "complete" }}
        disabled={false}
        onRetry={onRetry}
      />
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
      <AgentReply
        row={{ ...row, status: "failed", error: "Interrupted" }}
        disabled={false}
        onRetry={onRetry}
      />
    </MemoryRouter>,
  );
  expect(screen.queryByText("Unvalidated draft")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});
