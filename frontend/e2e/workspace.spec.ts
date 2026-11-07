import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

test("manual creation, revision, comparison and missing-key recovery", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/new?template=commons");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Browser QA · scarcity");
  await page.getByRole("tab", { name: "Execution", exact: true }).click();
  await page.getByLabel("Rounds per run").fill("3");
  await page.getByText(/^Replication ·/).click();
  await page.getByLabel("Matched seeds").fill("7");
  await page.getByLabel("Matched seeds").blur();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser QA · scarcity" }),
  ).toBeVisible();
  const studyURL = page.url();
  await page.getByRole("link", { name: "Tune", exact: true }).click();
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Browser QA · tuned");
  await page
    .getByRole("button", { name: "Save new revision", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser QA · tuned" }),
  ).toBeVisible();
  await page.goto(`${studyURL}?revision=1`);
  await expect(
    page.getByRole("heading", { name: "Browser QA · scarcity" }),
  ).toBeVisible();
  await expect(
    page.getByText("This is a preserved design revision.", { exact: false }),
  ).toBeVisible();
  await page.goto(studyURL);
  await page.getByRole("tab", { name: "Runs", exact: true }).click();
  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("link", { name: "Compare 2 runs" }).click();
  await expect(
    page.getByRole("heading", { name: "Compare runs", exact: true }),
  ).toBeVisible();
  await page.goto(`${studyURL}?tab=runs`);
  await page.getByRole("link", { name: "More resources", exact: true }).click();
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
  await expect(page.locator(".run-facts")).toContainText(
    `0 / ${run.summary.total_turns}`,
  );
  expect(errors).toEqual([]);
});

test("invalid specifications cannot switch into visual mode or create a study", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page.getByLabel("Complete JSON specification").fill('{"profiles":4}');
  await page.getByRole("tab", { name: "Question", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Specification" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("mobile navigation and theme persist without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
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
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Switch to light mode", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass("dark");
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
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
  await page.goto("/new");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page
    .getByLabel("Complete JSON specification")
    .fill(JSON.stringify(design));
  await page.getByRole("tab", { name: "Question", exact: true }).click();
  await page.getByRole("tab", { name: /^Agents/ }).click();
  await page
    .locator(".profile-heading")
    .filter({ hasText: removed.name })
    .click();
  await page
    .getByRole("button", { name: `Remove ${removed.name}`, exact: true })
    .click();
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  const changed = JSON.parse(
    await page.getByLabel("Complete JSON specification").inputValue(),
  );
  expect(changed.profiles).toHaveLength(design.profiles.length - 1);
  expect(changed.conditions[0].profile_overrides).toEqual([]);
  await page.getByRole("tab", { name: "Question", exact: true }).click();
  await page.getByRole("tab", { name: "Question", exact: true }).click();
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
  await page.goto("/new?plan=qa-plan");
  await expect(
    page.getByText("Reviewing the design", { exact: true }),
  ).toBeVisible();
  complete = true;
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    templateDesign(catalog).title,
  );
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
  await page.route("**/api/analyses", (route) =>
    route.fulfill({ json: [failed] }),
  );
  await page.route("**/api/analyses/qa-failed", (route) =>
    route.fulfill({ json: failed }),
  );
  await page.goto("/new?plan=qa-failed");
  await expect(page.getByRole("alert")).toContainText(failed.error);
  await page.getByRole("link", { name: "Back to Agent", exact: true }).click();
  await expect(page.getByLabel("Message Agent", { exact: true })).toHaveValue(
    question,
  );
  await page.goto("/new?plan=qa-failed");
  await expect(
    page.getByRole("heading", { name: "Design request stopped", exact: true }),
  ).toBeVisible();
});

test("drafts survive reload, recover incomplete edits and clear after saving", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  await page.goto("/");
  await expect(page.getByText(/^Drafts ·/)).toHaveCount(0);
  await page.goto("/new?template=commons");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Recovered protocol");
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    "Recovered protocol",
  );
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page.getByLabel("Complete JSON specification").fill('{"unfinished":');
  await page.reload();
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  await page.goto("/");
  await page.getByText(/^Drafts ·/).click();
  await page
    .getByRole("link", { name: "Recovered protocol", exact: true })
    .click();
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  await page.goto("/");
  await page.getByText(/^Drafts ·/).click();
  await page
    .getByRole("button", { name: "Discard Recovered protocol draft" })
    .click();
  await expect(page.getByText(/^Drafts ·/)).toHaveCount(0);
  await page.goto("/new?template=commons");
  await page.getByLabel("Experiment name", { exact: true }).fill("");
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Edit specification", exact: true })
    .click();
  const text = page.getByLabel("Complete JSON specification");
  const design = JSON.parse(await text.inputValue());
  expect(design.title).toBe("");
  design.title = "Recovered incomplete draft";
  await text.fill(JSON.stringify(design));
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: design.title })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(/^Drafts ·/)).toHaveCount(0);
});
