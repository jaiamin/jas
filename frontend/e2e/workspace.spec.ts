import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const settings = await (await request.get("/api/settings")).json();
  expect(settings.providers).toEqual({ openai: false, anthropic: false });
});

test("manual creation, revision, comparison and missing-key recovery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/new?template=commons");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Browser QA · scarcity");
  await page.getByLabel("Rounds per run").fill("3");
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
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "OPENAI_API_KEY is not configured",
  );
  await expect(page.getByText("0 / 18", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test("invalid specifications cannot switch into visual mode or create a study", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page.getByLabel("Complete JSON specification").fill('{"profiles":4}');
  await page.getByRole("tab", { name: "Study design", exact: true }).click();
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
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace settings", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass("dark");
});
