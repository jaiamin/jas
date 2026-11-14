import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { renderWithQueries } from "@/test/queries";
import { AgentHistory } from "./agent-history";

test("history retry restores the active chat and exposes pending work", async () => {
  // Radix ScrollArea observes its viewport; jsdom has no layout observer.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  let failing = true;
  const fetch = vi.fn(() =>
    Promise.resolve(
      failing
        ? Response.json({ detail: "Offline" }, { status: 503 })
        : Response.json([
            {
              id: "selected",
              title: "Saved question",
              updated: new Date().toISOString(),
              status: "pending",
            },
          ]),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  renderWithQueries(
    <MemoryRouter initialEntries={["/assistant?chat=selected"]}>
      <AgentHistory />
    </MemoryRouter>,
  );
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /chat history/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load chats",
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  const chat = await screen.findByRole("link", { name: /Saved question/ });
  expect(chat).toHaveAttribute("aria-current", "page");
  expect(chat).toHaveAttribute("href", "/assistant?chat=selected");
  expect(
    screen.getByRole("status", { name: "In progress" }),
  ).toBeInTheDocument();
  expect(chat.querySelector("time")).toHaveTextContent("now");
  fireEvent.click(chat);
  expect(
    screen.queryByRole("dialog", { name: "Recent chats" }),
  ).not.toBeInTheDocument();
});
