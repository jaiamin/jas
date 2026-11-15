import { expect, test } from "@playwright/test";
import { selectEditorSection, templateDesign } from "./helpers.js";

for (const { theme, width } of [
  { theme: "light", width: 1440 },
  { theme: "dark", width: 390 },
]) {
  test(`configure, run and inspect both real participant policies · ${theme} · ${width}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = templateDesign(catalog);
    design.title = `T04 deterministic policies ${theme}`;
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
    await selectEditorSection(page, "Conditions");
    await page
      .getByRole("button", { name: "Add condition", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Condition 2 participant harness" })
      .click();
    await page.getByRole("option", { name: "Tool using", exact: true }).click();
    await expect(
      page.getByLabel("Maximum requests per activation"),
    ).toHaveValue("4");
    await expect(
      page.getByLabel("Maximum tool operations per activation"),
    ).toHaveValue("3");
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Experiment review")).toContainText(
      "Tool using · v2.0.0",
    );
    await expect(page.getByLabel("Experiment review")).toContainText(
      "4 requests",
    );
    await page
      .getByRole("button", { name: "Save new version", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/experiments/${created.id}$`));
    const study = await (
      await request.get(`/api/studies/${created.id}`)
    ).json();
    const direct = study.runs.find(
      (r: { condition_key: string }) =>
        r.condition_key === design.conditions[0]?.key,
    );
    const tools = study.runs.find(
      (r: { condition_key: string }) => r.condition_key === "condition-2",
    );
    for (const run of [direct, tools]) {
      await page.goto(`/runs/${run.id}`);
      await page.getByRole("button", { name: "Step", exact: true }).click();
      await expect
        .poll(
          async () =>
            (await (await request.get(`/api/runs/${run.id}`)).json()).summary
              .turn,
        )
        .toBe(1);
      await page.getByRole("tab", { name: "Record", exact: true }).click();
      await expect(
        page.getByRole("heading", {
          name: "Participant activations",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("decision_committed", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: /Activation 1/ }).click();
      await expect(page.getByText("decide", { exact: true })).toBeVisible();
      if (run.id === tools.id) {
        await expect(page.getByText("observe", { exact: true })).toBeVisible();
        await expect(
          page.getByText("legal_options", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText("4 / 4 inference attempts", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Result of operation 1" })
          .click();
        await expect(page.getByText(/your_private_signal/)).toBeVisible();
      } else {
        await expect(
          page.getByText("1 / 1 inference attempts", { exact: true }),
        ).toBeVisible();
      }
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
      await page.screenshot({
        path: testInfo.outputPath(
          `${theme}-${run.id === tools.id ? "tools" : "direct"}.png`,
        ),
        fullPage: true,
      });
    }
    const exported = await (
      await request.get(`/api/studies/${created.id}/export`)
    ).json();
    expect(exported.version).toBe(20);
    expect(exported.activations).toHaveLength(2);
    expect(exported.requests).toHaveLength(5);
    expect(
      exported.requests.every(
        (r: { model: string }) => r.model === "openai:gpt-6-luna",
      ),
    ).toBe(true);
  });
}
