import { expect, test } from "@playwright/test";
import type { Catalog, StudySummary } from "../src/lib/types.js";
import { createStudy } from "./helpers.js";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1600]) {
    test(`experiment library identifies environments, sorts and favorites selections · ${theme} · ${width}`, async ({
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
      const summaries: StudySummary[] = await (
        await request.get("/api/studies")
      ).json();
      const original = summaries.find((item) => item.id === study.id);
      if (!original) throw new Error("Expected an experiment");
      const records = catalog.environments.map((environment, index) => ({
        ...original,
        id: `experiment-${index}`,
        environment: environment.key,
        title: `Experiment ${index + 1}`,
        created: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
      }));
      await page.route("**/api/studies", (route) =>
        route.fulfill({ json: records }),
      );
      await page.goto("/studies");
      const table = page.getByRole("table");
      const rows = table.locator("tbody tr");
      await expect(rows).toHaveCount(records.length);
      await expect(
        table.getByRole("columnheader", { name: "Revision", exact: true }),
      ).toHaveCount(0);
      const marks = () =>
        table
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
      expect(Object.keys(before)).toHaveLength(catalog.environments.length);
      expect(new Set(Object.values(before)).size).toBe(
        catalog.environments.length,
      );
      await page.reload();
      await expect(rows).toHaveCount(records.length);
      expect(await marks()).toEqual(before);
      await expect(rows.first().getByRole("cell").first()).toHaveText(
        `Experiment ${records.length}`,
      );
      await expect(
        table.getByRole("columnheader", { name: "Created", exact: true }),
      ).toHaveAttribute("aria-sort", "descending");
      await page
        .getByRole("button", { name: "Sort by name", exact: true })
        .click();
      await expect(rows.first().getByRole("cell").first()).toHaveText(
        "Experiment 1",
      );
      await expect(
        table.getByRole("columnheader", { name: "Name", exact: true }),
      ).toHaveAttribute("aria-sort", "ascending");
      await page
        .getByRole("button", { name: "Sort by name", exact: true })
        .press("Enter");
      await expect(rows.first().getByRole("cell").first()).toHaveText(
        `Experiment ${records.length}`,
      );
      await page
        .getByRole("button", { name: "Sort by created", exact: true })
        .click();
      await expect(
        table.getByRole("columnheader", { name: "Created", exact: true }),
      ).toHaveAttribute("aria-sort", "descending");
      await page
        .getByRole("button", { name: "Sort by created", exact: true })
        .click();
      await expect(rows.first().getByRole("cell").first()).toHaveText(
        "Experiment 1",
      );
      const first = records[0];
      const environment = catalog.environments[0];
      if (!first || !environment)
        throw new Error("Expected environment records");
      await expect(
        rows.first().getByRole("link", { name: environment.name, exact: true }),
      ).toHaveAttribute("href", `/environments?environment=${environment.key}`);
      await expect(
        rows.first().getByRole("link", {
          name: `View runs for ${first.title}: ${first.completed_runs} / ${first.run_count} complete`,
          exact: true,
        }),
      ).toHaveAttribute("href", `/studies/${first.id}?tab=runs`);
      await expect(rows.first().locator("time")).toHaveAttribute(
        "datetime",
        first.created,
      );
      await expect(rows.first().locator("time")).toHaveAttribute(
        "title",
        /2026/,
      );
      await page
        .getByRole("checkbox", { name: "Select all experiments on this page" })
        .check();
      await page
        .getByRole("button", {
          name: "Favorite selected experiments",
          exact: true,
        })
        .click();
      await expect(
        table.getByRole("button", { name: /^Remove .* from favorites$/ }),
      ).toHaveCount(records.length);
      const views = page.getByRole("tablist", { name: "View experiments" });
      await views.getByRole("tab", { name: "Favorites", exact: true }).click();
      const search = page.getByRole("textbox", { name: "Search experiments" });
      await search.fill(environment.name);
      await expect(rows).toHaveCount(1);
      await expect(rows.first().getByRole("cell").first()).toHaveText(
        first.title,
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await expect(rows).toHaveCount(records.length);
      await expect(
        views.getByRole("tab", { name: "Favorites", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await page.screenshot({
        path: testInfo.outputPath(`experiment-library-${theme}-${width}.png`),
        animations: "disabled",
      });
      await page
        .getByRole("button", {
          name: "Unfavorite selected experiments",
          exact: true,
        })
        .click();
      await expect(
        page.getByText("No favorite experiments yet", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Clear selection", exact: true })
        .click();
      await page.getByRole("button", { name: "View all", exact: true }).click();
      await expect(rows).toHaveCount(records.length);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    });
  }
}
