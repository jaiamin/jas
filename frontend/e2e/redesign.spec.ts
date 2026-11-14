import { expect, test } from "@playwright/test";
import { createStudy, setDeveloper } from "./helpers.js";

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`all redesigned routes contain their content · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await setDeveloper(request, true);
      const { study, run } = await createStudy(request);
      await page.route("**/api/studies", (route) =>
        route.fulfill({
          json: [
            {
              id: study.id,
              title: study.design.title,
              question: study.design.question,
              environment: study.design.environment,
              revision: study.revision,
              created: study.created,
              run_count: study.runs.length,
              completed_runs: 0,
              status: "ready",
              cost_usd: 0,
              budget_usd: study.design.budget_usd,
            },
          ],
        }),
      );
      await page.route("**/api/runs", (route) =>
        route.fulfill({ json: study.runs }),
      );
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      const routes = [
        ["home", "/"],
        ["experiments", "/experiments"],
        ["runs", "/runs"],
        ["settings", "/settings"],
        ["question", "/new?template=commons"],
        ["agents", "/new?template=commons&step=agents"],
        ["conditions", "/new?template=commons&step=conditions"],
        ["execution", "/new?template=commons&step=execution"],
        ["specification", "/new?template=commons"],
        ["composition", "/new?template=composed&step=conditions"],
        ["study", `/experiments/${study.id}`],
        ["study-runs", `/experiments/${study.id}?tab=runs`],
        ["protocol", `/experiments/${study.id}?tab=design`],
        ["decisions", `/runs/${run.summary.id}`],
        ["world", `/runs/${run.summary.id}?tab=live`],
        ["interactions", `/runs/${run.summary.id}?tab=relationships`],
        ["record", `/runs/${run.summary.id}?tab=settings`],
        [
          "comparison",
          `/compare?runs=${study.runs
            .slice(0, 2)
            .map((r) => r.id)
            .join(",")}`,
        ],
      ];
      for (const [name, path] of routes) {
        await page.goto(path ?? "/");
        await expect(page.getByRole("main")).toHaveCount(1);
        if (path?.startsWith("/runs/") && path.includes("?tab=")) {
          await expect(
            page.getByRole("dialog", { name: "Rules & evidence" }),
          ).toBeVisible();
          await expect(page.locator("h1")).toBeAttached();
        } else {
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        }
        if (path?.startsWith("/new")) {
          await page
            .getByRole("button", { name: "Advanced", exact: true })
            .click();
          await expect(
            page.getByLabel("Experiment name", { exact: true }),
          ).toBeAttached();
        }
        if (
          name === "agents" ||
          name === "execution" ||
          name === "specification"
        ) {
          const tab = page.getByRole("tab", {
            name:
              name === "execution" ? "Run plan" : new RegExp(`^${name}`, "i"),
          });
          await tab.click();
          await expect(tab).toHaveAttribute("aria-selected", "true");
        }
        await expect(
          page.getByRole("status", { name: "Loading", exact: true }),
        ).toHaveCount(0);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`${name}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
      expect(errors).toEqual([]);
    });
  }
}
