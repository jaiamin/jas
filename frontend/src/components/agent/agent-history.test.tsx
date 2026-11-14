import { fireEvent, screen, waitFor } from "@testing-library/react";
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

test("deletion confirms, retains failed chats, and clears only the deleted identities", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const title =
    "A lengthy question about the evidence required to compare agent strategies";
  let removed = false;
  let failing = true;
  let deletes = 0;
  const onDeleted = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn((_path: string, options?: RequestInit) => {
      if (options?.method === "DELETE") {
        deletes++;
        if (failing)
          return Promise.resolve(
            Response.json(
              { detail: "Wait for requests to settle." },
              { status: 422 },
            ),
          );
        removed = true;
        return Promise.resolve(Response.json({ deleted: "selected" }));
      }
      return Promise.resolve(
        Response.json([
          ...(!removed
            ? [
                {
                  id: "selected",
                  title,
                  updated: new Date().toISOString(),
                  status: "complete",
                },
              ]
            : []),
          {
            id: "pending",
            title: "Still working",
            updated: new Date().toISOString(),
            status: "pending",
          },
        ]),
      );
    }),
  );
  localStorage.setItem("jas:assistant-panel:general", "selected");
  localStorage.setItem("jas:assistant-panel:study:x:1", "selected");
  localStorage.setItem("jas:assistant-panel:study:y:1", "other");
  const { client } = renderWithQueries(
    <MemoryRouter>
      <AgentHistory
        currentChat="selected"
        currentTitle={title}
        onDeleted={onDeleted}
      />
    </MemoryRouter>,
  );
  const identityKey = ["assistant-panel-chat", "jas:assistant-panel:general"];
  client.setQueryData(identityKey, {
    chatId: "selected",
    draftId: "old-draft",
  });
  client.setQueryData(["/settings"], { charged_usd: 1.234 });
  const trigger = screen.getByRole("button", { name: /chat history/i });
  expect(trigger).toHaveTextContent(
    "A lengthy question about the evidence re…",
  );
  expect(trigger).not.toHaveAttribute("title");
  fireEvent.click(trigger);
  const row = await screen.findByRole("link", { name: new RegExp(title) });
  expect(row).not.toHaveAttribute("title");
  expect(
    screen.getByRole("button", { name: "Delete chat: Still working" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: `Delete chat: ${title}` }),
  );
  expect(
    screen.getByRole("alertdialog", { name: "Delete chat?" }),
  ).toBeInTheDocument();
  expect(deletes).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(deletes).toBe(0);
  fireEvent.click(trigger);
  fireEvent.click(
    await screen.findByRole("button", { name: `Delete chat: ${title}` }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete chat" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Wait for requests to settle.",
  );
  expect(localStorage.getItem("jas:assistant-panel:general")).toBe("selected");
  expect(onDeleted).not.toHaveBeenCalled();
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Delete chat" }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("selected"));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(localStorage.getItem("jas:assistant-panel:general")).toBeNull();
  expect(localStorage.getItem("jas:assistant-panel:study:x:1")).toBeNull();
  expect(localStorage.getItem("jas:assistant-panel:study:y:1")).toBe("other");
  expect(client.getQueryData(identityKey)).toMatchObject({ chatId: null });
  expect(client.getQueryData(["/settings"])).toEqual({ charged_usd: 1.234 });
});
