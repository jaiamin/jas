import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

for (const { theme, width } of [
  { theme: "light", width: 1440 },
  { theme: "dark", width: 390 },
]) {
  test(`configure capabilities, pause, restore and inspect real receipts · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = templateDesign(catalog);
    design.title = `T08 neutral context ${theme}`;
    design.profiles = design.profiles.slice(0, 2);
    design.conditions = design.conditions.slice(0, 1);
    design.rounds = 1;
    design.seeds = [73];
    const created = await (
      await request.post("/api/studies", { data: { design } })
    ).json();
    await page.addInitScript(
      (theme) => localStorage.setItem("jas-theme", theme),
      theme,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/new?study=${created.id}`);
    await page.getByRole("tab", { name: "Conditions", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Condition 1 participant harness" })
      .click();
    await page.getByRole("option", { name: "Tool using", exact: true }).click();
    await page.getByLabel("Maximum requests per activation").fill("5");
    await page.getByLabel("Maximum tool operations per activation").fill("4");
    await page.getByLabel("Maximum memory results").fill("2");
    const memory = page.getByRole("combobox", {
      name: "Condition 1 source-linked memory",
    });
    await memory.click();
    await page.getByRole("option", { name: "Disabled", exact: true }).click();
    await expect(memory).toContainText("Disabled");
    await memory.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("option", { name: "Enabled · v1", exact: true })
      .click();
    await expect(memory).toContainText("Enabled");
    await page.screenshot({
      path: testInfo.outputPath(`${theme}-configuration.png`),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Experiment review")).toContainText(
      "memory: actor_sources_v1",
    );
    await expect(page.getByLabel("Experiment review")).toContainText(
      "2 memory results",
    );
    await page
      .getByRole("button", { name: "Save new revision", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/studies/${created.id}$`));
    const study = await (
      await request.get(`/api/studies/${created.id}`)
    ).json();
    const runId = study.runs.find(
      (r: { condition_key: string }) =>
        r.condition_key === design.conditions[0]?.key,
    ).id;
    await page.goto(`/runs/${runId}`);
    await page.getByRole("button", { name: "Step", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${runId}`)).json()).requests
            .length,
      )
      .toBe(1);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${runId}`)).json())
            .activations[0]?.status,
      )
      .toBe("paused");
    const paused = await (await request.get(`/api/runs/${runId}`)).json();
    expect(paused.summary.turn).toBe(0);
    await page.reload();
    await page.getByRole("button", { name: "Step", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${runId}`)).json()).summary.turn,
      )
      .toBe(1);
    const resumed = await (await request.get(`/api/runs/${runId}`)).json();
    expect(resumed.activations).toHaveLength(1);
    expect(resumed.activations[0].id).toBe(paused.activations[0].id);
    expect(resumed.requests).toHaveLength(5);
    expect(resumed.activations[0].identity.harness.capabilities.memory).toBe(
      "actor_sources_v1",
    );
    expect(
      resumed.activations[0].operations.map((o: { kind: string }) => o.kind),
    ).toEqual([
      "investigate",
      "pause",
      "plan",
      "retrieve",
      "verify",
      "decide",
      "settle",
    ]);
    await page.getByRole("tab", { name: "Record", exact: true }).click();
    await page.getByRole("button", { name: /Activation 1/ }).click();
    await expect(
      page.getByText("actor_sources_v1", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("5 / 5 inference attempts", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Result of operation 3", exact: true })
      .click();
    await expect(
      page.getByText(/Check the observed budget before choosing/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Result of operation 5", exact: true })
      .click();
    await expect(
      page.getByText(/actor_legal_schema_and_source_quotes/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Verify exact replay", exact: true })
      .click();
    await expect(
      page.getByText("1 turns verified locally. No model calls."),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByText("actor_sources_v1", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`${theme}-capabilities.png`),
      fullPage: true,
    });
    await page
      .getByText(/actor_legal_schema_and_source_quotes/)
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`${theme}-receipts.png`),
      fullPage: true,
    });
    const exported = await (
      await request.get(`/api/studies/${created.id}/export`)
    ).json();
    expect(exported.version).toBe(6);
    expect(exported.requests).toHaveLength(5);
    expect(exported.activations[0].operations).toEqual(
      resumed.activations[0].operations,
    );
  });
}
