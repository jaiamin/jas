import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, vi } from "vitest";
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

export const authoringText = JSON.stringify(authoringContract, null, 2);
export const draftQuestion =
  "Prepare the independent co-signature proposal without participant execution.";

export function generationWorkspace(
  options: {
    initial?: string;
    freeze?: (body: unknown) => Promise<Response>;
    runtime?: () => typeof authoringRuntime;
    settings?: typeof authoringSettings;
    profile?: unknown;
    messages?: (chat: string) => unknown[];
    reads?: (path: string) => Response | undefined;
  } = {},
) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
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
  const streams: {
    url: string;
    onerror: (() => void) | null;
    close: () => void;
  }[] = [];
  vi.stubGlobal(
    "EventSource",
    class {
      onmessage = null;
      onerror = null;
      close = vi.fn();
      url: string;
      constructor(url: string) {
        this.url = url;
        streams.push(this);
      }
    },
  );
  const writes: { path: string; body: unknown }[] = [];
  const reads: string[] = [];
  const send = deferredResponse();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body: unknown = JSON.parse(String(init.body));
        writes.push({ path, body });
        if (path === "/api/extensions/contracts")
          return (
            options.freeze?.(body) ??
            Promise.resolve(
              Response.json(frozenAuthoringContract, { status: 201 }),
            )
          );
        if (path === "/api/chats") return send.promise;
        throw new Error(`Unapproved mutation: ${path}`);
      }
      reads.push(path);
      const custom = options.reads?.(path);
      if (custom) return Promise.resolve(custom);
      if (path === "/api/catalog")
        return Promise.resolve(Response.json(catalog));
      if (path === "/api/settings")
        return Promise.resolve(
          Response.json(options.settings ?? authoringSettings),
        );
      if (path === "/api/extensions/profile")
        return Promise.resolve(
          Response.json(options.profile ?? authoringProfile),
        );
      if (path === "/api/extensions/runtime")
        return Promise.resolve(
          Response.json(options.runtime?.() ?? authoringRuntime),
        );
      if (path === "/api/extensions/contracts/2222222222222222")
        return Promise.resolve(Response.json(frozenAuthoringContract));
      if (path.startsWith("/api/chats/"))
        return Promise.resolve(
          Response.json(options.messages?.(path.split("/")[3]) ?? []),
        );
      if (path === "/api/chats")
        return Promise.resolve(
          Response.json([
            {
              id: "first",
              title: "First chat",
              created: "2026-11-10T00:00:00Z",
              updated: "2026-11-10T00:00:00Z",
              context: "general",
              status: "complete",
            },
            {
              id: "second",
              title: "Second chat",
              created: "2026-11-10T00:00:00Z",
              updated: "2026-11-10T00:00:00Z",
              context: "general",
              status: "complete",
            },
          ]),
        );
      if (
        [
          "/api/runs",
          "/api/studies",
          "/api/extensions/contracts",
          "/api/extensions/generations",
        ].includes(path)
      )
        return Promise.resolve(Response.json([]));
      throw new Error(`Unapproved read: ${path}`);
    }),
  );
  const initial = options.initial ?? "/agent?new=safety";
  window.history.replaceState(null, "", initial);
  const view = renderWithQueries(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route path="/agent" element={<AgentPage />} />
          <Route
            path="/"
            element={<Link to={initial}>Return to authoring</Link>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return { ...view, writes, reads, send, streams };
}

export async function openGeneration(question = draftQuestion) {
  const message = await screen.findByRole("textbox", { name: "Message Agent" });
  fireEvent.change(message, { target: { value: question } });
  const button = screen.getByRole("button", { name: "New mechanics" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  return within(
    await screen.findByRole("dialog", { name: "Generate new mechanics" }),
  );
}

export async function freezeGeneration() {
  const dialog = await openGeneration();
  fireEvent.change(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
    { target: { value: authoringText } },
  );
  fireEvent.click(
    dialog.getByRole("button", { name: "Freeze independent contract" }),
  );
  expect(
    await dialog.findByRole("link", { name: "Inspect frozen contract" }),
  ).toBeInTheDocument();
  return dialog;
}

export async function chooseChat(name: "First chat" | "Second chat") {
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Generate new mechanics" }),
    ).not.toBeInTheDocument(),
  );
  const history = screen.getByRole("button", { name: "Chat history" });
  fireEvent.click(history);
  await waitFor(() => expect(history).toHaveAttribute("aria-expanded", "true"));
  fireEvent.click(await screen.findByRole("link", { name: new RegExp(name) }));
}
