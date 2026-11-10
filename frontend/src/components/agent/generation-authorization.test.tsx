import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
import AgentPage from "@/pages/agent";
import {
  authoringContract,
  authoringProfile,
  authoringRuntime,
  authoringSettings,
  frozenAuthoringContract,
} from "@/test/finite-authoring";
import { catalog } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

// Frozen and UNRUN before UI implementation. This checks HTTP authorization
// dispatch, not real Sol output, freeze/admission, worker containment or competence.
test("the actual Agent shell freezes an external contract without sampling and sends generation authority only after an explicit bounded action", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  // jsdom has no viewport intersection API. Keep the decorative target offscreen;
  // the real AgentTarget and all authoring/authorization assertions still render.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      media,
      matches: false,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => true,
    })),
  );
  vi.stubGlobal(
    "EventSource",
    class {
      onmessage = null;
      onerror = null;
      close() {}
    },
  );
  const question =
    "Generate independently checked co-signature mechanics and a pending proposal; do not run participants.";
  const authorization = {
    contract_id: "2222222222222222",
    max_candidates: 1,
    max_requests: 6,
    max_output_tokens: 1024,
    max_input_bytes: 32000,
    budget_usd: 0.25,
  };
  const submitted = deferredResponse();
  const writes: { path: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        writes.push({ path, body: JSON.parse(String(init.body)) });
        if (path === "/api/extensions/contracts")
          return Promise.resolve(
            Response.json(frozenAuthoringContract, { status: 201 }),
          );
        if (path === "/api/chats") return submitted.promise;
        throw new Error(
          `Unexpected mutation; no participant/investigation authority: ${path}`,
        );
      }
      if (
        [
          "/api/runs",
          "/api/studies",
          "/api/chats",
          "/api/extensions/generations",
        ].includes(path)
      )
        return Promise.resolve(Response.json([]));
      if (path === "/api/catalog")
        return Promise.resolve(Response.json(catalog));
      if (path === "/api/settings")
        return Promise.resolve(Response.json(authoringSettings));
      if (path === "/api/extensions/profile")
        return Promise.resolve(Response.json(authoringProfile));
      if (path === "/api/extensions/runtime")
        return Promise.resolve(Response.json(authoringRuntime));
      if (path === "/api/extensions/contracts")
        return Promise.resolve(Response.json([]));
      if (path === "/api/extensions/contracts/2222222222222222")
        return Promise.resolve(Response.json(frozenAuthoringContract));
      if (path === "/api/chats/authoring-chat")
        return Promise.resolve(
          Response.json([
            {
              id: "authoring-request",
              chat_id: "authoring-chat",
              question,
              purpose: "general",
              status: "pending",
              output: { stage: "answering", partial: "" },
              error: null,
              cutoffs: {},
              created: "2026-11-10T18:30:00Z",
              study_id: null,
              run_id: null,
              usage: {
                requests: 0,
                input_tokens: 0,
                output_tokens: 0,
                cost_usd: 0,
                partial: false,
              },
              generation: {
                authorization,
                contract: frozenAuthoringContract,
                requests: 0,
                candidates: 0,
                charged_usd: 0,
              },
            },
          ]),
        );
      throw new Error(`Unexpected read: ${path}`);
    }),
  );
  window.history.replaceState(null, "", "/agent?new=finite-authoring");
  renderWithQueries(
    <MemoryRouter initialEntries={["/agent?new=finite-authoring"]}>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route path="/agent" element={<AgentPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("heading", { name: "What can we explore?" }),
  ).toBeInTheDocument();
  const message = screen.getByRole("textbox", { name: "Message Agent" });
  fireEvent.change(message, { target: { value: question } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled(),
  );
  expect(writes).toEqual([]);
  // Intended initial red: the current actual shell has no authoring entry.
  fireEvent.click(screen.getByRole("button", { name: "New mechanics" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "Generate new mechanics" }),
  );
  expect(
    dialog.getByText(/independently.*exhaustive.*table/i),
  ).toBeInTheDocument();
  expect(dialog.getByText(/256/)).toBeInTheDocument();
  expect(
    dialog.getByText(/dynamic information.*unsupported/i),
  ).toBeInTheDocument();
  expect(
    dialog.getByText(/does not establish.*natural.language understanding/i),
  ).toBeInTheDocument();
  expect(dialog.getByText(/GPT-6.1 Sol/)).toBeInTheDocument();
  expect(
    dialog.getByText(/participant execution.*separate/i),
  ).toBeInTheDocument();
  const generate = dialog.getByRole("button", { name: "Authorize generation" });
  expect(generate).toBeDisabled();
  fireEvent.change(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
    {
      target: { value: JSON.stringify(authoringContract, null, 2) },
    },
  );
  expect(writes).toEqual([]);
  fireEvent.click(
    dialog.getByRole("button", { name: "Freeze independent contract" }),
  );
  expect(
    await dialog.findByRole("link", { name: "Inspect frozen contract" }),
  ).toHaveAttribute("href", "/api/extensions/contracts/2222222222222222");
  expect(
    dialog.getByText("2".repeat(64), { exact: false }),
  ).toBeInTheDocument();
  expect(writes).toEqual([
    { path: "/api/extensions/contracts", body: authoringContract },
  ]);
  for (const [name, value] of [
    ["Candidate attempts", "1"],
    ["Model requests", "6"],
    ["Output tokens per request", "1024"],
    ["Input bytes per request", "32000"],
    ["Generation ceiling ($)", "0.25"],
  ]) {
    fireEvent.change(dialog.getByRole("spinbutton", { name }), {
      target: { value },
    });
  }
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.click(generate);
  await waitFor(() =>
    expect(writes).toEqual([
      { path: "/api/extensions/contracts", body: authoringContract },
      {
        path: "/api/chats",
        body: {
          question,
          context: "general",
          chat_id: null,
          generation: authorization,
        },
      },
    ]),
  );
  expect(generate).toBeDisabled();
  fireEvent.click(generate);
  expect(writes).toHaveLength(2);
  await act(async () =>
    submitted.resolve(
      Response.json(
        { id: "authoring-request", chat_id: "authoring-chat" },
        { status: 202 },
      ),
    ),
  );
  expect(await screen.findByText(question)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  expect(
    screen.queryByText("This view could not load"),
  ).not.toBeInTheDocument();
  expect(writes).toHaveLength(2);
});
