import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { renderWithQueries } from "@/test/queries";
import { AgentHistory } from "./agent-history";

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
      <AgentHistory />
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
