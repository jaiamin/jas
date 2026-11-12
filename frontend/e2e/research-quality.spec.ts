import { expect, test } from "@playwright/test";
import type {
  Catalog,
  ResearchFindings,
  StudyDetail,
} from "../src/lib/types.js";
import { templateDesign } from "./helpers.js";

test("analysis plan and actual value scenarios survive authoring, save and reload", async ({
  page,
  request,
}) => {
  await page.goto("/new?template=distributed_coordination");
  await page
    .getByRole("button", { name: "Hypothesis and analysis plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Declare analysis plan", exact: true })
    .click();
  await page
    .getByLabel("Target of the conclusion")
    .fill("Only these explicit value cases and declared agents.");
  await page.getByLabel("Outcome 1 identifier").fill("actual_decisions");
  await page.getByLabel("Outcome 1 identifier").blur();
  await page.getByRole("tab", { name: "Run plan", exact: true }).click();
  await page.getByLabel("Matched seeds", { exact: true }).fill("17, 83");
  await page.getByLabel("Matched seeds", { exact: true }).blur();
  await page
    .getByRole("button", { name: "Matched value scenarios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create rotated scenarios", exact: true })
    .click();
  await page.reload();
  await page.getByRole("tab", { name: "Run plan", exact: true }).click();
  await page
    .getByRole("button", { name: "Matched value scenarios", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Value case 2 · Seed 83", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/studies\//);
  const sid = page.url().split("/").at(-1);
  const study: StudyDetail = await (
    await request.get(`/api/studies/${sid}`)
  ).json();
  expect(study.design.analysis_plan?.outcomes[0].key).toBe("actual_decisions");
  expect(study.design.scenarios).toHaveLength(2);
  expect(study.design.scenarios?.[0].values).not.toEqual(
    study.design.scenarios?.[1].values,
  );
  expect(study.usage.requests).toBe(0);
  await expect(
    page.getByRole("region", { name: "Research findings" }),
  ).toContainText("0 of");
});

for (const { theme, width } of [
  { theme: "light", width: 1440 },
  { theme: "dark", width: 390 },
]) {
  test(`findings, early completion and local recovery · ${theme} · ${width}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog: Catalog = await (await request.get("/api/catalog")).json();
    const design = templateDesign(catalog, "distributed_coordination");
    design.rounds = 5;
    design.seeds = [17];
    design.conditions = design.conditions.slice(0, 1);
    design.conditions[0].harness = {
      kind: "scripted",
      version: "1.0.0",
      policy: "local_value_v1",
      max_requests: 0,
      max_tool_operations: 0,
      tools: [],
    };
    design.analysis_plan = {
      version: 1,
      intent: "exploratory",
      target: "This fixed case only.",
      sampling_unit: "trajectory",
      allocation: "One fixed trajectory, no population inference.",
      exclusions: "retain_all",
      uncertainty: "descriptive",
      outcomes: [
        {
          key: "decisions",
          calculation: "turn_count",
          metric: null,
          manual_reason: "",
        },
        {
          key: "regret",
          calculation: "coordination_regret",
          metric: null,
          manual_reason: "",
        },
        {
          key: "leadership",
          calculation: "manual",
          metric: null,
          manual_reason: "Independent blinded coding required.",
        },
      ],
    };
    const created = await (
      await request.post("/api/studies", { data: { design } })
    ).json();
    await page.addInitScript(
      (theme) => localStorage.setItem("jas-theme", theme),
      theme,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/studies/${created.id}`);
    await expect(
      page.getByRole("region", { name: "Research findings" }),
    ).toContainText("0 of 1");
    await page
      .getByRole("button", { name: "Run experiment", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Research findings" }),
    ).toContainText("1 of 1", { timeout: 15000 });
    const study: StudyDetail = await (
      await request.get(`/api/studies/${created.id}`)
    ).json();
    const report: ResearchFindings = await (
      await request.get(`/api/studies/${created.id}/findings`)
    ).json();
    expect(report.evidence.find((e) => e.outcome === "decisions")?.value).toBe(
      6,
    );
    expect(study.runs[0].completion?.actual_turns).toBe(6);
    expect(study.runs[0].total_turns).toBe(15);
    await page
      .getByRole("button", {
        name: "Calculations, missingness & sources",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Leadership · Manual assessment required", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "Independent blinded coding required.",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("findings.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const pinned = page
      .getByRole("link", { name: "Through turn 6", exact: true })
      .first();
    await pinned.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/runs\/.*turn=6/);
    await expect(page.getByText(/Finished after 6 turns/)).toBeVisible();
    await page.goBack();
    await page.route("**/api/studies/*/findings?*", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Temporary findings failure" }),
      }),
    );
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Retry findings", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await page.unroute("**/api/studies/*/findings?*");
    await page
      .getByRole("button", { name: "Retry findings", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Research findings" }),
    ).toContainText("1 of 1");
    const before = (await (await request.get("/api/settings")).json()).usage;
    const replay = await (
      await request.post(`/api/runs/${study.runs[0].id}/verify`, { data: {} })
    ).json();
    expect(replay.verified_turns).toBe(6);
    expect(replay.model_requests).toBe(0);
    expect((await (await request.get("/api/settings")).json()).usage).toEqual(
      before,
    );
    expect(before.requests).toBe(0);
  });
}
