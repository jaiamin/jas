import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <TooltipProvider>
        <SidebarProvider>
          <WorkspaceShell />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

test("browser run title retains record identity as the navigation catalog loads", async () => {
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
  expect(document.title).toBe("Run | JAS");
  response.resolve(Response.json([runDetail.summary]));
  await waitFor(() => expect(document.title).toBe("Baseline | JAS"));
  expect(
    screen.queryByRole("navigation", { name: "breadcrumb" }),
  ).not.toBeInTheDocument();
});

test("browser experiment title replaces the catalog loading fallback", async () => {
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
  expect(document.title).toBe("Experiment | JAS");
  response.resolve(Response.json([{ id: "study", title: "Saved protocol" }]));
  await waitFor(() => expect(document.title).toBe("Saved protocol | JAS"));
});

test.each([
  ["/new", "New experiment | JAS"],
  ["/new?study=study", "Tune experiment | JAS"],
  ["/compare?runs=one,two", "Compare runs | JAS"],
])(
  "%s preserves its task browser title without a redundant header title",
  async (path, title) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json([]))),
    );
    renderShell(path);
    await waitFor(() => expect(document.title).toBe(title));
    expect(
      screen.queryByRole("navigation", { name: "breadcrumb" }),
    ).not.toBeInTheDocument();
  },
);

test("header theme control persists appearance and Settings has a direct footer link", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json([]))),
  );
  document.documentElement.classList.remove("dark");
  renderShell("/settings");
  const settings = screen.getByRole("link", { name: "Settings" });
  expect(settings).toHaveAttribute("href", "/settings");
  expect(settings).toHaveAttribute("aria-current", "page");
  const github = screen.getByRole("link", { name: "GitHub repository" });
  expect(github).toHaveAttribute("href", "https://github.com/jaiamin/ass");
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
  expect(document.documentElement).toHaveClass("dark");
  expect(localStorage.getItem("jas-theme")).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
  expect(document.documentElement).not.toHaveClass("dark");
  expect(localStorage.getItem("jas-theme")).toBe("light");
});
