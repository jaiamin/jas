import { act, fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import { ExposureInspection } from "./exposure-inspection";

function captured(condition: string, known = false) {
  return {
    version: 1,
    run_id: "run",
    through_turn: 3,
    capture: known ? "complete" : "unavailable",
    delivery: {
      confirmed_requests: 0,
      unknown_requests: 0,
      unsent_attempts: 0,
    },
    membership: { activations: [], requests: [], operations: {} },
    assignment: {
      condition_key: condition,
      condition_name: condition,
      revision: 1,
      design_sha256: "frozen",
      configuration: {},
      source: {
        href: "/api/studies/study?revision=1",
        pointer: "/design",
        label: "Revision 1",
      },
    },
    summary: [
      {
        kind: "message",
        eligible_participants: 2,
        exposed_participants: known ? 0 : null,
        confirmed_participants: 0,
        eligible_opportunities: 2,
        exposed_opportunities: known ? 0 : null,
        confirmed_opportunities: 0,
        unknown_opportunities: known ? 0 : 2,
      },
    ],
    opportunities: [],
    interpretation: [],
  };
}

test("exposure retry preserves unknown coverage and does not display a fabricated zero", async () => {
  let failing = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        failing
          ? Response.json(
              { detail: "Exposure evidence unavailable" },
              { status: 503 },
            )
          : Response.json(captured("Private disclosure")),
      ),
    ),
  );
  renderWithQueries(<ExposureInspection path="/runs/run/exposure" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Exposure evidence unavailable",
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry exposure" }));
  expect(
    await screen.findByText("Historical capture unavailable"),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("cell", { name: "Unknown · 0 confirmed / 2 eligible" }),
  ).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Revision 1" })).toHaveAttribute(
    "href",
    "/api/studies/study?revision=1",
  );
});

test("late exposure response cannot replace another selected record", async () => {
  const older = deferredResponse();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.includes("first")
        ? older.promise
        : Promise.resolve(Response.json(captured("Second condition", true))),
    ),
  );
  const view = renderWithQueries(
    <ExposureInspection path="/runs/first/exposure" />,
  );
  expect(
    screen.getByLabelText("Loading exposure evidence"),
  ).toBeInTheDocument();
  view.rerender(<ExposureInspection path="/runs/second/exposure" />);
  expect(await screen.findByText(/Second condition/)).toBeInTheDocument();
  await act(async () =>
    older.resolve(Response.json(captured("Old condition"))),
  );
  expect(screen.queryByText(/Old condition/)).not.toBeInTheDocument();
  expect(screen.getAllByRole("cell", { name: "0 / 2" })).toHaveLength(2);
});
