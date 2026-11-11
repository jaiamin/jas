import { act, fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { RequestSummary } from "@/lib/types";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import { RequestInspector } from "./request-inspector";

test("request retry stays selected when an older request finishes late", async () => {
  const older = deferredResponse();
  let failing = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("first")) return older.promise;
      return Promise.resolve(
        failing
          ? Response.json({ detail: "Trace unavailable" }, { status: 503 })
          : Response.json({
              id: "second",
              model: "openai:gpt-6-luna",
              purpose: "decision",
              analysis_id: null,
              request: null,
              response: { result: "Selected response" },
            }),
      );
    }),
  );
  const requests: RequestSummary[] = ["first", "second"].map((id, turn) => ({
    id,
    activation_id: null,
    analysis_id: null,
    purpose: "decision",
    model: "openai:gpt-6-luna",
    turn,
    status: "failed",
    error: null,
    created: "2026-11-07",
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  }));
  renderWithQueries(<RequestInspector requests={requests} />);
  fireEvent.click(screen.getByRole("button", { name: "first" }));
  fireEvent.click(screen.getByRole("button", { name: "second" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Trace unavailable",
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText(/Selected response/)).toBeInTheDocument();
  await act(async () =>
    older.resolve(
      Response.json({ id: "first", request: null, response: "Old response" }),
    ),
  );
  expect(
    screen.getByRole("heading", { name: "Request second" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Old response/)).not.toBeInTheDocument();
});
