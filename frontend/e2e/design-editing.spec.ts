import { expect, test } from "@playwright/test";
import { setDeveloper, templateDesign } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await setDeveloper(request, true);
});

test("task prerequisite edits and deletion persist without stale dependent fields", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog, "coordination");
  design.tasks = [
    { key: "task-1", name: "First", effort: 2, dependencies: [] },
    { key: "task-2", name: "Second", effort: 2, dependencies: [] },
    { key: "task-3", name: "Third", effort: 2, dependencies: ["task-1"] },
  ];
  await page.goto("/new?template=coordination&mode=advanced");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page
    .getByLabel("Complete JSON specification")
    .fill(JSON.stringify(design));
  await page.getByRole("tab", { name: /^Conditions/ }).click();
  const prerequisites = page.getByLabel("Prerequisites for task-3", {
    exact: true,
  });
  await prerequisites.fill("task-2");
  await prerequisites.blur();
  await page
    .getByRole("button", { name: "Remove task-2", exact: true })
    .click();
  await expect(prerequisites).toHaveValue("");
  await prerequisites.fill("task-1");
  await prerequisites.blur();
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/studies") &&
      response.request().method() === "POST",
  );
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  const { id } = await (await saved).json();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  expect(study.design.tasks).toEqual([
    design.tasks[0],
    { ...design.tasks[2], dependencies: ["task-1"] },
  ]);
});

test("cloned conditions keep independent nested resource schedules through saving", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog);
  design.rounds = 6;
  design.conditions = design.conditions.slice(0, 1);
  design.conditions[0].parameters.resource_schedule = [
    { round: 2, endowment: 4 },
  ];
  await page.goto("/new?template=commons&mode=advanced");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page
    .getByLabel("Complete JSON specification")
    .fill(JSON.stringify(design));
  await page.getByRole("tab", { name: /^Conditions/ }).click();
  await page
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  const clone = page.locator("[data-slot=accordion-item]:visible").nth(1);
  await expect(
    clone.locator("[data-slot=accordion-trigger]:visible"),
  ).toHaveAttribute("aria-expanded", "true");
  await clone.getByText(/^Resource changes during the run/).click();
  const schedule = clone.locator("[data-slot=collapsible]").filter({
    has: page.getByRole("button", {
      name: "Add resource change",
      exact: true,
    }),
  });
  await schedule.getByLabel("Credits per round", { exact: true }).fill("9");
  await schedule
    .getByRole("button", { name: "Add resource change", exact: true })
    .click();
  await schedule.getByLabel("Starting round", { exact: true }).nth(1).fill("4");
  await schedule
    .getByLabel("Credits per round", { exact: true })
    .nth(1)
    .fill("6");
  await schedule
    .getByRole("button", { name: "Remove change", exact: true })
    .first()
    .click();
  await expect(
    schedule.getByLabel("Starting round", { exact: true }),
  ).toHaveValue("4");
  await expect(
    schedule.getByLabel("Credits per round", { exact: true }),
  ).toHaveValue("6");
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/studies") &&
      response.request().method() === "POST",
  );
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  const { id } = await (await saved).json();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  expect(study.design.conditions[0]).toEqual(design.conditions[0]);
  expect(study.design.conditions[1].parameters.resource_schedule).toEqual([
    { round: 4, endowment: 6 },
  ]);
});

test("editor select labels activate their associated controls", async ({
  page,
}) => {
  await page.goto("/new?template=composed&mode=advanced");
  const environment = page.getByRole("combobox", {
    name: "Environment",
    exact: true,
  });
  await page.locator('label[for="environment"]').click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(environment).toBeFocused();
  await page.getByRole("tab", { name: /^Conditions/ }).click();
  const labels = page.locator('[data-slot="field-label"][for]:visible');
  await expect
    .poll(() =>
      labels.evaluateAll((labels) =>
        labels.every((label) => (label as HTMLLabelElement).control !== null),
      ),
    )
    .toBe(true);
  const stock = page
    .getByRole("combobox", { name: "Stock visibility", exact: true })
    .first();
  const id = await stock.getAttribute("id");
  expect(id).toBeTruthy();
  await page.locator(`label[for="${id}"]`).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(stock).toBeFocused();
});
