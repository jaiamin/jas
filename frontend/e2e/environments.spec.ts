import { expect, test } from "@playwright/test";
import type { Catalog } from "../src/lib/types.js";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1600]) {
    test(`environment catalogue identities, details and navigation · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const catalog: Catalog = await (await request.get("/api/catalog")).json();
      await page.goto("/environments");
      await expect(page.getByRole("article")).toHaveCount(
        catalog.environments.length,
      );
      const heading = page.getByRole("heading", {
        name: "Environments",
        exact: true,
      });
      await expect(heading).toHaveCSS(
        "font-size",
        width < 640 ? "20px" : "22px",
      );
      const titleIcon = page.locator(
        '[data-slot="record-list-heading"] [data-slot="avatar"]',
      );
      await expect(titleIcon).toHaveCSS("width", "36px");
      await expect(titleIcon.locator("svg")).toHaveCSS("width", "18px");
      await expect(titleIcon.locator("svg > path").first()).not.toHaveCSS(
        "fill",
        "none",
      );
      await expect(titleIcon.locator("svg > path").last()).toHaveCSS(
        "fill",
        "none",
      );
      const iconBox = await titleIcon.boundingBox();
      const titleBox = await heading.boundingBox();
      expect(iconBox && titleBox).toBeTruthy();
      if (iconBox && titleBox)
        expect(
          Math.abs(
            iconBox.y + iconBox.height / 2 - titleBox.y - titleBox.height / 2,
          ),
        ).toBeLessThanOrEqual(1);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const marks = () =>
        page
          .getByRole("article")
          .locator("svg[data-environment]")
          .evaluateAll((elements) =>
            Object.fromEntries(
              elements.map((element) => [
                element.getAttribute("data-environment"),
                element.innerHTML,
              ]),
            ),
          );
      const before = await marks();
      expect(new Set(Object.values(before)).size).toBe(
        catalog.environments.length,
      );
      await page.reload();
      await expect(page.getByRole("article")).toHaveCount(
        catalog.environments.length,
      );
      expect(await marks()).toEqual(before);
      const card = page.getByRole("article", {
        name: "Shared commons",
        exact: true,
      });
      expect(
        await card
          .locator("p")
          .evaluate((element) => getComputedStyle(element).userSelect),
      ).not.toBe("none");
      const mark = card.locator("svg[data-environment]");
      await expect(card.locator('[data-slot="avatar"]')).toHaveCount(0);
      const geometry = await mark.evaluate((element) => {
        const svg = element as SVGSVGElement;
        const ink = svg.getBBox();
        const view = svg.viewBox.baseVal;
        const box = svg.getBoundingClientRect();
        return {
          left: ((ink.x - view.x) * box.width) / view.width,
          right:
            ((view.x + view.width - ink.x - ink.width) * box.width) /
            view.width,
          top: ((ink.y - view.y) * box.height) / view.height,
          bottom:
            ((view.y + view.height - ink.y - ink.height) * box.height) /
            view.height,
        };
      });
      for (const gap of Object.values(geometry))
        expect(gap).toBeGreaterThanOrEqual(3);
      const markBox = await mark.boundingBox();
      const textBox = await card
        .locator('[data-slot="item-content"]')
        .boundingBox();
      expect(markBox && textBox).toBeTruthy();
      if (markBox && textBox)
        expect(
          Math.abs(
            markBox.y + markBox.height / 2 - textBox.y - textBox.height / 2,
          ),
        ).toBeLessThanOrEqual(1);
      await expect(page.locator('[data-slot="card"]')).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`environments-${theme}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      const search = page.getByRole("textbox", {
        name: "Search environments",
        exact: true,
      });
      await search.fill("sealed extraction");
      await expect(page.getByRole("article")).toHaveCount(1);
      await expect(
        page.getByRole("article", { name: "Renewable resources", exact: true }),
      ).toBeVisible();
      await search.fill("not-a-world");
      await expect(
        page.getByText("No matching environments", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Clear search", exact: true })
        .click();
      for (const env of catalog.environments) {
        const trigger = page.getByRole("link", {
          name: `Explore ${env.name}`,
          exact: true,
        });
        await trigger.click();
        const panel = page.getByRole("dialog", { name: env.name, exact: true });
        await expect(panel).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`environment=${env.key}`));
        await expect(
          panel.getByRole("link", {
            name: "Configure experiment",
            exact: true,
          }),
        ).toHaveAttribute(
          "href",
          `/new?environment=${env.key}&step=conditions`,
        );
        await expect(
          panel.getByRole("link", { name: "Design with Agent", exact: true }),
        ).toHaveAttribute("href", "/agent");
        await panel
          .getByRole("button", { name: "Available controls", exact: true })
          .click();
        await expect(
          panel.getByText(
            "Edit controls, agent roles, memory and the horizon in an experiment. A narrative changes the context; these rules determine the consequences.",
            { exact: true },
          ),
        ).toBeVisible();
        await panel.getByRole("button", { name: /^Measurements/ }).click();
        await expect(
          panel.getByText(
            env.measure_definitions[env.primary_metric] ?? "Missing metric",
            { exact: true },
          ),
        ).toBeAttached();
        if (env.key === "commons") {
          const action = panel.getByRole("link", {
            name: "Configure experiment",
            exact: true,
          });
          const header = panel.locator('[data-slot="sheet-header"]');
          const startHeader = await header.boundingBox();
          const startAction = await action.boundingBox();
          await panel.locator("dd").last().scrollIntoViewIfNeeded();
          expect((await header.boundingBox())?.y).toBe(startHeader?.y);
          expect((await action.boundingBox())?.y).toBe(startAction?.y);
          await page.screenshot({
            path: testInfo.outputPath(`details-${theme}-${width}.png`),
            animations: "disabled",
          });
        }
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
      await page
        .getByRole("link", { name: "Explore Shared commons", exact: true })
        .click();
      await page.goBack();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.goto("/environments?environment=coordination");
      await expect(
        page.getByRole("dialog", { name: "Team coordination", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Environments", exact: true }),
      ).toBeFocused();
      await page.getByRole("tab", { name: "Custom", exact: true }).click();
      await expect(page).toHaveURL(/view=custom/);
      await expect(page.getByRole("article")).toHaveCount(0);
      await expect(
        page.locator('[data-slot="record-list-heading"]').getByRole("link"),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      expect(errors).toEqual([]);
    });
  }
}

test("environment data loads independently and errors retain cached content", async ({
  page,
}) => {
  let releaseCatalog = () => {};
  let releaseCustom = () => {};
  const catalogGate = new Promise<void>((resolve) => {
    releaseCatalog = resolve;
  });
  const customGate = new Promise<void>((resolve) => {
    releaseCustom = resolve;
  });
  let failCatalog = false;
  await page.route("**/api/catalog", async (route) => {
    await catalogGate;
    if (failCatalog)
      await route.fulfill({
        status: 503,
        json: { detail: "Catalogue unavailable" },
      });
    else await route.continue();
  });
  await page.route("**/api/environments", async (route) => {
    await customGate;
    await route.fulfill({ json: [] });
  });
  try {
    await page.goto("/environments");
    await expect(
      page.getByRole("status", { name: "Loading environments", exact: true }),
    ).toBeVisible();
    const loadingRow = await page
      .getByRole("status", { name: "Loading environments", exact: true })
      .locator('[data-slot="item"]')
      .first()
      .boundingBox();
    await expect(page.locator("header [data-slot=skeleton]")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Search environments", exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Custom", exact: true }).click();
    await expect(
      page.getByRole("status", {
        name: "Loading custom environments",
        exact: true,
      }),
    ).toBeVisible();
    releaseCustom();
    await expect(
      page.getByText("No custom environments yet", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.getByRole("tab", { name: "Built-in", exact: true }).click();
    releaseCatalog();
    await expect(page.getByRole("article")).toHaveCount(9);
    await expect(page.getByRole("status")).toHaveCount(0);
    const loadedRow = await page
      .getByRole("article")
      .first()
      .locator('[data-slot="item"]')
      .boundingBox();
    expect(loadingRow && loadedRow).toBeTruthy();
    if (loadingRow && loadedRow)
      expect(
        Math.abs(loadingRow.height - loadedRow.height),
      ).toBeLessThanOrEqual(1);
    failCatalog = true;
    await page.waitForTimeout(1100);
    await page.getByRole("link", { name: "Runs", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Runs", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Environments", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Catalogue unavailable",
    );
    await expect(page.getByRole("article")).toHaveCount(9);
    await expect(
      page.getByRole("status", { name: "Loading environments", exact: true }),
    ).toHaveCount(0);
    failCatalog = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(9);
    await page.goto("/environments?environment=missing");
    await expect(
      page.getByText("Environment not found", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Browse environments", exact: true })
      .click();
    await expect(page).toHaveURL(/\/environments$/);
  } finally {
    releaseCatalog();
    releaseCustom();
  }
});
