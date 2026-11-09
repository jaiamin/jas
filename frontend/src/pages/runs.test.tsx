import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { runDetail } from "@/test/fixtures";
import { renderWithQueries } from "@/test/queries";
import Runs from "./runs";

test("an unavailable run list retries without losing comparison selection on refresh", async () => {
  let failing = true;
  let running = false;
  const fetcher = vi.fn((path: string) => {
    expect(path).toBe("/api/runs");
    return Promise.resolve(
      failing
        ? Response.json({ detail: "Run list unavailable" }, { status: 503 })
        : Response.json([
            {
              ...runDetail.summary,
              status: running ? "running" : "paused",
            },
            { ...runDetail.summary, id: "second", seed: 8 },
          ]),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const { client } = renderWithQueries(
    <MemoryRouter>
      <Runs />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Run list unavailable",
  );
  expect(screen.queryByText("No runs yet")).not.toBeInTheDocument();

  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  const first = await screen.findByRole("checkbox", {
    name: /^Select Baseline,.*run$/,
  });
  fireEvent.click(first);
  running = true;
  await act(() => client.refetchQueries({ queryKey: ["/runs"] }));
  expect(await screen.findByText("Running")).toBeInTheDocument();
  expect(first).toBeChecked();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /^Select Baseline,.*second$/ }),
  );
  expect(screen.getByRole("link", { name: "Compare 2 runs" })).toHaveAttribute(
    "href",
    "/compare?runs=run,second",
  );
  failing = true;
  await act(() => client.refetchQueries({ queryKey: ["/runs"] }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Run list unavailable",
  );
  expect(
    screen.getByRole("checkbox", { name: /^Select Baseline,.*run$/ }),
  ).toBe(first);
  expect(first).toBeChecked();
  expect(
    screen.getByRole("link", { name: "Compare 2 runs" }),
  ).toBeInTheDocument();
  failing = false;
  await act(() => client.refetchQueries({ queryKey: ["/runs"] }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
  expect(first).toBeChecked();
});
