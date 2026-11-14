import { act, fireEvent, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { AssistantWorkspaceProvider } from "@/components/agent/assistant-workspace";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
import type { StudyDetail } from "@/lib/types";
import {
  design,
  runDetail,
  settings as settingsFixture,
} from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import Study from "./study";

const study: StudyDetail = {
  estimate: { runs: 2, max_requests: 8, upper_usd: 0.5 },
  preflight: {
    status: "checked",
    issues: [],
    comparisons: [],
    probe_turns: 6,
    limits: "Mechanical checks only.",
  },
  id: "study",
  design,
  revision: 1,
  sha256: "fixture",
  plan_id: null,
  created: "2026-11-07",
  revisions: [{ number: 1, created: "2026-11-07", sha256: "fixture" }],
  runs: [],
  comparison: {
    version: 1,
    revision: 1,
    design_sha256: "fixture",
    matching_unit: "Immutable revision × seed × repetition",
    inference_unit: "Seed cluster",
    independent_support: null,
    dependence: "Agents share histories",
    uncertainty_reason: "Sampling is not declared",
    selection_assumption: "Outcome-independent selection is unverified",
    conditions: [],
    cells: [],
  },
  results: [],
  effects: [],
  usage: runDetail.summary.usage,
};

function snapshot(statuses: string[]): StudyDetail {
  return {
    ...study,
    runs: statuses.map((status, i) => ({
      ...runDetail.summary,
      id: `run-${i}`,
      status,
    })),
  };
}

function renderStudy(path = "/experiments/study") {
  return renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <AssistantWorkspaceProvider>
        <Routes>
          <Route path="/experiments/:id" element={<Study />} />
        </Routes>
      </AssistantWorkspaceProvider>
    </MemoryRouter>,
  );
}

test("an in-flight experiment control belongs to the experiment that submitted it", async () => {
  const control = deferredResponse();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      path === "/api/settings"
        ? Promise.resolve(Response.json(settingsFixture))
        : path === "/api/runs"
          ? Promise.resolve(Response.json([]))
          : path.endsWith("/control")
            ? control.promise
            : Promise.resolve(
                Response.json(
                  path.includes("/exposure")
                    ? { runs: [] }
                    : {
                        ...snapshot(["ready"]),
                        design: {
                          ...design,
                          title: path.endsWith("/second")
                            ? "Second experiment"
                            : design.title,
                        },
                      },
                ),
              ),
    ),
  );
  renderWithQueries(
    <MemoryRouter initialEntries={["/experiments/study"]}>
      <Link to="/experiments/second">Other experiment</Link>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route path="/experiments/:id" element={<Study />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Run experiment" }),
  );
  fireEvent.click(screen.getByRole("link", { name: "Other experiment" }));
  expect(
    await screen.findByRole("heading", { name: "Second experiment" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run experiment" })).toBeEnabled();
  await act(async () => {
    control.resolve(
      Response.json(
        { detail: "First experiment is unavailable" },
        { status: 503 },
      ),
    );
  });
  expect(
    screen.queryByText(/First experiment is unavailable/),
  ).not.toBeInTheDocument();
});

test("mixed-run updates preserve status precedence and the appropriate execution control", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        Response.json(
          path.includes("/exposure")
            ? { runs: [] }
            : snapshot(["failed", "queued"]),
        ),
      ),
    ),
  );
  const view = renderStudy();
  expect(
    await screen.findByText("Running", { exact: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Pause experiment" }),
  ).toBeEnabled();
  expect(screen.getByRole("link", { name: "Watch live" })).toHaveAttribute(
    "href",
    "/runs/run-1",
  );
  for (const [statuses, expected] of [
    [["failed", "paused"], "Failed"],
    [["complete", "paused"], "Paused"],
    [["complete", "ready"], "Ready"],
  ] as const) {
    await act(async () => {
      view.client.setQueryData(["/studies/study"], snapshot([...statuses]));
    });
    expect(
      await screen.findByText(expected, {
        exact: true,
        selector: '[data-slot="badge"]',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run experiment" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("link", { name: "Watch live" }),
    ).not.toBeInTheDocument();
  }
  await act(async () => {
    view.client.setQueryData(
      ["/studies/study"],
      snapshot(["complete", "complete"]),
    );
  });
  expect(
    await screen.findByText("Complete", { exact: true }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /^(Run|Pause) experiment$/ }),
  ).not.toBeInTheDocument();
});

test("a failed pause retains the active state and its retry control", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, options: RequestInit) =>
      Promise.resolve(
        path.includes("/exposure")
          ? Response.json({ runs: [] })
          : options.method === "POST"
            ? Response.json({ detail: "Control unavailable" }, { status: 503 })
            : Response.json(snapshot(["pausing", "failed"])),
      ),
    ),
  );
  renderStudy();
  const pause = await screen.findByRole("button", { name: "Pause experiment" });
  fireEvent.click(pause);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Control unavailable",
  );
  expect(screen.getByText("Running", { exact: true })).toBeInTheDocument();
  expect(pause).toBeEnabled();
});

test("planned sample and lack of independent support remain inspectable without completed outcomes", async () => {
  const missing = {
    ...snapshot(["failed", "ready"]),
    comparison: {
      ...study.comparison,
      conditions: [
        {
          condition_key: "a",
          condition: "A",
          planned: 2,
          attempted: 1,
          complete: 0,
          failed: 1,
          interrupted: 0,
          ready: 1,
          in_progress: 0,
          not_captured: 0,
          excluded: 2,
          unmatched: 0,
          reasons: { "Provider failed": 1 },
        },
      ],
      cells: [
        {
          run_id: "run-0",
          condition_key: "a",
          seed: 7,
          repetition: 1,
          status: "failed",
          through_turn: 0,
          attempted: true,
          reason: "Provider failed",
          metrics: {},
        },
      ],
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        Response.json(path.includes("/exposure") ? { runs: [] } : missing),
      ),
    ),
  );
  renderStudy();
  fireEvent.mouseDown(await screen.findByRole("tab", { name: "Results" }), {
    button: 0,
    ctrlKey: false,
  });
  const details = await screen.findByRole("button", {
    name: "Comparison & evidence",
  });
  expect(details).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Complete / planned")).not.toBeInTheDocument();
  expect(screen.queryByText("Complete / planned")).not.toBeInTheDocument();
  fireEvent.click(details);
  expect(await screen.findByText("Complete / planned")).toBeInTheDocument();
  expect(screen.getByText("0 / 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sample & uncertainty" }));
  expect(await screen.findByText("Provider failed")).toBeInTheDocument();
  expect(
    screen.getByText(/Independent support: not established/),
  ).toBeInTheDocument();
  expect(screen.getByText("Sampling is not declared")).toBeInTheDocument();
});
