import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import type { Event } from "@/lib/types";
import { runDetail, state } from "@/test/fixtures";
import { workflowRun, workflowState } from "@/test/workflow";
import { InteractionTable, RelationshipTable, WorldView } from "./world-view";

function event(
  kind: string,
  actor: string,
  target: string | null,
  data: Event["data"],
): Event {
  return {
    id: 1,
    turn: 1,
    round: 1,
    kind,
    actor,
    target,
    visibility: "public",
    text: "",
    data,
  };
}

test("commons presents the latest settled contributions without exposing sealed choices", () => {
  const onAgent = vi.fn();
  render(
    <WorldView
      run={{
        ...runDetail,
        design: { ...runDetail.design, environment: "commons" },
      }}
      state={{
        ...state,
        pending: {},
        history: [
          { round: 1, contributions: { a: 1, b: 1 } },
          { round: 2, contributions: { a: 3, b: 5 } },
          { round: 2, message: "Later non-settlement event" },
        ],
      }}
      events={[]}
      onAgent={onAgent}
    />,
  );
  expect(
    screen.getByText("Contributions from settled round 2"),
  ).toBeInTheDocument();
  expect(screen.getByText("3 / 10")).toBeInTheDocument();
  expect(screen.getByText("5 / 10")).toBeInTheDocument();
  expect(
    screen.getByText("Total contribution").parentElement,
  ).toHaveTextContent("8");
  fireEvent.click(screen.getByRole("button", { name: /Alice/ }));
  expect(onAgent).toHaveBeenCalledWith("a");
});

test("coordination attributes completed work and preserves dependency and progress evidence", () => {
  const onAgent = vi.fn();
  render(
    <WorldView
      run={{
        ...runDetail,
        design: { ...runDetail.design, environment: "coordination" },
      }}
      state={{
        ...state,
        tasks: [
          {
            key: "scope",
            name: "Scope",
            effort: 2,
            progress: 2,
            dependencies: [],
            completed_by: "a",
          },
          {
            key: "release",
            name: "Release",
            effort: 3,
            progress: 1,
            dependencies: ["scope"],
            completed_by: null,
          },
        ],
      }}
      events={[]}
      onAgent={onAgent}
    />,
  );
  expect(screen.getByText("1 of 2 work packages complete")).toBeInTheDocument();
  expect(screen.getByText("After scope")).toBeInTheDocument();
  expect(
    screen.getByRole("progressbar", { name: "Release 1 of 3" }),
  ).toHaveAttribute("aria-valuenow", "1");
  fireEvent.click(screen.getByRole("button", { name: "Alice" }));
  expect(onAgent).toHaveBeenCalledWith("a");
});

test("relationships aggregate directed transfers and exclude ineligible promises", () => {
  const events = [
    event("transfer", "a", "b", { amount: 3 }),
    event("transfer", "a", "b", { amount: 4 }),
    event("message", "a", "b", {}),
    event("transfer", "b", "a", { amount: 2 }),
    event("commitment_resolved", "a", null, {
      eligible: false,
      fulfilled: false,
    }),
    event("commitment_resolved", "a", null, {
      eligible: true,
      fulfilled: true,
    }),
    event("claim", "a", null, { accurate: false }),
    event("claim", "a", null, { accurate: true }),
  ];
  render(
    <>
      <InteractionTable
        profiles={runDetail.design.profiles}
        events={events}
        onAgent={vi.fn()}
      />
      <RelationshipTable profiles={runDetail.design.profiles} events={events} />
    </>,
  );
  const interactions = screen.getByRole("table", {
    name: "Directed agent interactions",
  });
  expect(
    within(interactions).getByRole("row", { name: "Alice Bob 7 3" }),
  ).toBeInTheDocument();
  expect(
    within(interactions).getByRole("row", { name: "Bob Alice 2 1" }),
  ).toBeInTheDocument();
  const alice = screen.getByRole("row", { name: "Alice 1 / 2 1 / 1 7" });
  expect(
    within(alice).getByRole("cell", { name: "1 / 1" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("row", { name: "Bob No reports No eligible promises 2" }),
  ).toBeInTheDocument();
});

test("workflow interactions count delivered messages and settled handoffs, with actor inspection", () => {
  const onAgent = vi.fn();
  const queued = event("message_queued", "a", "b", {});
  const rejected = event("workflow_conflict", "b", "a", {});
  const { rerender } = render(
    <InteractionTable
      profiles={runDetail.design.profiles}
      events={[queued, rejected]}
      onAgent={onAgent}
    />,
  );
  expect(screen.getByText("No interactions yet")).toBeInTheDocument();
  rerender(
    <InteractionTable
      profiles={runDetail.design.profiles}
      events={[
        queued,
        rejected,
        event("message_delivered", "a", "b", {}),
        event("handoff_work", "a", "b", {}),
        event("accept_handoff", "b", "a", {}),
      ]}
      onAgent={onAgent}
    />,
  );
  const table = screen.getByRole("table", {
    name: "Directed agent interactions",
  });
  const sent = within(table).getByRole("row", { name: "Alice Bob 0 2" });
  expect(
    within(table).getByRole("row", { name: "Bob Alice 0 1" }),
  ).toBeInTheDocument();
  fireEvent.click(within(sent).getByRole("button", { name: "Bob" }));
  expect(onAgent).toHaveBeenCalledWith("b");
});

test("institutional work shows real materials, owned delay and blocked dependencies without tables", () => {
  const onAgent = vi.fn();
  render(
    <MemoryRouter>
      <WorldView
        run={workflowRun}
        state={workflowState}
        events={[]}
        onAgent={onAgent}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "Institutional workflow" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("4 materials remaining · 3 spent"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Logical time 2 · 0 of 3 handoffs accepted"),
  ).toBeInTheDocument();
  const intake = screen.getByRole("region", { name: "Intake work" });
  expect(intake).toHaveTextContent("In progress");
  expect(intake).toHaveTextContent("Ready at logical time 3");
  expect(
    screen.getByRole("region", { name: "Release work" }),
  ).toHaveTextContent("Waiting for intake acceptance");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByText("private-mail-431")).not.toBeInTheDocument();
  fireEvent.click(within(intake).getByRole("button", { name: "Alder" }));
  expect(onAgent).toHaveBeenCalledWith("alder");
});

test("selected handoffs, privileged mail and artifact history stay explicit and cutoff scoped", () => {
  const handoff = {
    sender: "alder",
    recipient: "cedar",
    version: 2,
    sent_at: 3,
    accepted_at: null,
  };
  const checkpoint = {
    ...workflowState,
    logical_time: 4,
    read_grants: { cedar: ["intake_record"] },
    work: {
      ...workflowState.work,
      intake: {
        ...workflowState.work.intake,
        status: "handed_off" as const,
        handoff,
      },
    },
  };
  const conflict = {
    ...event("workflow_conflict", "birch", null, {
      reason: "Work already has an owner",
      request: { work: "intake" },
    }),
    visibility: "private",
    turn: 6,
  };
  render(
    <MemoryRouter>
      <WorldView
        run={workflowRun}
        state={checkpoint}
        events={[conflict]}
        onAgent={vi.fn()}
      />
    </MemoryRouter>,
  );
  const intake = screen.getByRole("region", { name: "Intake work" });
  expect(intake).toHaveTextContent(
    "Awaiting acceptance from Cedar · Version 2",
  );
  expect(
    screen.getByText("Logical time 4 · 0 of 3 handoffs accepted"),
  ).toBeInTheDocument();
  expect(screen.queryByText("private-mail-431")).not.toBeInTheDocument();
  expect(screen.queryByText("batch")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Artifact versions and access" }),
  );
  const record = screen.getByRole("region", { name: "Intake record versions" });
  expect(record).toHaveTextContent("Version 2");
  expect(record).toHaveTextContent("17");
  expect(record).toHaveTextContent("Additional read grants: Cedar");
  fireEvent.click(screen.getByRole("button", { name: "Addressed messages" }));
  expect(screen.getByText("private-mail-431")).toBeInTheDocument();
  expect(
    screen.getByText("Elm → Fern · Sent 0 · Delivered 2"),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Settlements and conflicts" }),
  );
  expect(
    screen.getByRole("link", { name: "Turn 6 · Birch · Workflow conflict" }),
  ).toHaveAttribute("href", expect.stringContaining("turn=6"));
  expect(screen.getByText("Work already has an owner")).toBeInTheDocument();
});

test("workflow artifact links use the actual settlement turn rather than operation priority", () => {
  const performed = {
    ...event("perform_work", "alder", null, {
      artifact: "intake_record",
      version: 2,
      operation: 8,
    }),
    turn: 12,
  };
  render(
    <MemoryRouter>
      <WorldView
        run={{ ...workflowRun, events: [performed] }}
        state={workflowState}
        events={[performed]}
        onAgent={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Artifact versions and access" }),
  );
  const record = screen.getByRole("region", { name: "Intake record versions" });
  expect(
    within(record).getByRole("link", { name: "Inspect turn 12" }),
  ).toHaveAttribute("href", expect.stringContaining("turn=12"));
  expect(
    within(record).queryByRole("link", { name: "Inspect turn 8" }),
  ).not.toBeInTheDocument();
});
