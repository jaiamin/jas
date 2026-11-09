import { expect, test } from "@playwright/test";
import type { Catalog } from "../src/lib/types.js";
import { createStudy } from "./helpers.js";

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
          return { left: style.paddingLeft, right: style.paddingRight };
        });
        const table = main.getByRole("table");
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
              ]
            : [
                "Select",
                "Run",
                "Favorite",
                "Experiment",
                "Status",
                "Seed",
                "Revision",
                "Repetition",
                "Progress",
                "Cost",
                "Created",
              ],
        );
        const cells = table.getByRole("row").nth(1).getByRole("cell");
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
          await expect(cells.nth(1)).toHaveText(run.condition);
          await expect(cells.nth(5)).toHaveText(String(run.seed));
          await expect(cells.nth(6)).toHaveText(String(run.revision));
          await expect(cells.nth(7)).toHaveText(String(run.repetition));
          await expect(cells.nth(1).getByRole("link")).toHaveCSS(
            "font-weight",
            "400",
          );
        }
        const dateCell = cells.last();
        expect(
          await dateCell.evaluate((cell) => getComputedStyle(cell).color),
        ).toBe(
          await cells
            .nth(path === "/studies" ? 0 : 1)
            .evaluate((cell) => getComputedStyle(cell).color),
        );
        await expect(dateCell).not.toBeEmpty();
        await expect(heading).toHaveCSS("font-weight", "500");
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
            headerPadding.left,
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
            name: path === "/studies" ? "Name" : "Run",
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
  test(`${title} keeps its header usable while rows load and when empty`, async ({
    page,
  }) => {
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/${endpoint}`, async (route) => {
      await ready;
      await route.fulfill({ json: [] });
    });
    await page.goto(path);
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
      path === "/studies" ? 21 : 33,
    );
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
    await expect(table.locator('[data-slot="skeleton"]')).toHaveCount(0);
    const after = await labels.boundingBox();
    expect(after?.y).toBe(before?.y);
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
      await expect(previous).toBeDisabled();
      await expect(
        pagination.getByRole("button", {
          name: `Go to ${noun} page 1`,
          exact: true,
        }),
      ).toHaveAttribute("aria-current", "page");
      await next.click();
      await expect(table.locator("tbody tr").first()).toContainText(
        path === "/studies"
          ? `Experiment ${size + 1}`
          : `Condition ${size + 1}`,
      );
      await expect(previous).toBeEnabled();
      await pagination
        .getByRole("button", { name: `Go to ${noun} page 8`, exact: true })
        .click();
      await expect(next).toBeDisabled();
      await expect(table.locator("tbody tr")).toHaveCount(1);
      await expect(
        pagination.locator('[data-slot="pagination-ellipsis"]'),
      ).toHaveCount(1);
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
      await expect(
        pagination.getByRole("button", {
          name: `Go to ${noun} page 1`,
          exact: true,
        }),
      ).toHaveAttribute("aria-current", "page");
    });
  }
}
