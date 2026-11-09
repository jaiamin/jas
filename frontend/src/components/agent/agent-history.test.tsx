import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithQueries } from "@/test/queries";
import { AgentHistory } from "./agent-history";

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1280);
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

test("history retry restores the active chat and exposes pending work", async () => {
  let failing = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        failing
          ? Response.json({ detail: "Offline" }, { status: 503 })
          : Response.json([
              { id: "selected", title: "Saved question", status: "pending" },
            ]),
      ),
    ),
  );
  renderWithQueries(
    <MemoryRouter initialEntries={["/agent?chat=selected"]}>
      <TooltipProvider>
        <SidebarProvider>
          <AgentHistory />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load chats",
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  const chat = await screen.findByRole("link", {
    name: /Saved question/,
  });
  expect(chat).toHaveAttribute("aria-current", "page");
  expect(chat).toHaveAttribute("href", "/agent?chat=selected");
  expect(screen.getByRole("img", { name: "In progress" })).toBeInTheDocument();
});
