import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { Event } from "@/lib/types";
import { runDetail, state } from "@/test/fixtures";
import { RelationshipGraph, RelationshipTable, WorldView } from "./world-view";

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
      <RelationshipGraph
        profiles={runDetail.design.profiles}
        events={events}
        onAgent={vi.fn()}
      />
      <RelationshipTable profiles={runDetail.design.profiles} events={events} />
    </>,
  );
  expect(
    screen.getByText("Alice → Bob: 7 credits, 3 interactions", {
      selector: "title",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Bob → Alice: 2 credits, 1 interactions", {
      selector: "title",
    }),
  ).toBeInTheDocument();
  const alice = screen.getByRole("row", { name: "Alice 1 / 2 1 / 1 7" });
  expect(
    within(alice).getByRole("cell", { name: "1 / 1" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("row", { name: "Bob No reports No eligible promises 2" }),
  ).toBeInTheDocument();
});
