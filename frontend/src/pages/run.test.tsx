import { act, fireEvent, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { exposureReport, runDetail } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import Run from "./run";

for (const late of [false, true]) {
  test(`replay confirmation belongs to its run when completion is ${late ? "late" : "already visible"}`, async () => {
    const verification = deferredResponse();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) =>
        path.endsWith("/exposure")
          ? Promise.resolve(Response.json(exposureReport))
          : path.endsWith("/verify")
            ? verification.promise
            : Promise.resolve(
                Response.json({
                  ...runDetail,
                  summary: {
                    ...runDetail.summary,
                    id: path.endsWith("/second") ? "second" : "run",
                  },
                }),
              ),
      ),
    );
    const view = renderWithQueries(
      <MemoryRouter initialEntries={["/runs/run?tab=settings"]}>
        <Link to="/runs/second?tab=settings">Other run</Link>
        <Routes>
          <Route path="/runs/:id" element={<Run />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Verify exact replay" }),
    );
    if (!late) {
      await act(async () =>
        verification.resolve(Response.json({ verified_turns: 2 })),
      );
      expect(
        await screen.findByText(/2 turns verified locally/),
      ).toBeInTheDocument();
    }
    act(() =>
      view.client.setQueryData(["/runs/second"], {
        ...runDetail,
        summary: { ...runDetail.summary, id: "second" },
      }),
    );
    fireEvent.click(screen.getByRole("link", { name: "Other run" }));
    expect(
      await screen.findByText("second", { selector: "code" }),
    ).toBeInTheDocument();
    if (late)
      await act(async () =>
        verification.resolve(Response.json({ verified_turns: 2 })),
      );
    expect(
      screen.queryByText(/turns verified locally/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verify exact replay" }),
    ).toBeEnabled();
  });
}
