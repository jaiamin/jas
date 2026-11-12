import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import type { ResearchFindings as Findings } from "@/lib/types";
import { renderWithQueries } from "@/test/queries";
import { ResearchFindings } from "./research-findings";

const findings: Findings = {
  version: 1,
  revision: 1,
  design_sha256: "pinned",
  plan_status: "not_declared",
  plan: null,
  complete: 1,
  planned: 2,
  status: "incomplete",
  summary: "1 of 2 planned trajectories completed.",
  observations: [],
  outcomes: [
    {
      key: "intent",
      calculation: "manual",
      status: "manual",
      formula: "Not computed.",
      manual_reason: "Independent behavior coding required.",
    },
  ],
  results: [
    {
      condition_key: "base",
      condition: "Baseline",
      metric: "intent",
      mean: null,
      runs: 0,
      seeds: 0,
      planned: 2,
      excluded: 2,
      exclusions: [],
      interval: null,
      method: "Terminal means",
      uncertainty_reason: "Independence unestablished",
      selection_assumption: "Eligible outcomes only",
      sensitivity: {
        status: "not_identified",
        bounds: null,
        reason: "Not computed",
      },
    },
  ],
  effects: [],
  effort: [
    {
      condition_key: "base",
      condition: "Baseline",
      requests: 3,
      cost_usd: 0.00033,
      partial: true,
      committed_turns: 2,
      waits: 1,
    },
  ],
  evidence: [
    {
      outcome: "intent",
      run_id: "run",
      value: null,
      missing_reason: "Independent behavior coding required.",
      through_turn: 2,
      source: "/api/runs/run/turns/2",
    },
  ],
  review: {
    version: 1,
    scientific_validity: "not_certified",
    issues: [],
    variation: [],
    limits: "No population claim.",
  },
  next_tests: ["Add an explicit scenario control."],
  interpretation: "Numerical checks do not certify prose.",
};

test("manual outcomes and unknown reservations stay explicit with pinned evidence", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(findings));
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter>
      <ResearchFindings studyId="study" revision={1} active={false} />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("1 of 2 planned trajectories completed."),
  ).toBeVisible();
  expect(screen.getByText("Not computed")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Effort across all attempted runs" }),
  );
  expect(
    await screen.findByText(/includes pending\/unknown reservations/),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Calculations, missingness & sources" }),
  );
  expect(
    await screen.findByRole("link", { name: "Through turn 2" }),
  ).toHaveAttribute("href", "/runs/run?turn=2");
  expect(
    screen.getByText("Independent behavior coding required.", {
      selector: "td",
    }),
  ).toBeVisible();
  expect(
    fetcher.mock.calls.every(([path]) => String(path).includes("revision=1")),
  ).toBe(true);
});

test("a refresh failure retains captured findings and exposes a local retry", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(Response.json(findings)));
  vi.stubGlobal("fetch", fetcher);
  const view = renderWithQueries(
    <MemoryRouter>
      <ResearchFindings studyId="study" revision={1} active={false} />
    </MemoryRouter>,
  );
  await screen.findByText(findings.summary);
  fetcher.mockImplementation(() =>
    Promise.resolve(
      Response.json({ detail: "Temporarily unavailable" }, { status: 503 }),
    ),
  );
  await view.client.invalidateQueries();
  expect(await screen.findByText(/Temporarily unavailable/)).toBeVisible();
  expect(screen.getByText(findings.summary)).toBeVisible();
  fetcher.mockImplementation(() => Promise.resolve(Response.json(findings)));
  fireEvent.click(screen.getByRole("button", { name: "Retry findings" }));
  await waitFor(() =>
    expect(
      screen.queryByText(/Temporarily unavailable/),
    ).not.toBeInTheDocument(),
  );
});
