import { expect, test } from "@playwright/test";
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
    await search.fill("Keep this query");
    release();
    await expect(
      page.getByRole("status", { name: "Loading", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(`No ${noun} yet`, { exact: true }),
    ).toBeVisible();
    await expect(search).toHaveValue("Keep this query");
  });
}
