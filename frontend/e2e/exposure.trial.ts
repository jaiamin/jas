import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

const contextMode = process.env.JAS_TEST_CONTEXT === "1";
const expectedRequests = contextMode ? 30 : 24;

for (const { theme, width } of [
  { theme: "light", width: 1440 },
  { theme: "dark", width: 390 },
]) {
  test(`inspect actual disclosure inputs and export · ${contextMode ? "capabilities" : "reads"} · ${theme} · ${width}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = templateDesign(catalog);
    design.title = `T07 disclosure ${theme}`;
    design.profiles = ["alex", "morgan", "riley"].map((key) => ({
      key,
      name: key,
      role: "participant",
      goal: `private-${key}`,
      model: null,
    }));
    design.rounds = 2;
    design.seeds = [0];
    design.conditions = design.conditions.slice(0, 1);
    design.conditions[0].parameters.memory = "episodic";
    design.conditions[0].parameters.endowment = 10;
    design.conditions[0].parameters.multiplier = 1.5;
    design.conditions[0].harness = {
      kind: "tool_using",
      version: "2.0.0",
      max_requests: contextMode ? 5 : 4,
      max_tool_operations: contextMode ? 4 : 3,
      tools: ["observe", "rules", "legal_options"],
      capabilities: {
        planning: "actor_plan_v1",
        memory: "actor_sources_v1",
        investigation: "actor_inspection_v1",
        verification: "legal_evidence_v1",
      },
      max_context_chars: 16000,
      max_memory_items: 8,
    };
    const saved = await request.post("/api/studies", { data: { design } });
    expect(saved.ok()).toBe(true);
    const sid = (await saved.json()).id;
    const study = await (await request.get(`/api/studies/${sid}`)).json();
    const rid = study.runs[0].id;
    await request.post(`/api/runs/${rid}/control`, {
      data: { action: "start" },
    });
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${rid}`)).json()).summary.status,
        // The context provider pauses one second in each of six activations.
        { timeout: contextMode ? 15_000 : 5_000 },
      )
      .toBe("complete");
    const record = await (await request.get(`/api/runs/${rid}`)).json();
    const report = await (
      await request.get(`/api/runs/${rid}/exposure`)
    ).json();
    expect(record.summary.usage.requests).toBe(expectedRequests);
    expect(
      report.summary.find((c: { kind: string }) => c.kind === "message"),
    ).toMatchObject({ eligible_participants: 2, exposed_participants: 2 });
    if (contextMode) {
      const target = report.opportunities.find(
        (opportunity: { kind: string; participant: string }) =>
          opportunity.kind === "message" &&
          opportunity.participant === "morgan",
      );
      expect(target.inputs.length).toBeGreaterThan(0);
      expect(
        target.inputs.every((input: { source: { pointer: string } }) =>
          input.source.pointer.includes("/result/items/"),
        ),
      ).toBe(true);
      expect(record.activations[0].identity.harness.version).toBe("2.0.0");
      expect(
        record.activations[0].operations.map(
          (operation: { kind: string }) => operation.kind,
        ),
      ).toEqual([
        "investigate",
        "plan",
        "retrieve",
        "verify",
        "decide",
        "settle",
      ]);
    }
    await page.addInitScript(
      (theme) => localStorage.setItem("jas-theme", theme),
      theme,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/runs/${rid}?tab=settings`);
    const exposure = page.getByRole("region", { name: "Treatment exposure" });
    await expect(
      exposure.getByRole("heading", { name: "Treatment exposure" }),
    ).toBeVisible();
    const row = exposure
      .getByRole("row")
      .filter({ hasText: "Message records" });
    await expect(row).toContainText("2 / 2");
    const disclosure = exposure.getByRole("button", {
      name: "Exposure sources",
      exact: true,
    });
    await disclosure.focus();
    await disclosure.press("Enter");
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(
      exposure.getByText("morgan · Message records · Confirmed input", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      exposure.getByText("riley · Message records · Confirmed input", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      exposure.locator('a[href^="/api/requests/"]').first(),
    ).toHaveAttribute("href", /\/api\/requests\//);
    await disclosure.press("Enter");
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await exposure.screenshot({
      path: testInfo.outputPath(`exposure-region-${theme}.png`),
    });
    await page.screenshot({
      path: testInfo.outputPath(`exposure-${theme}.png`),
      fullPage: true,
    });
    const downloaded = await (
      await request.get(`/api/studies/${sid}/export`)
    ).json();
    expect(downloaded.version).toBe(12);
    expect(downloaded.exposure).toEqual([report]);
    expect(downloaded.requests).toHaveLength(expectedRequests);
    await request.post(`/api/runs/${rid}/verify`);
    expect(
      (await (await request.get(`/api/runs/${rid}`)).json()).summary.usage,
    ).toEqual(record.summary.usage);
    await page.goto(`/studies/${sid}`);
    await page
      .getByRole("button", { name: "Comparison & evidence", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Treatment exposure" }),
    ).toContainText("Assignment-based record");
    await page.screenshot({
      path: testInfo.outputPath(`experiment-exposure-${theme}.png`),
      fullPage: true,
    });
    const evidencePath = testInfo.outputPath("exposure-export.json");
    await writeFile(evidencePath, JSON.stringify(downloaded, null, 2));
    await testInfo.attach("exposure-evidence", {
      path: evidencePath,
      contentType: "application/json",
    });
  });
}

test("exposure loading, failure and retry preserve the selected run", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog);
  const sid = (
    await (await request.post("/api/studies", { data: { design } })).json()
  ).id;
  const rid = (await (await request.get(`/api/studies/${sid}`)).json()).runs[0]
    .id;
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failing = true;
  await page.route(`**/api/runs/${rid}/exposure`, async (route) => {
    await hold;
    if (failing)
      return route.fulfill({
        status: 503,
        json: { detail: "Controlled exposure interruption" },
      });
    return route.continue();
  });
  await page.goto(`/runs/${rid}?tab=settings`);
  const exposure = page.getByRole("region", { name: "Treatment exposure" });
  await expect(exposure.getByLabel("Loading exposure evidence")).toBeVisible();
  release();
  await expect(exposure.getByRole("alert")).toContainText(
    "Controlled exposure interruption",
  );
  failing = false;
  await exposure.getByRole("button", { name: "Retry exposure" }).click();
  await expect(
    exposure.getByRole("row").filter({ hasText: "Message records" }),
  ).toContainText("0 / 0");
  await expect(page).toHaveURL(new RegExp(`/runs/${rid}`));
});
