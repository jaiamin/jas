import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

for (const { theme, width } of [
  { theme: "light", width: 1440 },
  { theme: "dark", width: 390 },
]) {
  test(`reference conditions, ablations and matched effort · ${theme} · ${width}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = templateDesign(catalog);
    design.title = `T15 keyless controls ${theme}`;
    design.profiles = design.profiles.slice(0, 2);
    design.conditions = design.conditions.slice(0, 1);
    design.rounds = 1;
    design.seeds = [127];
    design.measures = ["contribution_rate"];
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
      .getByRole("button", { name: "Add condition", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Condition 2 participant harness" })
      .click();
    await page.screenshot({
      path: testInfo.outputPath("harness-options.png"),
      fullPage: true,
    });
    await page
      .getByRole("option", { name: "Scripted control", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Condition 2 model" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Non-model control. No provider requests.", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Condition 2 reference policy" })
      .click();
    await expect(
      page.getByRole("option", { name: "Keep credits · commons", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("option", {
        name: "Half contribution · commons",
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("combobox", { name: "Condition 2 reference policy" }),
    ).toContainText("Half contribution");
    await page
      .getByRole("button", { name: "Add condition", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Condition 3 participant harness" })
      .click();
    await page.getByRole("option", { name: "Tool using", exact: true }).click();
    await page
      .getByRole("button", { name: "Apply ablation", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Disable retained memory", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Condition 3 memory", exact: true }),
    ).toContainText("No retained history");
    await expect(
      page.getByRole("combobox", {
        name: "Condition 3 source-linked memory",
        exact: true,
      }),
    ).toContainText("Disabled");
    await page
      .getByRole("button", { name: "Apply ablation", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Disable tool access", exact: true })
      .click();
    await expect(
      page.getByLabel("Maximum tool operations per activation"),
    ).toHaveValue("0");
    await expect(
      page.getByLabel("Own observation", { exact: true }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("combobox", {
        name: "Condition 3 world investigation",
        exact: true,
      }),
    ).toContainText("Disabled");
    // Explicitly restore the capable configuration, then combine memory/request ablations.
    await page
      .getByRole("combobox", { name: "Condition 3 participant harness" })
      .click();
    await page
      .getByRole("option", { name: "Direct action", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Condition 3 participant harness" })
      .click();
    await page.getByRole("option", { name: "Tool using", exact: true }).click();
    await page
      .getByRole("button", { name: "Apply ablation", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Disable retained memory", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Apply ablation", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Limit to one inference", exact: true })
      .click();
    await expect(
      page.getByLabel("Maximum requests per activation"),
    ).toHaveValue("1");
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Experiment review")).toContainText(
      "Non-model control",
    );
    await expect(page.getByLabel("Experiment review")).toContainText(
      "commons_half_v1",
    );
    await page.reload();
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Experiment review")).toContainText(
      "commons_half_v1",
    );
    await page.screenshot({
      path: testInfo.outputPath("review.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save new revision", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/studies/${created.id}$`));
    let study = await (await request.get(`/api/studies/${created.id}`)).json();
    for (const run of study.runs) {
      expect(
        (
          await request.post(`/api/runs/${run.id}/control`, {
            data: { action: "start" },
          })
        ).ok(),
      ).toBe(true);
      await expect
        .poll(
          async () =>
            (await (await request.get(`/api/runs/${run.id}`)).json()).summary
              .status,
        )
        .toMatch(/complete|failed/);
    }
    study = await (await request.get(`/api/studies/${created.id}`)).json();
    const scripted = study.runs.find(
      (r: { condition_key: string }) => r.condition_key === "condition-2",
    );
    const failed = study.runs.find(
      (r: { condition_key: string }) => r.condition_key === "condition-3",
    );
    expect(scripted.usage.requests).toBe(0);
    expect(failed.status).toBe("failed");
    await page.reload();
    await page
      .getByRole("button", {
        name: "Participant configuration & effort",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("commons_half_v1", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText(/request_limit/).first()).toBeVisible();
    await page
      .getByRole("button", { name: "Sample & uncertainty", exact: true })
      .click();
    await expect(
      page.getByText(/Seed cluster within a revision/),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("comparison.png"),
      fullPage: true,
    });
    await page.goto(
      `/compare?runs=${study.runs.map((r: { id: string }) => r.id).join(",")}`,
    );
    await expect(
      page.getByRole("row", { name: /Participant harness/ }),
    ).toContainText("commons_half_v1");
    await expect(
      page.getByRole("row", { name: /Inference attempts \/ requests/ }),
    ).toContainText("0 / 0");
    await expect(page.getByText(/Selected runs only/)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("selected-runs.png"),
      fullPage: true,
    });
    await page.goto(`/runs/${scripted.id}`);
    await page.getByRole("tab", { name: "Record", exact: true }).click();
    await expect(
      page.getByText("Non-model control", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: /Activation 1/ }).click();
    await expect(
      page.getByText("reference", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("0 / 0 inference attempts", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Verify exact replay", exact: true })
      .click();
    await expect(
      page.getByText("2 turns verified locally. No model calls."),
    ).toBeVisible();
    const exported = await (
      await request.get(`/api/studies/${created.id}/export`)
    ).json();
    expect(exported.version).toBe(12);
    expect(
      exported.activations
        .filter((a: { run_id: string }) => a.run_id === scripted.id)
        .every(
          (a: { requests: number; identity: { model: null } }) =>
            a.requests === 0 && a.identity.model === null,
        ),
    ).toBe(true);
    expect(
      exported.requests.filter(
        (r: { run_id: string }) => r.run_id === scripted.id,
      ),
    ).toHaveLength(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("record.png"),
      fullPage: true,
    });
  });
}
