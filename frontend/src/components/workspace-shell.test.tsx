import { screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { runDetail } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import WorkspaceShell from "./workspace-shell";

beforeEach(() => {
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
});

function renderShell(path: string) {
  return renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <WorkspaceShell />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

test("run breadcrumbs retain record identity as the navigation catalog loads", async () => {
  const response = deferredResponse();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      path === "/api/runs"
        ? response.promise
        : Promise.resolve(Response.json([])),
    ),
  );
  renderShell("/runs/run");
  const crumbs = within(screen.getByRole("navigation", { name: "breadcrumb" }));
  expect(crumbs.getByText("Run", { exact: true })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ask Agent" })).toHaveAttribute(
    "href",
    "/agent?context=run%3Arun",
  );
  response.resolve(Response.json([runDetail.summary]));
  expect(await crumbs.findByText("Baseline")).toBeInTheDocument();
  expect(crumbs.getByRole("link", { name: "Fixture" })).toHaveAttribute(
    "href",
    "/studies/study",
  );
  await waitFor(() => expect(document.title).toBe("Baseline | JAS"));
});

test("experiment breadcrumbs replace the loading fallback with the selected title", async () => {
  const response = deferredResponse();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      path === "/api/studies"
        ? response.promise
        : Promise.resolve(Response.json([])),
    ),
  );
  renderShell("/studies/study");
  const crumbs = within(screen.getByRole("navigation", { name: "breadcrumb" }));
  expect(crumbs.getByText("Experiment", { exact: true })).toBeInTheDocument();
  response.resolve(Response.json([{ id: "study", title: "Saved protocol" }]));
  expect(await crumbs.findByText("Saved protocol")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ask Agent" })).toHaveAttribute(
    "href",
    "/agent?context=study%3Astudy",
  );
  await waitFor(() => expect(document.title).toBe("Saved protocol | JAS"));
});

test.each([
  ["/new", "New experiment", "New experiment | JAS", "Experiments", "/studies"],
  [
    "/new?study=study",
    "Tune experiment",
    "Tune experiment | JAS",
    "Experiments",
    "/studies",
  ],
  ["/compare?runs=one,two", "Compare", "Compare runs | JAS", "Runs", "/runs"],
])(
  "%s preserves its task breadcrumb and return destination",
  async (path, task, title, parent, href) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json([]))),
    );
    renderShell(path);
    const crumbs = within(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    );
    expect(crumbs.getByText(task, { exact: true })).toBeInTheDocument();
    expect(crumbs.getByRole("link", { name: parent })).toHaveAttribute(
      "href",
      href,
    );
    await waitFor(() => expect(document.title).toBe(title));
  },
);
