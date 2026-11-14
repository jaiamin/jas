import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { Evidence } from "@/lib/types";
import { runDetail } from "@/test/fixtures";
import { RunViewer } from "./run-viewer";

test("agent perspective never renders another agent's private observation, world state or events", () => {
  const current: Evidence = {
    number: 4,
    round: 2,
    actor: "b",
    state_hash: null,
    observation: { your_note: "OTHER_OBSERVATION_CANARY" },
    decision: {
      action: {
        kind: "wait",
        amount: 0,
        target: "",
        message: "",
        report: null,
        promise: null,
      },
      rationale: "",
      memory: "",
      forecast: null,
    },
    checkpoint: {
      ...runDetail.state,
      notes: { b: "OTHER_WORLD_CANARY" },
      balances: { a: 3, b: 98123 },
    },
    events: [],
  };
  const personal: Evidence = {
    ...current,
    number: 2,
    actor: "a",
    observation: { your_note: "OWN_NOTE", your_balance: 3 },
    events: [
      {
        id: 1,
        turn: 2,
        round: 1,
        kind: "message",
        actor: "b",
        target: "b",
        visibility: "private",
        text: "OTHER_EVENT_CANARY",
        data: {},
      },
      {
        id: 2,
        turn: 2,
        round: 1,
        kind: "message",
        actor: "b",
        target: "a",
        visibility: "private",
        text: "ADDRESSED_TO_ME",
        data: {},
      },
    ],
  };
  const view = render(
    <RunViewer
      run={runDetail}
      turn={4}
      evidence={current}
      perspective="a"
      perspectiveEvidence={personal}
      onPerspective={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Full observation" }));
  expect(view.container).toHaveTextContent("OWN_NOTE");
  expect(view.container).toHaveTextContent("ADDRESSED_TO_ME");
  expect(view.container).toHaveTextContent(
    "Last observation for this agent, at turn 2",
  );
  for (const forbidden of [
    "OTHER_OBSERVATION_CANARY",
    "OTHER_WORLD_CANARY",
    "OTHER_EVENT_CANARY",
    "98123",
  ])
    expect(view.container).not.toHaveTextContent(forbidden);
  expect(
    screen.queryByRole("complementary", { name: "World and metrics" }),
  ).not.toBeInTheDocument();
});
