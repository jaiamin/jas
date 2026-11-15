import { act, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { writeDraft } from "@/lib/drafts";
import { catalog, design } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import Editor from "./editor";

// Native form checkboxes use ResizeObserver; jsdom does not implement layout.
beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterEach(() => localStorage.clear());

test("returning to the editor validates the latest draft before initializing the form", async () => {
  const saved = { ...design, title: "Preserved while asking AI" };
  writeDraft("/new", saved, "", "visual");
  const validation = deferredResponse();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      path === "/api/catalog"
        ? Promise.resolve(Response.json(catalog))
        : validation.promise,
    ),
  );
  const view = renderWithQueries(<MemoryRouter />);
  // A fast back navigation may reuse the draft query before its GC timer runs.
  view.client.setQueryDefaults(["draft"], { staleTime: 1000 });
  view.client.setQueryData(["draft", "/new"], null);
  view.rerender(
    <MemoryRouter>
      <Editor />
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText("Experiment name")).not.toBeInTheDocument();
  await act(async () => validation.resolve(Response.json(saved)));
  expect(await screen.findByLabelText("Experiment name")).toHaveValue(
    saved.title,
  );
});

test("a validation outage retries the saved draft without classifying it as corrupt", async () => {
  writeDraft("/new", design, "", "visual");
  const saved = localStorage.getItem("jas:draft:/new");
  let failing = true;
  const fetcher = vi.fn((path: string) => {
    if (path === "/api/catalog") return Promise.resolve(Response.json(catalog));
    if (path === "/api/design/validate")
      return Promise.resolve(
        failing
          ? Response.json({ detail: "Validation offline" }, { status: 503 })
          : Response.json(design),
      );
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter initialEntries={["/new"]}>
      <Editor />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Validation offline",
  );
  expect(
    screen.queryByRole("button", { name: /Discard/ }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem("jas:draft:/new")).toBe(saved);
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByLabelText("Experiment name")).toHaveValue(
    design.title,
  );
  expect(
    fetcher.mock.calls.filter(([path]) => path === "/api/catalog"),
  ).toHaveLength(1);
  expect(
    fetcher.mock.calls.filter(([path]) => path === "/api/design/validate"),
  ).toHaveLength(2);
});

test("a rejected draft opens its original incomplete specification for repair", async () => {
  const json = '{"profiles":';
  writeDraft("/new", { ...design, profiles: [] }, json, "json");
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        path === "/api/catalog"
          ? Response.json(catalog)
          : Response.json(
              { detail: "At least two agents required" },
              { status: 422 },
            ),
      ),
    ),
  );
  renderWithQueries(
    <MemoryRouter initialEntries={["/new"]}>
      <Editor />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("heading", { name: "Recover your draft" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit specification" }));
  expect(
    await screen.findByLabelText("Complete JSON specification"),
  ).toHaveValue(json);
  expect(localStorage.getItem("jas:draft:/new")).not.toBeNull();
});

test("unfinished name and question survive validated draft recovery without becoming specification errors", async () => {
  const unfinished = { ...design, title: "My new experiment", question: "" };
  writeDraft("/new", unfinished, "", "quick");
  const fetcher = vi.fn(async (path: string, options?: RequestInit) => {
    if (path === "/api/catalog") return Response.json(catalog);
    if (path === "/api/design/validate") {
      const candidate = JSON.parse(String(options?.body)).design;
      expect(candidate.question).toBe("Draft question");
      return Response.json(candidate);
    }
    return Response.json({ providers: {}, preferences: {} });
  });
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter initialEntries={["/new"]}>
      <Editor />
    </MemoryRouter>,
  );
  expect(await screen.findByLabelText("Experiment name")).toHaveValue(
    unfinished.title,
  );
  expect(screen.getByLabelText("Question")).toHaveValue("");
  expect(screen.queryByText("Recover your draft")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  expect(
    JSON.parse(localStorage.getItem("jas:draft:/new") ?? "null").design
      .question,
  ).toBe("");
});
