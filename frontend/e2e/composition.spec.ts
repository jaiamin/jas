import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`composed environment lifecycle preserves experiment evidence · ${theme}`, async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize(
      theme === "dark"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
    );
    await page.goto("/new?template=composed&step=conditions");
    await expect(
      page
        .getByRole("heading", { name: "Resource mechanics", exact: true })
        .first(),
    ).toBeVisible();
    await page.getByLabel("Initial stock", { exact: true }).first().fill("16");
    await page.getByLabel("Stock visibility", { exact: true }).first().click();
    await page
      .getByRole("option", { name: "Controllers only", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add resource", exact: true })
      .first()
      .click();
    const resources = page.getByRole("group", {
      name: "Resource",
      exact: true,
    });
    await expect(resources).toHaveCount(2);
    await resources.nth(1).getByLabel("Resource name").fill("Water");
    const key = resources.nth(1).getByLabel("Resource key");
    await key.fill("water");
    await key.blur();
    await expect(resources.nth(1).getByLabel("Resource name")).toBeVisible();
    await resources
      .nth(1)
      .getByRole("button", { name: "Remove resource", exact: true })
      .click();
    await expect(resources).toHaveCount(1);
    await page.getByRole("tab", { name: "Question", exact: true }).click();
    const title = `Custom shortage ${theme}`;
    await page.getByLabel("Experiment name", { exact: true }).fill(title);
    await page
      .getByRole("button", {
        name: "Hypothesis and analysis plan",
        exact: true,
      })
      .click();
    const analysisPlan =
      "Compare allocations to others and unallocated stock across conditions.";
    await page
      .getByLabel("Hypothesis and analysis plan", { exact: true })
      .fill(analysisPlan);
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Save custom environment", exact: true })
      .click();
    await expect(
      page.getByText("Custom environment saved.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/experiments\//);
    const studyId = new URL(page.url()).pathname.split("/").at(-1);
    const study = await (await request.get(`/api/studies/${studyId}`)).json();
    expect(study.design.hypothesis).toBe(analysisPlan);
    const baseline =
      study.design.conditions[0].parameters.composition.resources[0];
    expect(baseline.initial_stock).toBe(16);
    expect(baseline.stock_visibility).toBe("controllers");
    await page.goto(`/runs/${study.runs[0].id}`);
    await page
      .getByRole("button", { name: "Rules & evidence", exact: true })
      .click();
    await page.getByRole("tab", { name: "Environment", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Resources & needs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Researcher view includes private inventories and consumption.",
      ),
    ).toBeVisible();
    await page.goto("/environments?view=custom");
    await page
      .locator("[data-slot=item-group]")
      .getByRole("link", { name: title, exact: true })
      .click();
    await page.getByRole("tab", { name: "Question", exact: true }).click();
    await page
      .getByLabel("Experiment name", { exact: true })
      .fill(`${title} updated`);
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Update custom environment", exact: true })
      .click();
    await expect(
      page.getByText("Custom environment saved.", { exact: false }),
    ).toBeVisible();
    await page.goto("/environments?view=custom");
    const row = page
      .locator("[data-slot=item-group] > [data-slot=item]")
      .filter({
        has: page.getByRole("link", { name: `${title} updated`, exact: true }),
      });
    await row
      .getByRole("button", {
        name: `Actions for ${title} updated`,
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "Saved experiments keep their own rules and evidence",
    );
    await page
      .getByRole("button", { name: "Delete environment", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: `${title} updated`, exact: true }),
    ).toHaveCount(0);
    const retained = await (
      await request.get(`/api/studies/${studyId}`)
    ).json();
    expect(retained.design).toEqual(study.design);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
