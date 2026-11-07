import { expect, test } from "@playwright/test";

test("JAS preserves the previous workspace theme and navigation preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("ass-theme", "dark");
    localStorage.setItem("ass-sidebar", "collapsed");
  });
  await page.goto("/");
  await expect(page).toHaveTitle("JAS — Agent Simulation Environment");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle sidebar", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass("dark");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="expanded"]'),
  ).toBeVisible();
});

test("experiments are the entry point; AI creation stays available without a key", async ({
  page,
}) => {
  await page.goto("/unknown-workspace-view");
  await expect(
    page.getByRole("navigation", { name: "breadcrumb" }),
  ).toContainText("Workspace");
  await page.getByRole("link", { name: "Back to experiments" }).click();
  await page.goto("/");
  await expect(page).toHaveURL(/\/studies$/);
  await expect(
    page.getByRole("heading", { name: "Experiments", exact: true }),
  ).toBeVisible();
  await page
    .locator("main")
    .getByRole("link", { name: "Design with AI", exact: true })
    .click();
  await page
    .getByLabel("Your research question")
    .fill("Does communication improve teamwork?");
  await expect(
    page.getByRole("button", { name: "Design experiment" }),
  ).toBeDisabled();
  await page
    .getByRole("link", { name: "Configure a provider", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not configured", { exact: true })).toHaveCount(
    2,
  );
});

test("opening the assistant preserves incomplete editor state and one recoverable draft", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Keep this protocol");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page.getByLabel("Complete JSON specification").fill('{"unfinished":');
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  await page.reload();
  await expect(page.getByLabel("Complete JSON specification")).toHaveValue(
    '{"unfinished":',
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("jas:draft:")),
    ),
  ).toEqual(["jas:draft:/new?template=commons"]);
});

test("experiment loading, error recovery, filters and keyboard access", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  await request.post("/api/studies", {
    data: {
      design: {
        ...catalog.templates[0].design,
        title: "Filter recovery study",
      },
    },
  });
  let failed = true;
  let releaseLoading = () => {};
  const loading = new Promise<void>((resolve) => {
    releaseLoading = resolve;
  });
  await page.route("**/api/studies", async (route) => {
    if (failed) {
      await loading;
      return route.fulfill({
        status: 503,
        json: { detail: "Workspace is temporarily unavailable" },
      });
    }
    return route.continue();
  });
  await page.goto("/studies");
  await expect(
    page.getByRole("status", { name: "Loading", exact: true }),
  ).toBeVisible();
  releaseLoading();
  await expect(page.getByRole("alert")).toContainText(
    "Workspace is temporarily unavailable",
  );
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Filter recovery study", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search experiments" })
    .fill("no-matching-experiment");
  await expect(
    page.getByText("No matching experiments", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  const record = page
    .locator("main")
    .getByRole("link", { name: "Filter recovery study", exact: true });
  await record.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Filter recovery study", exact: true }),
  ).toBeVisible();
});
