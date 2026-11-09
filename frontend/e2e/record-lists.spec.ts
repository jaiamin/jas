import { expect, test } from "@playwright/test";
import type { Catalog } from "../src/lib/types.js";
import { createStudy } from "./helpers.js";

for (const [path, noun, size] of [
  ["/studies", "experiments", 10],
  ["/runs", "runs", 15],
] as const) {
  for (const theme of ["light", "dark"]) {
    test(`select all ${noun} stays aligned and respects pages and filters · ${theme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({
        width: theme === "dark" ? 390 : 1600,
        height: 900,
      });
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      const { study } = await createStudy(request);
      const summary = (await (await request.get("/api/studies")).json()).find(
        (item: { id: string }) => item.id === study.id,
      );
      const records = Array.from({ length: size + 1 }, (_, index) =>
        path === "/studies"
          ? { ...summary, id: `study-${index}`, title: `Record ${index + 1}` }
          : {
              ...study.runs[0],
              id: `run-${index}`,
              condition: `Record ${index + 1}`,
            },
      );
      let release = () => {};
      const ready = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(`**/api${path}`, async (route) => {
        await ready;
        await route.fulfill({ json: records });
      });
      await page.goto(path);
      const all = page.getByRole("checkbox", {
        name: `Select all ${noun} on this page`,
      });
      await expect(all).toHaveCSS("opacity", "0");
      await expect(all).toBeDisabled();
      release();
      await expect(all).toBeEnabled();
      await page
        .getByRole("columnheader", { name: "Name", exact: true })
        .hover();
      await expect(all).toHaveCSS("opacity", "1");
      await page.mouse.move(0, 0);
      await expect(all).toHaveCSS("opacity", "0");
      await all.focus();
      await expect(all).toHaveCSS("opacity", "1");
      const table = page.getByRole("table");
      const rows = table.locator("tbody").getByRole("checkbox");
      const headerBox = await all.boundingBox();
      const rowBox = await rows.first().boundingBox();
      expect(headerBox?.x).toBe(rowBox?.x);
      const headingBox = await page
        .getByRole("columnheader", { name: "Name", exact: true })
        .boundingBox();
      expect(
        headerBox &&
          headingBox &&
          Math.abs(
            headerBox.y +
              headerBox.height / 2 -
              headingBox.y -
              headingBox.height / 2,
          ),
      ).toBeLessThanOrEqual(1);
      await expect(all).toHaveCSS("opacity", "1");
      await all.click();
      await expect(all).toBeChecked();
      await expect(
        table.locator('tbody [role="checkbox"][aria-checked="true"]'),
      ).toHaveCount(size);
      if (path === "/runs") {
        await expect(
          page.getByRole("button", { name: "Compare up to 4 runs" }),
        ).toBeDisabled();
      }
      await rows.first().click();
      await page.mouse.move(0, 0);
      await expect(all).toHaveAttribute("aria-checked", "mixed");
      await expect(all).toHaveCSS("opacity", "1");
      await page.screenshot({
        path: testInfo.outputPath(`select-all-${noun}-${theme}.png`),
      });
      await all.click();
      const singular = path === "/studies" ? "experiment" : "run";
      await page.getByRole("button", { name: `Next ${singular} page` }).click();
      await expect(all).not.toBeChecked();
      await all.click();
      await expect(
        page.getByRole("status").filter({ hasText: `${size + 1} selected` }),
      ).toBeVisible();
      const search = page.getByRole("textbox", { name: `Search ${noun}` });
      await search.fill("Record 1");
      await expect(all).toBeChecked();
      const filteredCount = await rows.count();
      await all.click();
      await expect(
        table.locator('tbody [role="checkbox"][aria-checked="true"]'),
      ).toHaveCount(0);
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: `${size + 1 - filteredCount} selected` }),
      ).toBeVisible();
      await search.fill("does not exist");
      await expect(all).toBeDisabled();
      await search.fill("");
      await expect(all).toHaveAttribute("aria-checked", "mixed");
      await page.getByRole("button", { name: "Clear selection" }).click();
      await expect(all).not.toBeChecked();
    });
  }
}

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1600]) {
    test(`record lists share a full-width header and searchable tables · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      const { study } = await createStudy(request);
      const catalog: Catalog = await (await request.get("/api/catalog")).json();
      await page.addInitScript((design) => {
        localStorage.setItem(
          "jas:draft:/new",
          JSON.stringify({
            path: "/new",
            title: "An unfinished draft",
            updated: new Date().toISOString(),
            design,
            json: JSON.stringify(design),
            mode: "visual",
          }),
        );
      }, study.design);
      const summaries = await (await request.get("/api/studies")).json();
      await page.route("**/api/studies", (route) =>
        route.fulfill({
          json: summaries.filter(
            (item: { id: string }) => item.id === study.id,
          ),
        }),
      );
      await page.route("**/api/runs", (route) =>
        route.fulfill({ json: study.runs }),
      );
      for (const [path, title, noun] of [
        ["/studies", "Experiments", "experiments"],
        ["/runs", "Runs", "runs"],
      ] as const) {
        await page.goto(path);
        const main = page.locator("#main");
        const header = main.locator('[data-slot="record-list-heading"]');
        const heading = header.getByRole("heading", {
          name: title,
          exact: true,
        });
        await expect(heading).toBeVisible();
        const icon = header.locator('[data-slot="avatar"]');
        await expect(icon).toBeVisible();
        await expect(icon).toHaveCSS("width", "36px");
        expect(
          await icon.evaluate(
            (element) => getComputedStyle(element, "::after").borderTopWidth,
          ),
        ).toBe("0px");
        await expect(icon.locator("svg")).toHaveCSS("width", "18px");
        expect(
          await icon.evaluate((element) => {
            const style = getComputedStyle(element);
            const radius = Number.parseFloat(style.borderTopLeftRadius);
            return radius > 0 && radius < element.clientWidth / 2;
          }),
        ).toBe(true);
        const filledIcon = icon.locator(
          path === "/studies" ? "[data-liquid]" : "svg",
        );
        expect(
          await filledIcon.evaluate(
            (element) => getComputedStyle(element).fill,
          ),
        ).not.toBe("none");
        const search = header.getByRole("textbox", { name: `Search ${noun}` });
        await expect(search).toBeVisible();
        const create = header.getByRole("link", {
          name: "New experiment",
          exact: true,
        });
        await expect(create).toHaveText("New");
        await expect(create).toHaveAttribute("href", "/new");
        await expect(main.getByRole("table")).toBeVisible();
        await expect(main.locator('[data-slot="skeleton"]')).toHaveCount(0);
        const tableBounds = await main
          .locator('[data-slot="table-container"]')
          .boundingBox();
        const geometry = await main.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            x: bounds.x,
            width: bounds.width,
            left: Number.parseFloat(style.paddingLeft),
            right: Number.parseFloat(style.paddingRight),
          };
        });
        expect(geometry.left).toBe(0);
        expect(geometry.right).toBe(0);
        const headerPadding = await header.evaluate((element) => {
          const style = getComputedStyle(element);
          return { right: style.paddingRight };
        });
        const table = main.getByRole("table");
        for (const name of [
          path === "/studies" ? "Environment" : "Experiment",
          "Status",
        ]) {
          const filter = main.getByRole("group", {
            name: `${name} filter`,
            exact: true,
          });
          await expect(filter.locator(":scope > :first-child")).toHaveCSS(
            "font-size",
            "13px",
          );
          await expect(filter.locator(":scope > :first-child")).toHaveCSS(
            "font-weight",
            "500",
          );
          await expect(filter.getByRole("combobox")).toHaveCSS(
            "font-size",
            "13px",
          );
          await expect(filter.getByRole("combobox")).toHaveCSS(
            "font-weight",
            "400",
          );
          await expect(filter.getByRole("combobox")).toHaveCSS(
            "height",
            "28px",
          );
          expect(
            await filter.evaluate((element) => {
              const style = getComputedStyle(
                element.parentElement as HTMLElement,
              );
              return [style.paddingTop, style.paddingBottom];
            }),
          ).toEqual(["12px", "12px"]);
        }
        await expect(table.getByRole("columnheader")).toHaveText(
          path === "/studies"
            ? [
                "Name",
                "Favorite",
                "Environment",
                "Status",
                "Revision",
                "Runs",
                "Created",
                "Actions",
              ]
            : [
                "Name",
                "Favorite",
                "Experiment",
                "Status",
                "Seed",
                "Revision",
                "Repetition",
                "Progress",
                "Cost",
                "Created",
                "Actions",
              ],
        );
        const cells = table.getByRole("row").nth(1).getByRole("cell");
        const favoriteHeading = table.getByRole("columnheader", {
          name: "Favorite",
          exact: true,
        });
        await expect(favoriteHeading).toHaveCSS("font-size", "12px");
        const favoriteTextX = await favoriteHeading.evaluate(
          (element) =>
            element.getBoundingClientRect().x +
            Number.parseFloat(getComputedStyle(element).paddingLeft),
        );
        const starX = await cells
          .nth(1)
          .locator("svg")
          .evaluate((element) => element.getBoundingClientRect().x);
        expect(Math.abs(starX - favoriteTextX)).toBeLessThanOrEqual(1);
        if (path === "/studies") {
          await expect(cells.nth(0)).toHaveText(study.design.title);
          await expect(cells.nth(2)).toHaveText(
            catalog.environments.find(
              (environment) => environment.key === study.design.environment,
            )?.name ?? "Missing catalogue environment",
          );
          await expect(cells.nth(4)).toHaveText(String(study.revision));
          await expect(cells.nth(0).getByRole("link")).toHaveCSS(
            "font-weight",
            "400",
          );
        } else {
          const run = study.runs[0];
          if (!run) throw new Error("Expected a created run");
          await expect(cells.nth(0)).toHaveText(run.condition);
          await expect(cells.nth(4)).toHaveText(String(run.seed));
          await expect(cells.nth(5)).toHaveText(String(run.revision));
          await expect(cells.nth(6)).toHaveText(String(run.repetition));
          await expect(cells.nth(0).getByRole("link")).toHaveCSS(
            "font-weight",
            "400",
          );
        }
        const dateCell = cells.nth(path === "/studies" ? 6 : 9);
        expect(
          await dateCell.evaluate((cell) => getComputedStyle(cell).color),
        ).toBe(
          await cells.nth(0).evaluate((cell) => getComputedStyle(cell).color),
        );
        await expect(dateCell).not.toBeEmpty();
        await expect(heading).toHaveCSS("font-weight", "600");
        await expect(heading).toHaveCSS(
          "font-size",
          width < 640 ? "20px" : "22px",
        );
        await expect(table.getByRole("row").last()).toHaveCSS(
          "border-bottom-width",
          "1px",
        );
        for (const row of [
          table.getByRole("row").first(),
          table.getByRole("row").nth(1),
        ]) {
          await expect(row.locator(":scope > :first-child")).toHaveCSS(
            "padding-left",
            "32px",
          );
          await expect(row.locator(":scope > :last-child")).toHaveCSS(
            "padding-right",
            headerPadding.right,
          );
        }
        await expect(main.getByText(/^\d+ (?:experiments?|runs)$/)).toHaveCount(
          0,
        );
        await expect(
          main.getByRole("columnheader", {
            name: "Name",
            exact: true,
          }),
        ).toBeVisible();
        for (const cell of await table.locator("th, td").all()) {
          await expect(cell).toHaveCSS("text-align", /^(?:start|left)$/);
        }
        if (path === "/studies") {
          await expect(
            main.getByText("An unfinished draft", { exact: true }),
          ).toHaveCount(0);
          await expect(
            main.getByRole("button", { name: /^Drafts/ }),
          ).toHaveCount(0);
        }
        expect(tableBounds?.x).toBeCloseTo(geometry.x, 0);
        expect(tableBounds?.width).toBeCloseTo(
          geometry.width - geometry.left - geometry.right,
          0,
        );
        expect(geometry.width).toBeCloseTo(
          await page
            .locator('[data-slot="workspace-content"]')
            .evaluate((element) => element.clientWidth),
          0,
        );
        const headingBounds = await heading.boundingBox();
        const searchBounds = await search.boundingBox();
        const iconBounds = await icon.boundingBox();
        const createBounds = await create.boundingBox();
        expect(
          headingBounds &&
            iconBounds &&
            Math.abs(
              headingBounds.y +
                headingBounds.height / 2 -
                iconBounds.y -
                iconBounds.height / 2,
            ),
        ).toBeLessThanOrEqual(1);
        if (width > 640) {
          expect(
            headingBounds &&
              searchBounds &&
              searchBounds.x > headingBounds.x + headingBounds.width,
          ).toBe(true);
          expect(
            createBounds &&
              iconBounds &&
              Math.abs(
                createBounds.y +
                  createBounds.height / 2 -
                  iconBounds.y -
                  iconBounds.height / 2,
              ),
          ).toBeLessThanOrEqual(1);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        ).toBe(false);
        await page.screenshot({
          path: testInfo.outputPath(`${noun}-${theme}-${width}.png`),
          animations: "disabled",
        });
        await search.fill("nothing-will-match-this-query");
        await expect(
          main.getByText(`No matching ${noun}`, { exact: true }),
        ).toBeVisible();
        await main
          .getByRole("button", { name: "Clear filters", exact: true })
          .click();
        await expect(search).toHaveValue("");
        await expect(main.getByRole("row")).toHaveCount(
          path === "/studies" ? 2 : study.runs.length + 1,
        );
        if (path === "/runs") {
          await expect(
            main.getByRole("columnheader", { name: "Experiment", exact: true }),
          ).toBeVisible();
          await expect(
            main
              .getByRole("link", { name: study.design.title, exact: true })
              .first(),
          ).toHaveAttribute(
            "href",
            `/studies/${study.id}?revision=${study.runs[0]?.revision}`,
          );
        }
      }
    });
  }
}

for (const [path, endpoint, title, noun] of [
  ["/studies", "studies", "Experiments", "experiments"],
  ["/runs", "runs", "Runs", "runs"],
] as const) {
  for (const width of [390, 1280]) {
    test(`${title} keeps its header usable while rows load and when empty · ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("jas-theme", theme),
        width === 390 ? "dark" : "light",
      );
      let release = () => {};
      const ready = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(`**/api/${endpoint}`, async (route) => {
        await ready;
        await route.fulfill({ json: [] });
      });
      await page.goto(path);
      const scope = page.getByRole("combobox", {
        name: path === "/studies" ? "Filter environment" : "Filter experiment",
        exact: true,
      });
      if (path === "/studies") await expect(scope).toBeEnabled();
      else await expect(scope).toBeDisabled();
      await expect(
        page.getByRole("status", { name: "Loading", exact: true }),
      ).toBeVisible();
      const header = page.locator('[data-slot="record-list-heading"]');
      const search = header.getByRole("textbox", { name: `Search ${noun}` });
      await expect(
        header.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await expect(
        header.getByRole("link", { name: "New experiment", exact: true }),
      ).toBeVisible();
      await expect(header.locator('[data-slot="skeleton"]')).toHaveCount(0);
      const table = page.getByRole("table");
      await expect(
        table.getByRole("columnheader", { name: "Revision", exact: true }),
      ).toBeVisible();
      await expect(table.locator("thead [data-slot=skeleton]")).toHaveCount(0);
      await expect(table.locator("tbody [data-slot=skeleton]")).toHaveCount(
        path === "/studies" ? 27 : 33,
      );
      await expect(table.locator("tbody")).toHaveAttribute("aria-busy", "true");
      await expect(table.locator("tbody")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await expect(table.locator("tbody tr").first()).toHaveCSS(
        "height",
        "45px",
      );
      await expect(table.locator("tbody button, tbody a")).toHaveCount(0);
      await expect(
        page.getByRole("navigation", { name: /^(Experiment|Run) pages$/ }),
      ).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`${noun}-loading.png`),
      });
      await expect(
        page.getByRole("combobox", {
          name:
            path === "/studies"
              ? "Filter experiment status"
              : "Filter run status",
        }),
      ).toBeEnabled();
      await expect(
        page.getByRole("tablist", { name: `View ${noun}` }),
      ).toBeVisible();
      const labels = table.locator("thead");
      const before = await labels.boundingBox();
      await search.fill("Keep this query");
      release();
      await expect(
        page.getByRole("status", { name: "Loading", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText(`No ${noun} yet`, { exact: true }),
      ).toBeVisible();
      await expect(search).toHaveValue("Keep this query");
      await expect(
        page.getByRole("combobox", {
          name:
            path === "/studies" ? "Filter environment" : "Filter experiment",
          exact: true,
        }),
      ).toBeEnabled();
      await expect(table.locator('[data-slot="skeleton"]')).toHaveCount(0);
      const after = await labels.boundingBox();
      expect(after?.y).toBe(before?.y);
      await expect(table.locator("tbody")).toHaveAttribute(
        "aria-busy",
        "false",
      );
    });
  }
}

for (const empty of [false, true]) {
  test(`Experiments only waits for missing environment cells, not loaded records · empty ${empty}`, async ({
    page,
    request,
  }, testInfo) => {
    const { study } = await createStudy(request);
    const summaries = await (await request.get("/api/studies")).json();
    const catalog: Catalog = await (await request.get("/api/catalog")).json();
    await page.route("**/api/studies", (route) =>
      route.fulfill({
        json: empty
          ? []
          : summaries.filter((item: { id: string }) => item.id === study.id),
      }),
    );
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    let fail = true;
    await page.route("**/api/catalog", async (route) => {
      await ready;
      await route.fulfill(
        fail
          ? { status: 503, json: { detail: "Catalogue unavailable" } }
          : { json: catalog },
      );
    });
    await page.goto("/studies");
    const table = page.getByRole("table");
    const row = table.locator("tbody tr").first();
    const scope = page.getByRole("combobox", {
      name: "Filter environment",
      exact: true,
    });
    await expect(scope).toBeDisabled();
    if (empty) {
      await expect(
        page.getByText("No experiments yet", { exact: true }),
      ).toBeVisible();
      await expect(table.locator('[data-slot="skeleton"]')).toHaveCount(0);
      await expect(
        page.getByRole("status", { name: "Loading", exact: true }),
      ).toHaveCount(0);
    } else {
      await expect(
        row.getByRole("link", { name: study.design.title, exact: true }),
      ).toBeVisible();
      await expect(table.locator('[data-slot="skeleton"]')).toHaveCount(1);
      await expect(
        row.getByRole("cell").nth(2).locator('[data-slot="skeleton"]'),
      ).toHaveCount(1);
      await expect(row).toHaveCSS("height", "45px");
      await expect(table.locator("tbody")).toHaveAttribute("aria-busy", "true");
      await row.hover();
      await row.getByRole("checkbox").check();
      await page.screenshot({
        path: testInfo.outputPath("environment-only-loading.png"),
      });
    }
    release();
    await expect(page.getByRole("alert")).toContainText(
      "Catalogue unavailable",
    );
    await expect(table.locator('[data-slot="skeleton"]')).toHaveCount(0);
    await expect(
      page.getByRole("status", { name: "Loading", exact: true }),
    ).toHaveCount(0);
    if (!empty) {
      await expect(row.getByRole("checkbox")).toBeChecked();
      await expect(row.getByRole("cell").nth(2)).toHaveText("Unavailable");
    }
    fail = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(scope).toBeEnabled();
    if (!empty) {
      await expect(row.getByRole("cell").nth(2)).toHaveText(
        catalog.environments.find(
          (environment) => environment.key === study.design.environment,
        )?.name ?? "Missing catalogue environment",
      );
      await expect(row.getByRole("checkbox")).toBeChecked();
      await expect(row).toHaveCSS("height", "45px");
    }
  });
}

for (const [path, noun] of [
  ["/studies", "experiments"],
  ["/runs", "runs"],
] as const) {
  test(`${noun} favorites persist, filter with search, and recover from a storage failure`, async ({
    page,
    request,
  }) => {
    const { study } = await createStudy(request);
    const summaries = await (await request.get("/api/studies")).json();
    await page.route("**/api/studies", (route) =>
      route.fulfill({
        json: summaries.filter((item: { id: string }) => item.id === study.id),
      }),
    );
    await page.route("**/api/runs", (route) =>
      route.fulfill({ json: study.runs }),
    );
    await page.goto(path);
    const table = page.getByRole("table");
    const favorite = () =>
      table
        .getByRole("button", {
          name: /^(?:Add|Remove) .* (?:to|from) favorites$/,
        })
        .first();
    await expect(favorite()).toHaveAttribute("aria-pressed", "false");
    const views = page.getByRole("tablist", { name: `View ${noun}` });
    await views.getByRole("tab", { name: "Favorites", exact: true }).click();
    await expect(
      page.getByText(`No favorite ${noun} yet`, { exact: true }),
    ).toBeVisible();
    await views.getByRole("tab", { name: "All", exact: true }).click();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("jas:favorite:"))
          throw new Error("Storage unavailable");
        original.call(this, key, value);
      };
    });
    await favorite().click();
    await expect(page.getByRole("alert")).toContainText(
      "The favorite could not be saved",
    );
    await expect(favorite()).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await favorite().click();
    await expect(favorite()).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(favorite()).toHaveAttribute("aria-pressed", "true");
    await views.getByRole("tab", { name: "Favorites", exact: true }).click();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    const search = page.getByRole("textbox", { name: `Search ${noun}` });
    await search.fill("Nothing matches");
    await expect(
      page.getByText(`No matching ${noun}`, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(
      views.getByRole("tab", { name: "Favorites", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await favorite().click();
    await expect(
      page.getByText(`No favorite ${noun} yet`, { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(favorite()).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    let releaseRefresh = () => {};
    const refresh = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let refreshing = false;
    await page.route(`**/api${path}`, async (route) => {
      refreshing = true;
      await refresh;
      await route.fulfill({
        json:
          path === "/runs"
            ? study.runs
            : summaries.filter((item: { id: string }) => item.id === study.id),
      });
    });
    try {
      await expect.poll(() => refreshing).toBe(true);
      await expect(favorite()).toBeVisible();
      await expect(table.locator('[data-slot="skeleton"]')).toHaveCount(0);
      await expect(
        page.getByRole("status", { name: "Loading", exact: true }),
      ).toHaveCount(0);
    } finally {
      releaseRefresh();
    }
  });
}

for (const [path, noun, size] of [
  ["/studies", "experiment", 10],
  ["/runs", "run", 15],
] as const) {
  for (const width of [390, 1600]) {
    test(`${noun} pagination stays compact, navigates and resets on filtering · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("jas-theme", theme),
        width === 390 ? "dark" : "light",
      );
      const { study } = await createStudy(request);
      const summary = (await (await request.get("/api/studies")).json()).find(
        (item: { id: string }) => item.id === study.id,
      );
      const records = Array.from({ length: size * 7 + 1 }, (_, index) =>
        path === "/studies"
          ? {
              ...summary,
              id: `study-${index}`,
              title: `Experiment ${index + 1}`,
            }
          : {
              ...study.runs[0],
              id: `run-${index}`,
              condition: `Condition ${index + 1}`,
            },
      );
      await page.route(`**/api${path}`, (route) =>
        route.fulfill({ json: records }),
      );
      await page.goto(path);
      const table = page.getByRole("table");
      const pagination = page.getByRole("navigation", {
        name: noun === "run" ? "Run pages" : "Experiment pages",
      });
      await expect(pagination).toBeVisible();
      const previous = pagination.getByRole("button", {
        name: `Previous ${noun} page`,
      });
      const next = pagination.getByRole("button", {
        name: `Next ${noun} page`,
      });
      await expect(pagination.getByRole("button")).toHaveCount(2);
      await expect(previous).toHaveText("");
      await expect(next).toHaveText("");
      await expect(previous).toHaveAttribute("data-variant", "outline");
      await expect(next).toHaveAttribute("data-variant", "outline");
      const previousBounds = await previous.boundingBox();
      const nextBounds = await next.boundingBox();
      expect(previousBounds?.height).toBe(28);
      expect(nextBounds?.x).toBe(
        (previousBounds?.x ?? 0) + (previousBounds?.width ?? 0),
      );
      await expect(previous).toBeDisabled();
      const indicator = pagination.locator('[aria-live="polite"]');
      await expect(indicator).toHaveText("Page 1 of 8");
      await expect(indicator).toHaveCSS("font-weight", "400");
      await next.click();
      await expect(indicator).toHaveText("Page 2 of 8");
      await expect(table.locator("tbody tr").first()).toContainText(
        path === "/studies"
          ? `Experiment ${size + 1}`
          : `Condition ${size + 1}`,
      );
      await expect(previous).toBeEnabled();
      for (let index = 0; index < 6; index++) await next.click();
      await expect(indicator).toHaveText("Page 8 of 8");
      await expect(next).toBeDisabled();
      await expect(table.locator("tbody tr")).toHaveCount(1);
      await previous.focus();
      await page.keyboard.press("Enter");
      await expect(indicator).toHaveText("Page 7 of 8");
      await next.click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`pagination-${noun}-${width}.png`),
        animations: "disabled",
      });
      const search = page.getByRole("textbox", {
        name: path === "/studies" ? "Search experiments" : "Search runs",
      });
      await search.fill(path === "/studies" ? "Experiment 1" : "Condition 1");
      await expect(table.locator("tbody tr").first()).toContainText(
        path === "/studies" ? "Experiment 1" : "Condition 1",
      );
      await expect(previous).toBeDisabled();
      await search.fill("");
      await expect(indicator).toHaveText("Page 1 of 8");
      await search.fill(
        path === "/studies" ? "Experiment 71" : "Condition 106",
      );
      await expect(pagination).toHaveCount(0);
    });
  }
}

for (const [path, noun, scopeNoun, pageSize] of [
  ["/studies", "experiments", "environment", 10],
  ["/runs", "runs", "experiment", 15],
] as const) {
  test(`${noun} scope filters search, combine with favorites and reset pagination`, async ({
    page,
    request,
  }) => {
    const { study } = await createStudy(request);
    const catalog: Catalog = await (await request.get("/api/catalog")).json();
    const environments = catalog.environments.slice(0, 2);
    const [first, second] = environments;
    if (!first || !second)
      throw new Error("Expected two installed environments");
    const summary = (await (await request.get("/api/studies")).json()).find(
      (item: { id: string }) => item.id === study.id,
    );
    const records = Array.from({ length: pageSize * 2 + 1 }, (_, index) =>
      path === "/studies"
        ? {
            ...summary,
            id: `scope-study-${index}`,
            title: `Experiment ${index}`,
            environment: index === 0 ? second.key : first.key,
          }
        : {
            ...study.runs[0],
            id: `scope-run-${index}`,
            condition: `Condition ${index}`,
            study_id: index === 0 ? "second-study" : "first-study",
            study_title:
              index === 0 ? "Memory experiment" : "Resource experiment",
          },
    );
    await page.route(`**/api${path}`, (route) =>
      route.fulfill({ json: records }),
    );
    await page.goto(path);
    const scope = page.getByRole("combobox", {
      name: `Filter ${scopeNoun}`,
      exact: true,
    });
    const status = page.getByRole("combobox", {
      name: `Filter ${noun === "runs" ? "run" : "experiment"} status`,
    });
    await expect(scope).toBeEnabled();
    // Both triggers use the same typography, geometry and icon treatment.
    const appearance = (element: HTMLElement | SVGElement) => {
      const style = getComputedStyle(element);
      return [
        style.fontWeight,
        style.fontSize,
        style.height,
        style.paddingLeft,
        style.paddingRight,
        style.columnGap,
        style.borderRadius,
        style.borderColor,
        style.backgroundColor,
      ];
    };
    expect(await scope.evaluate(appearance)).toEqual(
      await status.evaluate(appearance),
    );
    await expect(scope).toHaveCSS("font-weight", "400");
    const table = page.getByRole("table");
    await table
      .locator("tbody tr")
      .first()
      .getByRole("button", { name: /^Add .* to favorites$/ })
      .click();
    await page
      .getByRole("button", {
        name: `Next ${noun === "runs" ? "run" : "experiment"} page`,
      })
      .click();
    await scope.click();
    const search = page.getByRole("combobox", { name: `Search ${scopeNoun}s` });
    const selectedLabel =
      path === "/studies" ? second.name : "Memory experiment";
    await search.fill(selectedLabel);
    await expect(
      page.getByRole("option", { name: selectedLabel, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("option", { name: selectedLabel, exact: true })
      .click();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("tbody tr")).toContainText(
      path === "/studies" ? "Experiment 0" : "Condition 0",
    );
    await expect(scope).toContainText(selectedLabel);
    const views = page.getByRole("tablist", { name: `View ${noun}` });
    await views.getByRole("tab", { name: "Favorites", exact: true }).click();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await scope.click();
    await page
      .getByRole("option", {
        name: path === "/studies" ? first.name : "Resource experiment",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(`No matching ${noun}`, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(scope).toHaveText("All");
    await expect(
      views.getByRole("tab", { name: "Favorites", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await views.getByRole("tab", { name: "All", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: `Previous ${noun === "runs" ? "run" : "experiment"} page`,
      }),
    ).toBeDisabled();
  });
}

for (const path of ["/studies", "/runs"] as const) {
  for (const touch of [false, true]) {
    test.describe(`${path} selection on ${touch ? "touch" : "pointer"}`, () => {
      test.use({
        hasTouch: touch,
        isMobile: touch,
        viewport: { width: touch ? 390 : 1600, height: 900 },
      });
      test("checkbox stays in gutter and supports hover, keyboard and persistent selection", async ({
        page,
        request,
      }) => {
        const { study } = await createStudy(request);
        await page.route("**/api/runs", (route) =>
          route.fulfill({ json: study.runs }),
        );
        const summaries = await (await request.get("/api/studies")).json();
        await page.route("**/api/studies", (route) =>
          route.fulfill({
            json: summaries.filter(
              (item: { id: string }) => item.id === study.id,
            ),
          }),
        );
        await page.goto(path);
        const row = page.getByRole("table").locator("tbody tr").first();
        const checkbox = row.getByRole("checkbox");
        const selectAll = page.getByRole("checkbox", {
          name: `Select all ${path === "/studies" ? "experiments" : "runs"} on this page`,
        });
        await expect(selectAll).toHaveCSS("opacity", touch ? "1" : "0");
        const link = row.getByRole("link").first();
        await expect(checkbox).toHaveCSS("opacity", touch ? "1" : "0");
        const box = await checkbox.boundingBox();
        const name = await link.boundingBox();
        const title = await page
          .getByRole("columnheader", { name: "Name", exact: true })
          .evaluate(
            (element) =>
              element.getBoundingClientRect().x +
              Number.parseFloat(getComputedStyle(element).paddingLeft),
          );
        expect(box && name && box.x + box.width < name.x).toBe(true);
        expect(name?.x).toBeCloseTo(title + (path === "/studies" ? 24 : 0), 0);
        if (!touch) {
          await row.hover();
          await expect(checkbox).toHaveCSS("opacity", "1");
          await page.mouse.move(0, 0);
          await expect(checkbox).toHaveCSS("opacity", "0");
          await link.focus();
          await page.keyboard.press("Shift+Tab");
          await expect(checkbox).toBeFocused();
          await expect(checkbox).toHaveCSS("opacity", "1");
          await page.keyboard.press("Space");
        } else {
          await checkbox.tap();
        }
        await expect(checkbox).toBeChecked();
        await page
          .getByRole("textbox", {
            name: path === "/studies" ? "Search experiments" : "Search runs",
          })
          .focus();
        await page.mouse.move(0, 0);
        await expect(checkbox).toHaveCSS("opacity", "1");
        expect((await link.boundingBox())?.x).toBe(name?.x);
        const destination = await link.getAttribute("href");
        await link.click({ position: { x: 1, y: 10 } });
        expect(new URL(page.url()).pathname).toBe(destination);
      });
    });
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`experiment row actions preserve revisions, independent copies, and confirmed deletion · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({
      width: theme === "dark" ? 390 : 1600,
      height: 900,
    });
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    const { study } = await createStudy(request);
    await page.route("**/api/studies", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      const studies = await response.json();
      await route.fulfill({
        json: studies.filter((item: { id: string }) => item.id === study.id),
      });
    });
    await page.goto("/studies");
    const row = page.getByRole("table").locator("tbody tr").first();
    const actions = row.getByRole("button", { name: /^Actions for/ });
    await expect(actions).toHaveCSS("border-top-width", "1px");
    await actions.click();
    await expect(
      page.getByRole("menuitem", { name: "Edit as new revision" }),
    ).toHaveAttribute("href", `/new?study=${study.id}`);
    await expect(
      page.getByRole("menuitem", { name: "Open experiment", exact: true }),
    ).toHaveAttribute("href", `/studies/${study.id}`);
    await page.screenshot({
      path: testInfo.outputPath(`experiment-actions-${theme}.png`),
      animations: "disabled",
    });
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export evidence" }).click();
    expect((await download).suggestedFilename()).toBe(`jas-${study.id}.json`);
    await actions.click();
    await page
      .getByRole("menuitem", { name: "Duplicate", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/new\\?copy=${study.id}$`));
    await expect(
      page.getByLabel("Experiment name", { exact: true }),
    ).toHaveValue(`${study.design.title.slice(0, 93)} (copy)`);
    await page
      .getByLabel("Experiment name", { exact: true })
      .fill("Independent copy");
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Independent copy", exact: true }),
    ).toBeVisible();
    const copyId = new URL(page.url()).pathname.split("/").at(-1);
    expect(copyId).not.toBe(study.id);
    expect(
      (await (await request.get(`/api/studies/${copyId}`)).json()).revision,
    ).toBe(1);
    expect(
      (await (await request.get(`/api/studies/${study.id}`)).json()).design
        .title,
    ).toBe(study.design.title);
    await page.goto(`/new?study=${study.id}`);
    await page
      .getByLabel("Experiment name", { exact: true })
      .fill("Updated revision");
    await page
      .getByRole("button", { name: "Save new revision", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Updated revision", exact: true }),
    ).toBeVisible();
    expect(
      (await (await request.get(`/api/studies/${study.id}?revision=1`)).json())
        .design.title,
    ).toBe(study.design.title);
    await page.goto("/studies");
    await actions.click();
    await page.getByRole("menuitem", { name: "Delete experiment…" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Spending records");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(actions).toBeFocused();
    expect((await request.get(`/api/studies/${study.id}`)).status()).toBe(200);
    // API errors remain in the confirmation so the user can retry without losing context.
    let fail = true;
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/studies/${study.id}`, async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      if (fail)
        return route.fulfill({
          status: 422,
          json: { detail: "Pause all runs before deleting." },
        });
      await pending;
      return route.continue();
    });
    await actions.click();
    await page.getByRole("menuitem", { name: "Delete experiment…" }).click();
    await dialog
      .getByRole("button", { name: "Delete experiment", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("Pause all runs");
    fail = false;
    await dialog
      .getByRole("button", { name: "Delete experiment", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Deleting…", exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
    release();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText("No experiments yet", { exact: true }),
    ).toBeVisible();
    expect((await request.get(`/api/studies/${study.id}`)).status()).toBe(404);
    expect((await request.get(`/api/studies/${copyId}`)).status()).toBe(200);
    expect(
      (await (await request.get("/api/settings")).json()).usage.requests,
    ).toBe(0);
  });
}

test("run action menu opens the exact revision and exports evidence without mutating a trial", async ({
  page,
  request,
}) => {
  const { study } = await createStudy(request);
  await page.route("**/api/runs", (route) =>
    route.fulfill({ json: study.runs }),
  );
  await page.goto("/runs");
  const run = study.runs[0];
  if (!run) throw new Error("Expected a run");
  const actions = page
    .getByRole("table")
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: /^Actions for/ });
  await actions.click();
  await expect(
    page.getByRole("menuitem", { name: "Inspect run", exact: true }),
  ).toHaveAttribute("href", `/runs/${run.id}`);
  await expect(
    page.getByRole("menuitem", { name: "Open experiment", exact: true }),
  ).toHaveAttribute("href", `/studies/${study.id}?revision=${run.revision}`);
  await expect(page.getByRole("menuitem", { name: /Delete|Edit/ })).toHaveCount(
    0,
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export experiment evidence" })
    .click();
  expect((await download).suggestedFilename()).toBe(`jas-${study.id}.json`);
  expect(
    (await (await request.get(`/api/runs/${run.id}`)).json()).summary.turn,
  ).toBe(0);
});

for (const source of ["study", "copy"] as const) {
  test(`unfinished ${source} drafts remain recoverable after deleting their source experiment`, async ({
    page,
    request,
  }) => {
    const { study } = await createStudy(request);
    const path = `/new?${source}=${study.id}`;
    await page.goto(path);
    await page
      .getByLabel("Experiment name", { exact: true })
      .fill("Kept unfinished work");
    await expect(
      page.getByRole("status", { name: "Saved in this browser" }),
    ).toBeVisible();
    expect((await request.delete(`/api/studies/${study.id}`)).status()).toBe(
      200,
    );
    await page.reload();
    await expect(
      page.getByText("Original experiment deleted", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Experiment name", { exact: true }),
    ).toHaveValue("Kept unfinished work");
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Kept unfinished work", exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).not.toBe(`/studies/${study.id}`);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(`jas:draft:${key}`),
        path,
      ),
    ).toBeNull();
  });
}
