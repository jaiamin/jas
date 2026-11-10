/**
 * T18 UI01 DEVELOPMENT tracer. SOURCE-ONLY; unrun until ROOT releases setup/red.
 * Literal response fixtures test display, not live judgment accuracy or World rules.
 * The approved real public-HTTP backend tests independently establish consequences.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { WorkspaceProvider } from "@/components/workspace-provider";
import WorkspaceShell from "@/components/workspace-shell";
import { design, parameters, runDetail } from "@/test/fixtures";
import { renderWithQueries } from "@/test/queries";
import Run from "./run";
import Study from "./study";

const adjudicator = {
  version: "1.0.0",
  model: "openai:gpt-6.1-sol",
  openai_reasoning_effort: "low",
  response_tokens: 512,
};
const scope = {
  mechanism: "pickup_note_actionability",
  version: "1.0.0",
  artifact: "report",
  field: "guidance",
  evidence: [{ artifact: "pickup", version: 1, fields: ["desk", "closes_at"] }],
};
const guidance =
  "Collect at the west desk before 17:00. If late, your book is guaranteed to be held tomorrow.";
const work = { desk: "west", closes_at: 17, guidance };
const artifactParameters = {
  ...parameters,
  artifacts: {
    write_limit: 1,
    judgment: scope,
    objects: [
      {
        key: "pickup",
        name: "Confirmed pickup facts",
        owner: null,
        readers: ["author"],
        writers: [],
        content: { desk: "west", closes_at: 17 },
      },
      {
        key: "report",
        name: "Pickup guidance",
        owner: "author",
        readers: [],
        writers: [],
        content: { desk: "", closes_at: 0, guidance: "" },
      },
    ],
    requirements: [
      { artifact: "report", field: "desk", source: "pickup", source_field: "desk" },
      {
        artifact: "report",
        field: "closes_at",
        source: "pickup",
        source_field: "closes_at",
      },
    ],
  },
};
const judgedDesign = {
  ...design,
  title: "Pickup note under fallible review",
  question: "Does this declared rubric consider the pickup note actionable?",
  environment: "artifact_workspace",
  profiles: [
    { key: "author", name: "Author", role: "Author", goal: "", model: null },
  ],
  tasks: [],
  seeds: [18131],
  rounds: 2,
  response_tokens: 512,
  measures: ["artifact_success"],
  conditions: [
    {
      key: "judged",
      name: "Declared fallible judgment",
      description: "",
      model: "openai:gpt-6-luna",
      harness: runDetail.harness,
      profile_overrides: [],
      adjudicator,
      parameters: artifactParameters,
    },
  ],
};
const recorded = {
  mechanism: "pickup_note_actionability",
  version: "1.0.0",
  adjudicator,
  request_id: "cccccccccccccccc",
  inputs: {
    mechanism: "pickup_note_actionability",
    version: "1.0.0",
    artifact: "report",
    artifact_version: 2,
    content: work,
    evidence: [
      { artifact: "pickup", version: 1, content: { desk: "west", closes_at: 17 } },
    ],
  },
  ruling: {
    verdict: "accept",
    // Deliberately wrong rubric reasoning; it must never become an enforced fact.
    explanation: "The book is guaranteed to be held tomorrow.",
    facts: [
      { artifact: "pickup", version: 1, field: "desk", value: "west" },
      { artifact: "pickup", version: 1, field: "closes_at", value: 17 },
    ],
  },
  consequence: {
    applied: true,
    submission_status: "success",
    hard_facts_passed: true,
  },
};
const rulingEvent = {
  id: 3,
  turn: 2,
  round: 2,
  kind: "adjudication",
  actor: "author",
  target: null,
  visibility: "researcher",
  text: "Fallible judgment recorded; World checks enforced the submission result.",
  data: recorded,
};
const checkpoint = {
  rule_version: "2.0.0",
  round: 2,
  position: 1,
  done: true,
  history: [],
  notes: { author: "" },
  experiences: { author: [] },
  artifacts: {
    pickup: {
      ...artifactParameters.artifacts.objects[0],
      versions: [
        {
          version: 1,
          content: { desk: "west", closes_at: 17 },
          sources: [],
          author: null,
          operation: 0,
        },
      ],
    },
    report: {
      ...artifactParameters.artifacts.objects[1],
      versions: [
        {
          version: 1,
          content: { desk: "", closes_at: 0, guidance: "" },
          sources: [],
          author: null,
          operation: 0,
        },
        {
          version: 2,
          content: work,
          sources: [{ artifact: "pickup", version: 1 }],
          author: "author",
          operation: 1,
        },
      ],
    },
  },
  writes_remaining: 0,
  last_results: {},
  artifact_history: [],
  outcome: {
    status: "success",
    actor: "author",
    operation: 2,
    result: { passed: true },
  },
  adjudications: [recorded],
};
const decision = {
  action: { kind: "submit_artifacts" },
  rationale: "Submit the note.",
  memory: "",
  forecast: null,
};
const usage = {
  requests: 3,
  input_tokens: 243,
  output_tokens: 93,
  cost_usd: 0.00033,
  partial: false,
};
const completedRun = {
  ...runDetail,
  design: judgedDesign,
  parameters: artifactParameters,
  next_actor: null,
  summary: {
    ...runDetail.summary,
    id: "judged-run",
    study_id: "judged-study",
    study_title: "Pickup note under fallible review",
    environment: "artifact_workspace",
    condition: "Declared fallible judgment",
    condition_key: "judged",
    seed: 18131,
    status: "complete",
    turn: 2,
    round: 2,
    total_turns: 2,
    total_rounds: 2,
    usage,
  },
  state: checkpoint,
  events: [rulingEvent],
  turns: [
    {
      number: 2,
      round: 2,
      actor: "author",
      action: decision.action,
      rationale: "Submit the note.",
      latency_ms: 1,
      state_hash: "fixture-checkpoint",
    },
  ],
  requests: [
    {
      id: "aaaaaaaaaaaaaaaa",
      turn: 1,
      purpose: "decision",
      model: "openai:gpt-6-luna",
      activation_id: "activation-one",
      input_tokens: 101,
      output_tokens: 37,
      cost_usd: 0.000029,
    },
    {
      id: "bbbbbbbbbbbbbbbb",
      turn: 2,
      purpose: "decision",
      model: "openai:gpt-6-luna",
      activation_id: "activation-two",
      input_tokens: 101,
      output_tokens: 37,
      cost_usd: 0.000029,
    },
    {
      id: "cccccccccccccccc",
      turn: 2,
      purpose: "adjudication",
      model: "openai:gpt-6.1-sol",
      activation_id: null,
      input_tokens: 41,
      output_tokens: 19,
      cost_usd: 0.000272,
    },
  ].map((call) => ({
    ...call,
    analysis_id: null,
    status: "complete",
    error: null,
    created: "2026-11-10",
  })),
};
const readySummary = {
  ...completedRun.summary,
  status: "ready",
  turn: 0,
  usage: runDetail.summary.usage,
};
const preflight = {
  status: "checked",
  issues: [],
  comparisons: [],
  probe_turns: 2,
  limits: "Mechanical checks only; live judgment accuracy is unverified.",
  adjudications: [
    {
      condition_key: "judged",
      scope,
      adjudicator,
      fallible: true,
      rubric:
        "Judge pickup action clarity and a concrete, explicitly uncertain fallback. This is fallible, not semantic truth.",
      permitted_consequence: "terminal_submission_status",
      max_requests_per_submission_attempt: 1,
      price_per_million_usd: { input: 2, output: 10 },
      limits:
        "Only selected work fields and pinned immutable evidence fields; no private goals, inaccessible objects, invented responses or beliefs. Hard-fact and ACL checks precede dispatch and settlement. Unknown usage retains its reservation; no retries or model substitution.",
    },
  ],
};

test("the actual shell declares judge scope and prices before Run and separates its raw ruling from the enforced consequence", async () => {
  let started = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  const fetcher = vi.fn(async (path: string, options?: RequestInit) => {
    if (path === "/api/studies/judged-study/control") {
      expect(options?.method).toBe("POST");
      expect(JSON.parse(String(options?.body))).toEqual({ action: "start" });
      started = true;
      return Response.json({});
    }
    if (path === "/api/runs") return Response.json([]);
    if (path === "/api/studies/judged-study/exposure")
      return Response.json({ runs: [] });
    if (path === "/api/studies/judged-study")
      return Response.json({
        id: "judged-study",
        design: judgedDesign,
        revision: 1,
        sha256: "fixture-design",
        plan_id: null,
        created: "2026-11-10",
        revisions: [
          { number: 1, created: "2026-11-10", sha256: "fixture-design" },
        ],
        preflight,
        runs: [started ? completedRun.summary : readySummary],
        results: [],
        effects: [],
        usage: started ? usage : runDetail.summary.usage,
        comparison: {
          version: 1,
          revision: 1,
          design_sha256: "fixture-design",
          matching_unit: "Immutable revision × seed × repetition",
          inference_unit: "Seed cluster",
          independent_support: null,
          dependence: "Single fixture run",
          uncertainty_reason: "No independent support",
          selection_assumption: "Unverified",
          conditions: [],
          cells: [],
        },
      });
    if (path === "/api/runs/judged-run") return Response.json(completedRun);
    if (path === "/api/runs/judged-run/turns/2")
      return Response.json({
        number: 2,
        round: 2,
        actor: "author",
        observation: {},
        decision,
        checkpoint,
        state_hash: "fixture-checkpoint",
        events: [rulingEvent],
      });
    if (path === "/api/runs/judged-run/annotations")
      return Response.json([]);
    throw new Error(`Unexpected UI fixture HTTP request: ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter initialEntries={["/studies/judged-study"]}>
      <Routes>
        <Route
          element={
            <WorkspaceProvider>
              <WorkspaceShell />
            </WorkspaceProvider>
          }
        >
          <Route path="/studies/:id" element={<Study />} />
          <Route path="/runs/:id" element={<Run />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("heading", {
      name: "Pickup note under fallible review",
    }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Review scope and question mapping" }),
  );
  const declaration = await screen.findByRole("region", {
    name: "Fallible adjudication",
  });
  expect(declaration).toHaveTextContent("openai:gpt-6.1-sol");
  expect(declaration).toHaveTextContent(/Participant.*openai:gpt-6-luna/i);
  expect(declaration).toHaveTextContent("1.0.0");
  expect(declaration).toHaveTextContent("low");
  expect(declaration).toHaveTextContent("512");
  expect(declaration).toHaveTextContent("pickup_note_actionability");
  expect(declaration).toHaveTextContent("report.guidance");
  expect(declaration).toHaveTextContent(/pickup.*v1/);
  expect(declaration).toHaveTextContent("desk");
  expect(declaration).toHaveTextContent("closes_at");
  expect(declaration).toHaveTextContent(/\$2\.00.*(?:million|1M).*input/);
  expect(declaration).toHaveTextContent(/\$10\.00.*(?:million|1M).*output/);
  expect(declaration).toHaveTextContent(/only submission status can change/i);
  expect(declaration).toHaveTextContent(/no.*private.*responses.*beliefs/i);
  expect(declaration).toHaveTextContent(/fallible/i);
  expect(declaration).toHaveTextContent(/not semantic truth/i);
  expect(
    fetcher.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Run experiment" }));
  expect(
    await screen.findByText(/1\s*\/\s*1 runs complete/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Runs", exact: true }));
  fireEvent.click(
    await screen.findByRole("link", {
      name: "Declared fallible judgment",
      exact: true,
    }),
  );
  expect(
    await screen.findByRole("heading", { name: "Turn 2 evidence" }),
  ).toBeInTheDocument();
  const raw = await screen.findByRole("region", {
    name: "Recorded fallible judgment",
  });
  expect(raw).toHaveTextContent(/accept/i);
  expect(raw).toHaveTextContent("The book is guaranteed to be held tomorrow.");
  expect(raw).toHaveTextContent("openai:gpt-6.1-sol");
  expect(raw).toHaveTextContent("cccccccccccccccc");
  expect(raw).toHaveTextContent(/41 input.*19 output/);
  expect(raw).toHaveTextContent("$0.0003");
  expect(raw).toHaveTextContent(/fallible/i);
  const enforced = screen.getByRole("region", { name: "Enforced consequence" });
  expect(enforced).toHaveTextContent(/submission.*success/i);
  expect(enforced).toHaveTextContent(/hard facts.*passed/i);
  expect(enforced).not.toHaveTextContent("The book is guaranteed to be held tomorrow.");
  expect(
    within(raw).queryByText("openai:gpt-6-luna", { exact: true }),
  ).not.toBeInTheDocument();
  expect(
    fetcher.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});
