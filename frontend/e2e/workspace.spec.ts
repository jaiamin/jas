import { expect, test } from "@playwright/test";
import {
  selectEditorSection,
  setDeveloper,
  templateDesign,
} from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await setDeveloper(request, true);
});

test("manual creation, revision, comparison and missing-key recovery", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/new?template=commons&mode=advanced");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Browser QA · scarcity");
  await selectEditorSection(page, "Run plan");
  await page.getByLabel("Rounds per run").fill("3");
  await page.getByLabel("Matched seeds").fill("7");
  await page.getByLabel("Matched seeds").blur();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\//);
  await expect(
    page.getByRole("heading", { name: "Browser QA · scarcity" }),
  ).toBeVisible();
  const studyURL = page.url();
  await page.getByRole("link", { name: "Tune", exact: true }).click();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Browser QA · tuned");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\//);
  await expect(
    page.getByRole("heading", { name: "Browser QA · tuned" }),
  ).toBeVisible();
  await page.goto(`${studyURL}?revision=1`);
  await expect(
    page.getByRole("heading", { name: "Browser QA · scarcity" }),
  ).toBeVisible();
  await expect(
    page.getByText("This is a preserved design version.", { exact: false }),
  ).toBeVisible();
  await page.goto(studyURL);
  await page.getByRole("tab", { name: "Runs", exact: true }).click();
  await page.getByRole("button", { name: "Run table", exact: true }).click();
  const boxes = page.getByRole("table").locator("tbody").getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("link", { name: "Compare 2 runs" }).click();
  await expect(
    page.getByRole("heading", { name: "Compare runs", exact: true }),
  ).toBeVisible();
  await page.goto(`${studyURL}?tab=runs`);
  await page
    .getByRole("link", { name: /^More resources, seed 7, repetition 1:/ })
    .click();
  await page.route("**/api/runs/*/control", (route) =>
    route.fulfill({
      status: 422,
      json: { detail: "OPENAI_API_KEY is not configured" },
    }),
  );
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "OPENAI_API_KEY is not configured",
  );
  const id = new URL(page.url()).pathname.split("/").at(-1);
  const run = await (await request.get(`/api/runs/${id}`)).json();
  await expect(page.getByLabel("Run progress")).toContainText(
    `0 / ${run.summary.total_turns}`,
  );
  expect(errors).toEqual([]);
});

test("invalid specifications cannot switch into visual mode or create a study", async ({
  page,
}) => {
  await page.goto("/new?mode=advanced");
  await selectEditorSection(page, "Specification");
  await page.getByLabel("Complete JSON specification").fill('{"profiles":4}');
  await selectEditorSection(page, "Question");
  await expect(
    page.getByRole("button", { name: "Specification", includeHidden: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("mobile navigation and theme persist without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "JAS home" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close menu", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass("dark");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("removing agents removes condition overrides and environment changes need confirmation", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog);
  const removed = design.profiles[0];
  design.conditions[0].profile_overrides = [
    { ...removed, goal: "Compare an alternative incentive" },
  ];
  await page.goto("/new?mode=advanced");
  await selectEditorSection(page, "Specification");
  await page
    .getByLabel("Complete JSON specification")
    .fill(JSON.stringify(design));
  await selectEditorSection(page, "Question");
  await selectEditorSection(page, /^Agents/);
  await expect(
    page
      .getByRole("region", { name: "Agents", exact: true })
      .locator("[data-slot=accordion-trigger]:visible")
      .filter({ hasText: removed.name }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: `Remove ${removed.name}`, exact: true })
    .click();
  await selectEditorSection(page, "Specification");
  const changed = JSON.parse(
    await page.getByLabel("Complete JSON specification").inputValue(),
  );
  expect(changed.profiles).toHaveLength(design.profiles.length - 1);
  expect(changed.conditions[0].profile_overrides).toEqual([]);
  await selectEditorSection(page, "Question");
  await selectEditorSection(page, "Question");
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Trust exchange", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Environment", exact: true }),
  ).toHaveText("Shared commons");
});

test("AI design progress opens a reviewable protocol with design notes", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  let complete = false;
  await page.route("**/api/analyses/qa-plan", (route) =>
    route.fulfill({
      json: {
        id: "qa-plan",
        question: "When does cooperation decline?",
        status: complete ? "complete" : "pending",
        output: complete
          ? {
              supported: true,
              explanation: "A matched pilot.",
              design: templateDesign(catalog),
              planning: {
                brief: {
                  size_rationale:
                    "Repeated opportunities across independent seeds.",
                },
                sources: [
                  { title: "Methods", url: "https://example.org/methods" },
                ],
                reviews: [],
              },
            }
          : { stage: "reviewing" },
      },
    }),
  );
  await page.goto("/new?plan=qa-plan&mode=advanced");
  await expect(
    page.getByText("Reviewing the design", { exact: true }),
  ).toBeVisible();
  complete = true;
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    templateDesign(catalog).title,
  );
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page.getByText("Protocol notes", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Methods", exact: true }),
  ).toHaveAttribute("href", "https://example.org/methods");
});

test("failed AI designs remain reachable and restore the original question", async ({
  page,
}) => {
  const question = "When do agents stop reciprocating?";
  const failed = {
    id: "qa-failed",
    question,
    status: "failed",
    error: "Provider request timed out",
    output: null,
  };
  await page.route("**/api/analyses/qa-failed", (route) =>
    route.fulfill({ json: failed }),
  );
  await page.goto("/new?plan=qa-failed&mode=advanced");
  await expect(page.getByRole("alert")).toContainText(failed.error);
  await page
    .getByRole("link", { name: "Back to Assistant", exact: true })
    .click();
  await expect(
    page.getByLabel("Message Assistant", { exact: true }),
  ).toHaveValue(question);
  await page.goto("/new?plan=qa-failed&mode=advanced");
  await expect(
    page.getByRole("heading", { name: "Design request stopped", exact: true }),
  ).toBeVisible();
});

test("drafts survive reload, recover incomplete edits and clear after saving", async ({
  page,
}) => {
  await page.goto("/new?template=commons&mode=advanced");
  await page.goto("/experiments");
  await expect(page.getByText(/^Drafts ·/)).toHaveCount(0);
  await page.goto("/new?template=commons&mode=advanced");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Recovered protocol");
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    "Recovered protocol",
  );
  await selectEditorSection(page, "Specification");
  await page.getByLabel("Complete JSON specification").fill('{"unfinished":');
  await page.reload();
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  await page.goto("/experiments");
  await expect(
    page.getByRole("region", { name: "Drafts", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/^Drafts ·/)).toHaveCount(0);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Recovered protocol", exact: true })
    .click();
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  await page.goto("/experiments");
  await expect(
    page.getByRole("region", { name: "Drafts", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/^Drafts ·/)).toHaveCount(0);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Delete Recovered protocol draft" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete draft", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Drafts", exact: true }),
  ).toHaveCount(0);
  await page.goto("/new?template=commons&mode=advanced");
  await page.getByLabel("Experiment name", { exact: true }).fill("");
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  const name = page.getByLabel("Experiment name", { exact: true });
  await expect(name).toHaveValue("");
  await expect(
    page.getByText("Recover your draft", { exact: true }),
  ).toHaveCount(0);
  await name.fill("Recovered incomplete draft");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\//);
  await expect(
    page.getByRole("heading", {
      name: "Recovered incomplete draft",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Drafts", exact: true }),
  ).toHaveCount(0);
});

test("environment mechanics lead to editable reusable setups", async ({
  page,
}, testInfo) => {
  await page.goto("/environments");
  await page
    .getByRole("link", { name: "Explore Team coordination", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Observations & rules", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What agents observe" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Create experiment", exact: true })
    .click();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await selectEditorSection(page, /^Conditions/);
  await expect(
    page.getByRole("button", { name: /^Conditions/, includeHidden: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await selectEditorSection(page, "Question");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Supply-chain recovery");
  await page
    .getByRole("button", { name: "Experiment options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Save custom environment", exact: true })
    .click();
  await expect(
    page.getByText("Custom environment saved.", { exact: false }),
  ).toBeVisible();
  await page.goto("/environments?view=custom");
  await page
    .getByRole("link", { name: "Supply-chain recovery", exact: true })
    .click();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await selectEditorSection(page, "Question");
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    "Supply-chain recovery experiment",
  );
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Revised recovery");
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
  await expect(
    page.getByRole("link", { name: "Revised recovery", exact: true }),
  ).toBeVisible();
  await page
    .locator("[data-slot=item-group] > [data-slot=item]")
    .filter({
      has: page.getByRole("link", { name: "Revised recovery", exact: true }),
    })
    .getByRole("button", { name: "Actions for Revised recovery", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Revised recovery");
  await page.screenshot({
    path: testInfo.outputPath("setup-removal.png"),
    fullPage: false,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Revised recovery", exact: true }),
  ).toBeVisible();
  await page
    .locator("[data-slot=item-group] > [data-slot=item]")
    .filter({
      has: page.getByRole("link", { name: "Revised recovery", exact: true }),
    })
    .getByRole("button", { name: "Actions for Revised recovery", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete environment", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Revised recovery", exact: true }),
  ).toHaveCount(0);
});
