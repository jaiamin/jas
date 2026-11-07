import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import { TurnAnnotations } from "./turn-annotations";

test("a pending save keeps its turn and cannot clear edits made after submission", async () => {
  const saved = deferredResponse();
  const fetch = vi.fn((_url, options) =>
    options.method === "POST"
      ? saved.promise
      : Promise.resolve(Response.json([])),
  );
  vi.stubGlobal("fetch", fetch);
  const onInteract = vi.fn();
  const view = renderWithQueries(
    <TurnAnnotations runId="run" turn={1} onInteract={onInteract} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Researcher observations" }),
  );
  const first = screen.getByLabelText("Add an observation at turn 1");
  fireEvent.change(first, { target: { value: "Submitted at one" } });
  fireEvent.click(screen.getByRole("button", { name: "Save observation" }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      "/api/runs/run/annotations",
      expect.objectContaining({
        body: JSON.stringify({
          turn: 1,
          label: "Observation",
          note: "Submitted at one",
        }),
      }),
    ),
  );
  fireEvent.change(first, { target: { value: "Newer unsaved edit" } });
  view.rerender(
    <TurnAnnotations runId="run" turn={2} onInteract={onInteract} />,
  );
  fireEvent.change(screen.getByLabelText("Add an observation at turn 2"), {
    target: { value: "Separate second turn" },
  });
  await act(async () => saved.resolve(Response.json({ id: 1 })));
  expect(screen.getByLabelText("Add an observation at turn 2")).toHaveValue(
    "Separate second turn",
  );
  view.rerender(
    <TurnAnnotations runId="run" turn={1} onInteract={onInteract} />,
  );
  expect(screen.getByLabelText("Add an observation at turn 1")).toHaveValue(
    "Newer unsaved edit",
  );
  expect(onInteract).toHaveBeenCalled();
});

test("failed note submission preserves its text for a successful retry", async () => {
  let fail = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url, options) =>
      Promise.resolve(
        options.method === "POST"
          ? fail
            ? Response.json({ detail: "Storage busy" }, { status: 503 })
            : Response.json({ id: 1 })
          : Response.json([]),
      ),
    ),
  );
  renderWithQueries(
    <TurnAnnotations runId="run" turn={3} onInteract={() => {}} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Researcher observations" }),
  );
  const input = screen.getByLabelText("Add an observation at turn 3");
  fireEvent.change(input, { target: { value: "Keep this observation" } });
  fireEvent.click(screen.getByRole("button", { name: "Save observation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Storage busy");
  expect(input).toHaveValue("Keep this observation");
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Save observation" }));
  await waitFor(() => expect(input).toHaveValue(""));
});
