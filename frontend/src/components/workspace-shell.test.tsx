import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { AssistantWorkspaceProvider } from "@/components/agent/assistant-workspace";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { settings as settingsFixture } from "@/test/fixtures";
import { renderWithQueries } from "@/test/queries";
import appHtml from "../../index.html?raw";
import WorkspaceShell from "./workspace-shell";

beforeEach(() => {
  document.title = new DOMParser().parseFromString(appHtml, "text/html").title;
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
          <AssistantWorkspaceProvider>
            <WorkspaceShell />
          </AssistantWorkspaceProvider>
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

test.each([
  "/runs/run",
  "/experiments/study",
  "/new",
  "/new?study=study",
  "/compare?runs=one,two",
])("%s keeps the static JAS browser title", async (path) => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        Response.json(path === "/api/settings" ? settingsFixture : []),
      ),
    ),
  );
  renderShell(path);
  await waitFor(() => expect(document.title).toBe("JAS"));
  expect(
    screen.queryByRole("navigation", { name: "breadcrumb" }),
  ).not.toBeInTheDocument();
});

test("header alone changes appearance and the footer links directly to Settings", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        Response.json(path === "/api/settings" ? settingsFixture : []),
      ),
    ),
  );
  document.documentElement.classList.remove("dark");
  renderShell("/settings");
  const settings = screen.getByRole("link", { name: /^Settings$/ });
  expect(settings).toHaveAttribute("data-active", "true");
  expect(settings).toHaveAttribute("href", "/settings");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  const github = screen.getByRole("link", { name: "GitHub repository" });
  expect(github).toHaveAttribute("href", "https://github.com/jaiamin/jas");
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
  expect(document.documentElement).toHaveClass("dark");
  expect(localStorage.getItem("jas-theme")).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
  expect(document.documentElement).not.toHaveClass("dark");
  expect(localStorage.getItem("jas-theme")).toBe("light");
});
