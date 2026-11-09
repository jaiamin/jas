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
  await expect(page).toHaveTitle("JAS");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  const wordmark = page.getByRole("link", { name: "JAS home" });
  await expect(wordmark).toBeVisible();
  await page.locator('[data-slot="sidebar-header"]').first().hover();
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(wordmark).toBeVisible();
  await page.getByRole("button", { name: /Local workspace/ }).click();
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass("dark");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="expanded"]'),
  ).toBeVisible();
  await expect(wordmark).toBeVisible();
});

test("browser title stays JAS across navigation, history and saved experiments", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("JAS");
  await page.getByRole("button", { name: /Local workspace/ }).click();
  await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
  await page.getByRole("link", { name: "Environments", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
  await page.goBack();
  await expect(page).toHaveTitle("JAS");
  await page.reload();
  await expect(page).toHaveTitle("JAS");
  for (const path of ["/new", "/runs", "/agent", "/compare"]) {
    await page.goto(path);
    await expect(page).toHaveTitle("JAS");
  }
  const catalog = await (await request.get("/api/catalog")).json();
  const title = "Cooperation & evidence";
  const study = await (
    await request.post("/api/studies", {
      data: { design: { ...catalog.templates[0].design, title } },
    })
  ).json();
  await page.goto(`/studies/${study.id}`);
  await expect(page).toHaveTitle("JAS");
});

test("Home is the entry point; AI creation stays available without a key", async ({
  page,
}) => {
  await page.goto("/unknown-workspace-view");
  await expect(page.getByText("Page not found", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to experiments" }).click();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", {
      name: "What would you like to test?",
      exact: true,
    }),
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
  await expect(page).toHaveTitle("JAS");
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

test("compact header, footer Settings and collapsed brand overlay stay navigable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/agent");
  const header = page.locator('[data-slot="workspace-header"]');
  await expect(header).not.toContainText("Agent");
  await expect(header.locator('[data-slot="separator"]')).toHaveCount(0);
  await expect(
    header.getByRole("link", { name: "GitHub repository" }),
  ).toHaveAttribute("href", "https://github.com/jaiamin/ass");
  const geometry = await page.evaluate(() => {
    function box(selector: string) {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing icon: ${selector}`);
      return element.getBoundingClientRect();
    }
    const nav = box('[aria-label="Main navigation"] svg');
    const github = box('[aria-label="GitHub repository"] svg');
    const theme = box('[data-slot="workspace-header"] button svg');
    const trigger = box('[data-sidebar="trigger"] svg');
    return {
      nav: nav.width,
      github: github.width,
      theme: theme.width,
      trigger: trigger.width,
      left: nav.left,
      right: innerWidth - github.right,
    };
  });
  expect(geometry).toEqual({
    nav: 15,
    github: 16,
    theme: 16,
    trigger: 15,
    left: 16,
    right: 16,
  });
  const theme = header.getByRole("button", { name: /Switch to .* mode/ });
  await expect(theme).toHaveCSS("cursor", "pointer");
  await expect(page.getByLabel("Message Agent", { exact: true })).toHaveCSS(
    "cursor",
    "text",
  );
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).not.toHaveCSS("cursor", "pointer");
  const context = page.getByRole("combobox", { name: "Message context" });
  await expect(context).toHaveCSS("cursor", "pointer");
  await context.click();
  await expect(
    page.getByRole("option", { name: "New experiment", exact: true }),
  ).toHaveCSS("cursor", "pointer");
  await page.keyboard.press("Escape");
  const previous = await page.locator("html").getAttribute("class");
  await theme.click();
  await expect(page.locator("html")).not.toHaveAttribute(
    "class",
    previous ?? "",
  );
  await page.reload();
  await expect(theme).toHaveAccessibleName(
    previous?.includes("dark") ? "Switch to dark mode" : "Switch to light mode",
  );
  await expect(
    page.getByRole("link", { name: "Design an experiment", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Explore environments", exact: true }),
  ).toHaveCount(0);
  const brand = page.getByRole("link", { name: "JAS home" });
  const logo = brand.locator("img");
  const before = await logo.boundingBox();
  const footer = page.locator('[data-slot="sidebar-footer"]');
  const avatar = footer.locator('[data-slot="avatar"]');
  const avatarBefore = await avatar.boundingBox();
  const settingsBefore = await footer
    .getByRole("link", { name: "Settings", exact: true })
    .boundingBox();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  const expand = page.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await expect(expand).toHaveCSS("opacity", "0");
  const separators = page.locator('[data-slot="sidebar-separator"]');
  await expect(separators).toHaveCount(2);
  await expect(separators.first()).toBeHidden();
  await expect(separators.last()).toBeVisible();
  await expect(footer.getByRole("button")).toHaveCSS("height", "48px");
  expect((await avatar.boundingBox())?.y).toBe(avatarBefore?.y);
  expect(
    (
      await footer
        .getByRole("link", { name: "Settings", exact: true })
        .boundingBox()
    )?.y,
  ).toBe(settingsBefore?.y);
  await page.mouse.move(800, 400);
  await expect(logo).toHaveJSProperty("complete", true);
  const after = await logo.boundingBox();
  expect(after?.x).toBe(before?.x);
  await expect(expand).toBeFocused();
  await expand.press("Shift+Tab");
  await brand.press("Tab");
  await expect(expand).toBeFocused();
  await expect(expand).toHaveCSS("opacity", "1");
  await expand.press("Tab");
  await expect(expand).toHaveCSS("opacity", "0");
  await page.locator('[data-slot="sidebar-header"]').first().hover();
  await expect(expand).toHaveCSS("opacity", "1");
  await expect(brand).toHaveCSS("opacity", "0");
  await expand.click();
  await expect(page).toHaveURL(/\/agent$/);
  for (const separator of await separators.all())
    await expect(separator).toBeVisible();
  await page
    .getByRole("navigation", { name: "Workspace settings" })
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page).toHaveTitle("JAS");
});
