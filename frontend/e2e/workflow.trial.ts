import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import type { Catalog, RunDetail, StudyDetail } from "../src/lib/types.js";
import { selectEditorSection, templateDesign } from "./helpers.js";

async function createWorkflow(request: APIRequestContext, stale = false) {
  const catalog: Catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog, "institutional_workflow");
  design.seeds = [431];
  design.rounds = 5;
  design.conditions = design.conditions.slice(0, 1);
  const rules = design.conditions[0].parameters.workflow;
  if (!rules) throw new Error("Missing workflow example");
  rules.conflict_order = ["morgan", "alex", "sam", "jordan", "casey", "taylor"];
  if (stale) {
    design.profiles[1].goal =
      "[t12-browser-stale] Inspect the available work and choose.";
    design.conditions[0].harness = {
      kind: "tool_using",
      version: "2.0.0",
      tools: ["observe", "read_artifact"],
      max_requests: 2,
      max_tool_operations: 1,
      capabilities: {
        planning: "disabled",
        memory: "disabled",
        investigation: "disabled",
        verification: "disabled",
      },
      max_context_chars: 16000,
      max_memory_items: 8,
    };
  }
  const response = await request.post("/api/studies", { data: { design } });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  const study: StudyDetail = await (
    await request.get(`/api/studies/${id}`)
  ).json();
  return study.runs[0].id;
}

async function current(
  request: APIRequestContext,
  id: string,
): Promise<RunDetail> {
  return (await request.get(`/api/runs/${id}`)).json();
}

async function step(request: APIRequestContext, id: string) {
  const before = await current(request, id);
  expect(
    (
      await request.post(`/api/runs/${id}/control`, {
        data: { action: "step" },
      })
    ).status(),
  ).toBe(200);
  await expect
    .poll(async () => (await current(request, id)).summary.turn)
    .toBe(before.summary.turn + 1);
  await expect
    .poll(async () => (await current(request, id)).summary.status)
    .not.toBe("running");
}

async function appearance(page: Page, theme: string, width: number) {
  await page.addInitScript(
    (value) => localStorage.setItem("jas-theme", value),
    theme,
  );
  await page.setViewportSize({ width, height: 900 });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("workflow editor retains mobile drafts, pending saves, errors and cancelled environment changes", async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await appearance(page, "light", 390);
  await page.goto("/new?template=institutional_workflow");
  await selectEditorSection(page, "Conditions");
  await page.getByLabel("Initial materials", { exact: true }).first().fill("9");
  await page
    .getByLabel("Prepare material cost", { exact: true })
    .first()
    .fill("4");
  await page
    .getByLabel("Prepare work duration", { exact: true })
    .first()
    .fill("3");
  await page.reload();
  await selectEditorSection(page, "Conditions");
  await expect(
    page.getByLabel("Initial materials", { exact: true }).first(),
  ).toHaveValue("9");
  await expect(
    page.getByLabel("Prepare material cost", { exact: true }).first(),
  ).toHaveValue("4");
  await expect(
    page.getByLabel("Prepare work duration", { exact: true }).first(),
  ).toHaveValue("3");
  const disclosure = page
    .getByRole("button", {
      name: "Dependencies, permissions and timing",
      exact: true,
    })
    .first();
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("workflow-editor-light-mobile.png"),
    fullPage: true,
  });
  await selectEditorSection(page, "Question");
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Shared commons", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Environment", exact: true }),
  ).toContainText("Institutional workflow");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await expect(page.getByLabel("Experiment review")).toContainText(
    "Prepare · 4 materials · 3 ticks",
  );
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/studies", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await pending;
    await route.fulfill({
      status: 503,
      json: { detail: "T12 development save unavailable" },
    });
  });
  const save = page.getByRole("button", {
    name: "Create experiment",
    exact: true,
  });
  await save.click();
  await expect(save).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Conditions",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText(
    "T12 development save unavailable",
  );
  await expect(save).toBeEnabled();
  await page.reload();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await expect(page.getByLabel("Experiment review")).toContainText(
    "Prepare · 4 materials · 3 ticks",
  );
  await page.unroute("**/api/studies");
  await save.click();
  await expect(page).toHaveURL(/\/experiments\//);
  const study: StudyDetail = await (
    await request.get(`/api/studies/${page.url().split("/").at(-1)}`)
  ).json();
  expect(study.design.conditions[0].parameters.workflow?.resource_stock).toBe(
    9,
  );
  expect(study.usage.requests).toBe(0);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("workflow actual contention, pause, delayed handoff and exact replay remain inspectable", async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const id = await createWorkflow(request);
  await appearance(page, "dark", 1440);
  await page.goto(`/runs/${id}?tab=live`);
  const view = page.getByRole("region", {
    name: "Institutional work",
    exact: true,
  });
  await expect(view).toContainText("7 materials remaining");
  await expect(view.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect
    .poll(async () => (await current(request, id)).summary.turn)
    .toBe(11);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(async () => (await current(request, id)).summary.status)
    .toBe("paused");
  const paused = await current(request, id);
  expect(paused.summary.turn).toBe(12);
  expect(paused.state).toMatchObject({
    logical_time: 2,
    resource_stock: 4,
    resource_spent: 3,
    writes_remaining: 5,
    work: { prepare: { owner: "morgan", status: "in_progress", due_at: 3 } },
  });
  expect(paused.summary.usage).toMatchObject({
    requests: 12,
    input_tokens: 1200,
    output_tokens: 600,
    cost_usd: 0.00042,
  });
  await page.reload();
  await expect(view).toContainText("Ready at logical time 3");
  await expect(view).toContainText("Waiting for prepare acceptance");
  await expect(
    view.getByText("t12-browser-private-mail", { exact: true }),
  ).toHaveCount(0);
  for (let i = 0; i < 12; i++) await step(request, id);
  await expect(view).toContainText("Awaiting acceptance from Sam · Version 2");
  await expect(view).toContainText("0 of 3 handoffs accepted");
  const mail = view.getByRole("button", {
    name: "Addressed messages",
    exact: true,
  });
  await mail.focus();
  await page.keyboard.press("Enter");
  await expect(view).toContainText("t12-browser-private-mail");
  await expect(view).toContainText("Delivered 2");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("workflow-handoff-dark-desktop.png"),
    fullPage: true,
  });
  for (let i = 0; i < 6; i++) await step(request, id);
  const completed = await current(request, id);
  expect(completed.state.outcome).toEqual({
    status: "horizon",
    accepted: ["prepare"],
    unfinished: ["release", "audit"],
  });
  expect(completed.state).toMatchObject({
    logical_time: 5,
    resource_stock: 4,
    resource_spent: 3,
    writes_remaining: 5,
  });
  expect(
    completed.events.filter((event) => event.kind === "workflow_conflict"),
  ).toHaveLength(1);
  expect(completed.summary.usage).toMatchObject({
    requests: 30,
    input_tokens: 3000,
    output_tokens: 1500,
    cost_usd: 0.00105,
  });
  await expect(view).toContainText(
    "Accepted by Sam at logical time 4 · Version 2",
  );
  await page
    .getByRole("slider", { name: "Recorded turn", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await expect(view).toContainText("7 materials remaining");
  await expect(view).not.toContainText("Accepted by Sam");
  await page.getByRole("tab", { name: "Record", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify exact replay", exact: true })
    .click();
  await expect(
    page.getByText("30 turns verified locally. No model calls."),
  ).toBeVisible();
  expect((await current(request, id)).summary.usage).toEqual(
    completed.summary.usage,
  );
  await testInfo.attach("workflow-current-run", {
    body: JSON.stringify(completed),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("workflow tool failure preserves work and explicit recovery commits once", async ({
  page,
  request,
}, testInfo) => {
  const id = await createWorkflow(request, true);
  await appearance(page, "light", 390);
  await page.goto(`/runs/${id}?tab=live`);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    page.getByText("Execution stopped safely", { exact: true }),
  ).toBeVisible();
  const failed = await current(request, id);
  expect(failed.summary.status).toBe("failed");
  expect(failed.summary.turn).toBe(7);
  expect(failed.state).toMatchObject({
    logical_time: 1,
    resource_stock: 7,
    resource_spent: 0,
    writes_remaining: 6,
  });
  expect(failed.state.artifacts?.draft.versions).toHaveLength(1);
  await page.reload();
  expect((await current(request, id)).summary.usage).toEqual(
    failed.summary.usage,
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect
    .poll(async () => (await current(request, id)).summary.turn)
    .toBe(8);
  for (let i = 0; i < 4; i++) await step(request, id);
  const recovered = await current(request, id);
  expect(recovered.state).toMatchObject({
    logical_time: 2,
    resource_stock: 4,
    resource_spent: 3,
    writes_remaining: 5,
  });
  expect(recovered.state.artifacts?.draft.versions).toHaveLength(2);
  await expect(
    page.getByRole("region", { name: "Institutional work", exact: true }),
  ).toContainText("Ready at logical time 3");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("workflow-recovered-light-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Record", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify exact replay", exact: true })
    .click();
  await expect(
    page.getByText("12 turns verified locally. No model calls."),
  ).toBeVisible();
  expect((await current(request, id)).summary.usage).toEqual(
    recovered.summary.usage,
  );
  await testInfo.attach("workflow-failure", {
    body: JSON.stringify(failed),
    contentType: "application/json",
  });
});
