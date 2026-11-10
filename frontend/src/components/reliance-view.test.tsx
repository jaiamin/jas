import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import type { CommitmentOpportunity, RunDetail, State } from "@/lib/types";
import { parameters, runDetail, state } from "@/test/fixtures";
import { WorldView } from "./world-view";

test("researcher inspection separates actual recipient effects, unresolved promises and no promise", () => {
  const profiles = ["oak-7", "fen-2", "ash-9", "bay-4"].map((key) => ({
    key,
    name: key,
    goal: "Choose freely",
    role: "Participant",
    model: null,
  }));
  const first: CommitmentOpportunity = {
    key: "oak-fen",
    promisor: "oak-7",
    recipient: "fen-2",
    artifact: "sealed-fen",
    alternative: "share",
    opens_at: 2,
    deadline: 4,
    fulfilled_value: 13,
    unfulfilled_value: -7,
  };
  const run: RunDetail = {
    ...runDetail,
    design: {
      ...runDetail.design,
      environment: "reliance_commitments",
      profiles,
    },
    parameters: {
      ...parameters,
      artifacts: { objects: [], requirements: [], write_limit: 2 },
      coordination: {
        timing: "phased_simultaneous",
        turn_order: profiles.map((p) => p.key),
        conflict_order: profiles.map((p) => p.key),
        routes: [],
        delivery_delay: 2,
        alternatives: ["share", "keep"],
        information: {},
        match_bonus: 0,
      },
      commitments: {
        opportunities: [
          first,
          {
            ...first,
            key: "ash-bay",
            promisor: "ash-9",
            recipient: "bay-4",
            artifact: "sealed-bay",
            deadline: 8,
          },
          { ...first, key: "declined" },
        ],
      },
    },
  };
  const checkpoint: State = {
    ...state,
    artifacts: {},
    logical_time: 4,
    done: true,
    commitments: {
      "oak-fen": {
        key: "oak-fen",
        promisor: "oak-7",
        recipient: "fen-2",
        promised_at: 0,
        relied_at: 1,
        feasible_at_promise: true,
        opportunities: [2],
        fulfilled_at: 2,
        status: "fulfilled",
        eligible: true,
        resolved_at: 4,
      },
      "ash-bay": {
        key: "ash-bay",
        promisor: "ash-9",
        recipient: "bay-4",
        promised_at: 0,
        relied_at: 1,
        feasible_at_promise: true,
        opportunities: [2],
        fulfilled_at: null,
        status: "unresolved",
        eligible: false,
        resolved_at: null,
      },
    },
    read_grants: { "sealed-fen": ["oak-7"], "sealed-bay": ["ash-9"] },
    reliance_effects: { "oak-7": 0, "fen-2": 13, "ash-9": 0, "bay-4": 0 },
  };
  render(
    <MemoryRouter>
      <WorldView
        run={run}
        state={checkpoint}
        events={[
          {
            id: 1,
            turn: 16,
            round: 4,
            kind: "reliance_consequence",
            actor: "fen-2",
            target: null,
            visibility: "private",
            text: "Declared recipient effect settled.",
            data: { key: "oak-fen", value: 13, logical_time: 4 },
          },
        ]}
        onAgent={vi.fn()}
      />
    </MemoryRouter>,
  );
  const table = within(screen.getByLabelText("Commitment trajectory"));
  const fulfilled = table.getByRole("row", { name: /oak-fen/ });
  expect(
    within(fulfilled).getByText("Fulfilled", { exact: true }),
  ).toBeVisible();
  expect(fulfilled).toHaveTextContent("Recipient effect: 13");
  expect(fulfilled).toHaveTextContent("Eligible: yes");
  expect(fulfilled).toHaveTextContent("Read granted to oak-7");
  const unresolved = table.getByRole("row", { name: /ash-bay/ });
  expect(unresolved).toHaveTextContent("Unresolved");
  expect(unresolved).toHaveTextContent("Recipient effect: not settled");
  expect(unresolved).toHaveTextContent("Eligible: no");
  expect(table.getByRole("row", { name: /declined/ })).toHaveTextContent(
    "No promise",
  );
  expect(screen.getByText(/Researcher view includes private/)).toBeVisible();
});
