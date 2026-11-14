import { expect, test } from "@playwright/test";
import { settings as settingsFixture } from "../src/test/fixtures.js";
import { createStudy, setDeveloper } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await setDeveloper(request, true);
});

for (const width of [390, 1280]) {
  test(`workspace header stays visible above scrolling pages · ${width}`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 480 });
    const { study, run } = await createStudy(request);
    for (const path of [
      "/",
      "/new?template=commons",
      "/settings",
      "/environments",
      "/experiments",
      "/runs",
      `/experiments/${study.id}`,
      `/runs/${run.summary.id}`,
      "/compare",
      "/assistant",
    ]) {
      await page.goto(path);
      const header = page.locator('[data-slot="workspace-header"]');
      await expect(header).toBeVisible();
      await expect(
        page.getByRole("status", { name: "Loading", exact: true }),
      ).toHaveCount(0);
      await page.mouse.move(width - 16, 440);
      await page.mouse.wheel(0, 800);
      const content = page.locator('[data-slot="workspace-content"]');
      if (
        path !== "/assistant" &&
        (await content.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        ))
      ) {
        await expect
          .poll(() => content.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
      }
      // The viewport itself must not scroll; a sticky document header can still bounce.
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await expect.poll(async () => (await header.boundingBox())?.y).toBe(0);
      if (path.startsWith("/new")) {
        const save = page.getByRole("button", { name: "Save", exact: true });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeInViewport({ ratio: 1 });
      }
      expect(
        await header.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(bounds.right - 20, bounds.top + 20),
          );
        }),
      ).toBe(true);
      const theme = header.getByRole("button", { name: /Switch to .* mode/ });
      const name = await theme.getAttribute("aria-label");
      await theme.click();
      await expect(theme).not.toHaveAccessibleName(name ?? "");
    }
    if (width === 390) {
      await page.goto("/");
      await page
        .getByRole("region", { name: "Recent experiments" })
        .scrollIntoViewIfNeeded();
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("link", { name: "Experiments", exact: true })
        .click();
      await expect(page).toHaveURL(/\/experiments$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });
}

test("narrow navigation keeps the brand and collapse control on one row", async ({
  page,
}, testInfo) => {
  for (const width of [280, 320, 390, 700]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const header = page.locator(
      '[data-mobile="true"] [data-slot="sidebar-header"]',
    );
    const brand = await header
      .getByRole("link", { name: "JAS home" })
      .boundingBox();
    const control = await header.getByRole("button").first().boundingBox();
    expect(brand).not.toBeNull();
    expect(control).not.toBeNull();
    expect((control?.x ?? 0) + (control?.width ?? 0)).toBeLessThanOrEqual(
      width,
    );
    expect(
      Math.abs(
        (brand?.y ?? 0) +
          (brand?.height ?? 0) / 2 -
          (control?.y ?? 0) -
          (control?.height ?? 0) / 2,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath(`sidebar-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
  }
});

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
  await page.getByRole("button", { name: "Switch to light mode" }).click();
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
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
  await page.getByRole("link", { name: "Environments", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
  await page.goBack();
  await expect(page).toHaveTitle("JAS");
  await page.reload();
  await expect(page).toHaveTitle("JAS");
  for (const path of ["/new", "/runs", "/assistant", "/compare"]) {
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
  await page.goto(`/experiments/${study.id}`);
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
  await page.goto("/assistant");
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toContainText("Add context");
  await page
    .getByLabel("Message Assistant")
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
  await expect(page.getByRole("button", { name: /Add key$/ })).toHaveCount(3);
});

test("Agent navigation preserves incomplete editor state and one recoverable draft", async ({
  page,
}) => {
  await page.goto("/new?template=commons&mode=advanced");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Keep this protocol");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page.getByLabel("Complete JSON specification").fill('{"unfinished":');
  await expect(
    page.getByRole("button", { name: "Ask Assistant", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Generate with Assistant", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toContainText("Add context");
  await expect(
    page.getByLabel("Message Assistant", { exact: true }),
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
  await page.goto("/experiments");
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
  await page.goto("/assistant");
  const header = page.locator('[data-slot="workspace-header"]');
  await expect(header).not.toContainText("Agent");
  await expect(header.locator('[data-slot="separator"]')).toHaveCount(0);
  await expect(
    header.getByRole("link", { name: "GitHub repository" }),
  ).toHaveAttribute("href", "https://github.com/jaiamin/jas");
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
    trigger: 16,
    left: 16,
    right: 16,
  });
  const theme = header.getByRole("button", { name: /Switch to .* mode/ });
  await expect(theme).toHaveCSS("cursor", "pointer");
  await expect(page.getByLabel("Message Assistant", { exact: true })).toHaveCSS(
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
    page.getByRole("combobox", { name: "Search context", exact: true }),
  ).toHaveCSS("cursor", "text");
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
  const settings = footer.getByRole("link", { name: "Settings", exact: true });
  await expect(footer.getByRole("button")).toHaveCount(0);
  await expect(footer.locator('[data-slot="avatar"]')).toHaveCount(0);
  const separators = page.locator('[data-slot="sidebar-separator"]');
  const sectionLineBefore = await separators.first().boundingBox();
  const settingsBefore = await settings.boundingBox();
  await expect(
    page.locator('[data-sidebar="trigger"] .lucide-panel-left-close'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  const expand = page.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await expect(expand.locator(".lucide-panel-left-open")).toHaveCSS(
    "width",
    "16px",
  );
  await expect(expand).toHaveCSS("opacity", "0");
  await expect(separators).toHaveCount(1);
  await expect(separators.first()).toBeVisible();
  expect((await separators.first().boundingBox())?.y).toBe(
    sectionLineBefore?.y,
  );
  await expect(separators.last()).toBeVisible();
  await expect(settings).toHaveCSS("height", "32px");
  expect((await settings.boundingBox())?.y).toBe(settingsBefore?.y);
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
  await expect(page).toHaveURL(/\/assistant$/);
  for (const separator of await separators.all())
    await expect(separator).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
});

test("sidebar usage stays compact without hiding small charges or precise totals", async ({
  page,
}) => {
  let used = 0;
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
        ...settingsFixture,
        budget_usd: 25,
        charged_usd: used,
        usage: { ...settingsFixture.usage, cost_usd: used },
      },
    }),
  );
  for (const [value, visible, precise] of [
    [0, "$0.00", "$0.00"],
    [0.064321, "$0.064", "$0.064321"],
    [0.000001, "<$0.001", "$0.000001"],
    [0.001, "$0.001", "$0.001"],
    [1.234567, "$1.235", "$1.234567"],
  ] as const) {
    used = value;
    await page.goto("/assistant");
    const budget = page
      .locator('[data-slot="sidebar-footer"]')
      .getByRole("link", { name: /^Usage:/ });
    await expect(budget.locator(".tabular-nums")).toHaveText(
      `${visible} / $25.00`,
    );
    await budget.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      `${precise} / $25.00`,
    );
  }
});

for (const theme of ["light", "dark"]) {
  test(`usage hides when collapsed and selected icons stay outlined · ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          ...settingsFixture,
          charged_usd: 5,
          usage: { ...settingsFixture.usage, cost_usd: 5 },
        },
      }),
    );
    await page.goto("/assistant");
    const footer = page.locator('[data-slot="sidebar-footer"]');
    const budget = footer.getByRole("link", {
      name: /^Usage:/,
      includeHidden: true,
    });
    await expect(budget).toBeVisible();
    await expect(
      page.locator('[data-slot="sidebar-header"]').first(),
    ).toHaveCSS("border-bottom-width", "0px");
    await expect(page.locator('[data-slot="sidebar-separator"]')).toHaveCount(
      1,
    );
    await expect(budget).toHaveCSS("border-width", "1px");
    const divider = await page
      .locator('[data-slot="sidebar-separator"]')
      .boundingBox();
    const usageBox = await budget.boundingBox();
    expect(usageBox?.x).toBe(divider?.x);
    expect(usageBox?.width).toBe(divider?.width);
    const restingBackground = await budget.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await budget.hover();
    await expect(budget).not.toHaveCSS("background-color", restingBackground);
    await expect(budget.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    await page
      .getByRole("button", { name: "Collapse sidebar", exact: true })
      .click();
    await expect(budget).toBeHidden();
    await expect(page.locator('[data-slot="sidebar-container"]')).toHaveCSS(
      "width",
      "52px",
    );
    await expect(footer.getByRole("link")).toHaveCount(1);
    await expect(footer.getByRole("progressbar")).toHaveCount(0);
    for (const name of [
      "Home",
      "Gallery",
      "Experiments",
      "Runs",
      "Environments",
      "Settings",
    ]) {
      const link = page.getByRole("link", { name, exact: true });
      await link.click();
      await expect(link).toHaveAttribute("data-active", "true");
      for (const part of await link.locator("svg > *").all())
        await expect(part).toHaveCSS("fill", "none");
    }
    await page.locator('[data-slot="sidebar-header"]').first().hover();
    await page
      .getByRole("button", { name: "Expand sidebar", exact: true })
      .click();
    await expect(budget).toBeVisible();
    await budget.click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          ...settingsFixture,
          usage: { ...settingsFixture.usage, cost_usd: null },
          committed_tokens: 750,
          preferences: { ...settingsFixture.preferences, token_budget: 1000 },
        },
      }),
    );
    await page.reload();
    const tokens = footer.getByRole("link", { name: /^Tokens:/ });
    await expect(tokens.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "75",
    );
    await expect(tokens.locator(".tabular-nums")).toContainText("750");
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          ...settingsFixture,
          usage: { ...settingsFixture.usage, cost_usd: null },
        },
      }),
    );
    await page.reload();
    await expect(tokens.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow",
    );
  });

  test(`focus decoration follows keyboard navigation, not pointer clicks · ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.goto("/experiments");
    const search = page.getByRole("textbox", { name: "Search experiments" });
    const group = search.locator("..");
    const ring = (locator: typeof group) =>
      locator.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--tw-ring-shadow").trim(),
      );
    await search.click();
    const noRing = await ring(group);
    await search.pressSequentially("example");
    expect(await ring(group)).toBe(noRing);
    await search.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(search).toBeFocused();
    expect(await ring(group)).not.toBe(noRing);
    await search.click();
    expect(await ring(group)).toBe(noRing);
    const create = page.getByRole("link", {
      name: "New experiment",
      exact: true,
    });
    await page.keyboard.press("Tab");
    await expect(create).toBeFocused();
    const keyboardRing = await ring(create);
    await create.click({ modifiers: ["Control"] });
    expect(await ring(create)).not.toBe(keyboardRing);
    await page.goto("/assistant");
    const composer = page.getByRole("textbox").first();
    await composer.click();
    const textareaRing = await ring(composer);
    await composer.pressSequentially("A question");
    expect(await ring(composer)).toBe(textareaRing);
  });
}
