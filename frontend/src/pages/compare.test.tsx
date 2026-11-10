import { fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { runDetail } from "@/test/fixtures";
import { renderWithQueries } from "@/test/queries";
import Compare from "./compare";

test("retry refetches the failed run and preserves zero versus unavailable measurements", async () => {
  let failing = true;
  const fetcher = vi.fn((path: string) => {
    const second = path === "/api/runs/two";
    return Promise.resolve(
      second && failing
        ? Response.json({ detail: "Second run unavailable" }, { status: 503 })
        : Response.json({
            ...runDetail,
            summary: {
              ...runDetail.summary,
              id: second ? "two" : "one",
              condition: second ? "Treatment" : "Control",
            },
            metrics: { sanction_rate: second ? null : 0, accuracy: null },
          }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter initialEntries={["/compare?runs=one,two,one"]}>
      <Compare />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Second run unavailable",
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  const row = await screen.findByRole("row", { name: "Sanction rate 0% —" });
  expect(
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent),
  ).toEqual(["Sanction rate", "0%", "—"]);
  expect(
    screen.queryByRole("row", { name: /Accuracy/ }),
  ).not.toBeInTheDocument();
  expect(
    fetcher.mock.calls.filter(([path]) => path === "/api/runs/one"),
  ).toHaveLength(1);
  expect(
    fetcher.mock.calls.filter(([path]) => path === "/api/runs/two"),
  ).toHaveLength(2);
});

test("an incomplete comparison points back to selection without requesting absent runs", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter initialEntries={["/compare"]}>
      <Compare />
    </MemoryRouter>,
  );
  expect(screen.getByText("Choose runs to compare")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse runs" })).toHaveAttribute(
    "href",
    "/runs",
  );
  expect(fetcher).not.toHaveBeenCalled();
});

test("a comparison without recorded outcomes has no empty measurement selector", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        Response.json({
          ...runDetail,
          summary: {
            ...runDetail.summary,
            id: path.endsWith("two") ? "two" : "one",
          },
          metrics: {},
          measurements: [],
        }),
      ),
    ),
  );
  renderWithQueries(
    <MemoryRouter initialEntries={["/compare?runs=one,two"]}>
      <Compare />
    </MemoryRouter>,
  );
  expect(await screen.findByText("No measurements yet")).toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: "Comparison measurement" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Choose runs" })).toHaveAttribute(
    "href",
    "/runs",
  );
});
