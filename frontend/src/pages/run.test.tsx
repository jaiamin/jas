import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { AssistantWorkspaceProvider } from "@/components/agent/assistant-workspace";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
import {
  exposureReport,
  runDetail,
  settings as settingsFixture,
} from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import Run from "./run";

test("recording playback only advances saved evidence and stops on pause, manual selection and navigation", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  let current = runDetail;
  const firstCheckpoint = deferredResponse();
  const fetch = vi.fn((path: string, _options?: RequestInit) => {
    if (path === "/api/settings")
      return Promise.resolve(Response.json(settingsFixture));
    if (path === "/api/runs") return Promise.resolve(Response.json([]));
    if (path === "/api/runs/run/turns/0") return firstCheckpoint.promise;
    if (path.includes("/turns/"))
      return Promise.resolve(
        Response.json({
          number: Number(path.split("/").at(-1)),
          checkpoint: runDetail.state,
          events: [],
        }),
      );
    return Promise.resolve(
      Response.json(path.endsWith("/second") ? runDetail : current),
    );
  });
  vi.stubGlobal("fetch", fetch);
  const view = renderWithQueries(
    <MemoryRouter initialEntries={["/runs/run"]}>
      <Link to="/runs/second">Other run</Link>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route path="/runs/:id" element={<Run />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Play recording" }),
  );
  expect(await screen.findByText("Viewing turn 0")).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(screen.getByText("Viewing turn 0")).toBeInTheDocument();
  await act(async () =>
    firstCheckpoint.resolve(
      Response.json({ number: 0, checkpoint: runDetail.state, events: [] }),
    ),
  );
  await screen.findByText("Viewing turn 1", {}, { timeout: 2000 });
  fireEvent.click(screen.getByRole("button", { name: "Pause recording" }));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(screen.getByText("Viewing turn 1")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
  await screen.findByText("Viewing turn 2", {}, { timeout: 2000 });
  expect(screen.getByRole("button", { name: "Play recording" })).toBeEnabled();

  current = { ...runDetail, summary: { ...runDetail.summary, turn: 3 } };
  act(() => view.client.setQueryData(["/runs/run"], current));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(screen.getByText("Viewing turn 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Previous recorded turn" }),
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(screen.getByText("Viewing turn 1")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Play recording" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.getByRole("button", { name: "Play recording" })).toBeEnabled();
  hidden.mockRestore();

  fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
  fireEvent.click(screen.getByRole("link", { name: "Other run" }));
  await waitFor(() =>
    expect(screen.getByText("Latest · turn 2")).toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "Play recording" })).toBeEnabled();
  expect(fetch.mock.calls.every(([path]) => !path.endsWith("/control"))).toBe(
    true,
  );
  expect(
    fetch.mock.calls.every(
      ([, options]) => options?.method === "GET" && options.body === undefined,
    ),
  ).toBe(true);
}, 12000);

test("an in-flight run control does not disable or report an error on another run", async () => {
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
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
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
            : path.endsWith("/exposure")
              ? Promise.resolve(Response.json(exposureReport))
              : Promise.resolve(
                  Response.json({
                    ...runDetail,
                    summary: {
                      ...runDetail.summary,
                      id: path.endsWith("/second") ? "second" : "run",
                    },
                  }),
                ),
    ),
  );
  renderWithQueries(
    <MemoryRouter initialEntries={["/runs/run"]}>
      <Link to="/runs/second?tab=settings">Other run</Link>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route path="/runs/:id" element={<Run />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Run" }));
  await openOtherRecord();
  expect(
    await screen.findByText("second", { selector: "code" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled();
  await act(async () => {
    control.resolve(
      Response.json({ detail: "First run is unavailable" }, { status: 503 }),
    );
  });
  expect(
    screen.queryByText(/First run is unavailable/),
  ).not.toBeInTheDocument();
});

for (const late of [false, true]) {
  test(`replay confirmation belongs to its run when completion is ${late ? "late" : "already visible"}`, async () => {
    const verification = deferredResponse();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) =>
        path.endsWith("/exposure")
          ? Promise.resolve(Response.json(exposureReport))
          : path.endsWith("/verify")
            ? verification.promise
            : Promise.resolve(
                Response.json({
                  ...runDetail,
                  summary: {
                    ...runDetail.summary,
                    id: path.endsWith("/second") ? "second" : "run",
                  },
                }),
              ),
      ),
    );
    const view = renderWithQueries(
      <MemoryRouter initialEntries={["/runs/run?tab=settings"]}>
        <Link to="/runs/second?tab=settings">Other run</Link>
        <AssistantWorkspaceProvider>
          <Routes>
            <Route path="/runs/:id" element={<Run />} />
          </Routes>
        </AssistantWorkspaceProvider>
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Verify exact replay" }),
    );
    if (!late) {
      await act(async () =>
        verification.resolve(Response.json({ verified_turns: 2 })),
      );
      expect(
        await screen.findByText(/2 turns verified locally/),
      ).toBeInTheDocument();
    }
    act(() =>
      view.client.setQueryData(["/runs/second"], {
        ...runDetail,
        summary: { ...runDetail.summary, id: "second" },
      }),
    );
    await openOtherRecord();
    expect(
      await screen.findByText("second", { selector: "code" }),
    ).toBeInTheDocument();
    if (late)
      await act(async () =>
        verification.resolve(Response.json({ verified_turns: 2 })),
      );
    expect(
      screen.queryByText(/turns verified locally/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verify exact replay" }),
    ).toBeEnabled();
  });
}

async function openOtherRecord() {
  if (screen.queryByRole("dialog"))
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("link", { name: "Other run" }));
  await waitFor(() => {
    expect(
      screen.queryByRole("dialog") ||
        screen.queryByRole("button", { name: "Rules & evidence" }),
    ).not.toBeNull();
  });
  if (!screen.queryByRole("dialog"))
    fireEvent.click(screen.getByRole("button", { name: "Rules & evidence" }));
}
