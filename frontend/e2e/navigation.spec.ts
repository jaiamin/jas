import { expect, test } from "@playwright/test";

test("JAS persists the workspace theme and navigation preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("jas-theme") === null) {
      localStorage.setItem("jas-theme", "dark");
    }
    if (localStorage.getItem("jas-sidebar") === null) {
      localStorage.setItem("jas-sidebar", "collapsed");
    }
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Experiments | JAS");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  const wordmark = page.locator(".brand-wordmark");
  await expect(wordmark).toHaveText("jas");
  await expect(wordmark).toBeHidden();
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(wordmark).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass("dark");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="expanded"]'),
  ).toBeVisible();
  await expect(wordmark).toBeVisible();
});

test("browser titles follow navigation, history and saved experiment identity", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Experiments | JAS");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveTitle("Settings | JAS");
  await page.getByRole("link", { name: "Environments", exact: true }).click();
  await expect(page).toHaveTitle("Environments | JAS");
  await page.goBack();
  await expect(page).toHaveTitle("Settings | JAS");
  await page.reload();
  await expect(page).toHaveTitle("Settings | JAS");
  for (const [path, title] of [
    ["/new", "New experiment"],
    ["/runs", "Runs"],
    ["/agent", "Agent"],
    ["/compare", "Compare runs"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} | JAS`);
  }
  const catalog = await (await request.get("/api/catalog")).json();
  const title = "Cooperation & evidence";
  const study = await (
    await request.post("/api/studies", {
      data: { design: { ...catalog.templates[0].design, title } },
    })
  ).json();
  await page.goto(`/studies/${study.id}`);
  await expect(page).toHaveTitle(`${title} | JAS`);
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
  await page.getByRole("link", { name: "Agent", exact: true }).click();
  await page.getByRole("combobox", { name: "Message context" }).click();
  await page
    .getByRole("option", { name: "New experiment", exact: true })
    .click();
  await page
    .getByLabel("Message Agent")
    .fill("Does communication improve teamwork?");
  await expect(
    page.getByRole("button", { name: "Send message" }),
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

test("Agent navigation preserves incomplete editor state and one recoverable draft", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Keep this protocol");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page.getByLabel("Complete JSON specification").fill('{"unfinished":');
  await expect(
    page.getByRole("button", { name: "Ask Agent", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Generate with Agent", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toContainText("New experiment");
  await expect(
    page.getByLabel("Message Agent", { exact: true }),
  ).not.toHaveValue("");
  await expect(page).toHaveTitle("Agent | JAS");
  await page.goBack();
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
  const title = `Filter recovery study ${crypto.randomUUID().slice(0, 8)}`;
  await request.post("/api/studies", {
    data: {
      design: {
        ...catalog.templates[0].design,
        title,
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
    page.locator("main").getByRole("link", { name: title, exact: true }),
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
    .getByRole("link", { name: title, exact: true });
  await record.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
});
