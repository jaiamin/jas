import { fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
import { finiteProposal, finiteSource } from "@/test/finite-proposal";
import { catalog, settings as settingsFixture } from "@/test/fixtures";
import { renderWithQueries } from "@/test/queries";
import { DesignEditor } from "./design-editor";

afterEach(() => localStorage.clear());

test("pending finite proposal exposes independent rules, private ACLs, harness and limits before execution in the real shell", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const fetcher = vi.fn((path: string) => {
    if (path === "/api/settings")
      return Promise.resolve(Response.json(settingsFixture));
    if (path === "/api/runs") return Promise.resolve(Response.json([]));
    throw new Error(
      `Review must not send an execution/generation request: ${path}`,
    );
  });
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter initialEntries={["/new?plan=pending-finite"]}>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route
            path="/new"
            element={
              <DesignEditor
                initialMode="visual"
                initial={finiteProposal}
                catalog={catalog}
                studyId={null}
                planId="pending-finite"
                draftPath="/new?plan=pending-finite"
                initialStep="review"
              />
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  const review = within(
    await screen.findByRole("region", { name: "Experiment review" }),
  );
  expect(
    review.getByRole("heading", { name: "Co-signature review" }),
  ).toBeInTheDocument();
  fireEvent.click(
    review.getByRole("button", { name: "Generated mechanics and checks" }),
  );
  const mechanics = within(
    review.getByRole("region", { name: "Independent finite contract" }),
  );
  expect(
    mechanics.getByText(
      finiteSource.definition.extension.contract.specification.requirements,
    ),
  ).toBeInTheDocument();
  expect(
    mechanics.getByText(/full external transition table is a prerequisite/i),
  ).toBeInTheDocument();
  expect(
    mechanics.getByText(/dynamic information.*external systems.*unsupported/i),
  ).toBeInTheDocument();
  const permissions = within(
    mechanics.getByRole("table", { name: "Finite operation permissions" }),
  );
  expect(
    permissions.getByRole("row", { name: "release initiator" }),
  ).toBeInTheDocument();
  expect(
    permissions.getByRole("row", { name: "sign counterparty" }),
  ).toBeInTheDocument();
  expect(
    mechanics.getByText("Credits + escrow + spent = 2."),
  ).toBeInTheDocument();
  expect(
    mechanics.getByText(/horizon.*ends unsuccessfully.*no implicit refund/i),
  ).toBeInTheDocument();
  expect(
    mechanics.getByText(/each actor.*own private fields.*observations/i),
  ).toBeInTheDocument();
  expect(
    review.getByText("initiator → member_1; counterparty → member_2"),
  ).toBeInTheDocument();
  expect(review.getByText("member_1 · docket: consent-37")).toBeInTheDocument();
  expect(review.getByText(/Direct action.*v1.0.0/)).toBeInTheDocument();
  expect(
    review.getByText(/1 requests.*0 operations per activation/),
  ).toBeInTheDocument();
  expect(
    review.getByText("Rounds per run").nextElementSibling,
  ).toHaveTextContent("4");
  expect(
    review.getByText("Spending ceiling").nextElementSibling,
  ).toHaveTextContent("$1.00");
  expect(
    screen.getByRole("button", { name: "Create experiment" }),
  ).toBeEnabled();
  expect(
    fetcher.mock.calls.every(([path]) =>
      ["/api/runs", "/api/settings"].includes(path),
    ),
  ).toBe(true);
  expect(
    screen.queryByText("This view could not load"),
  ).not.toBeInTheDocument();
});
