import { expect, test } from "@playwright/test";

for (const width of [390, 834, 1280, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`workspace surfaces remain usable · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["assistant", "environments"]) {
        await page.goto(`/${route}`);
        if (route === "assistant")
          await expect(
            page.getByLabel("Message Assistant", { exact: true }),
          ).toBeVisible();
        else
          await expect(
            page.getByRole("article", { name: "Shared commons", exact: true }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (route === "environments") {
          const index = page.getByRole("tablist", {
            name: "Environments",
            exact: true,
          });
          await expect(index).toHaveAttribute("aria-orientation", "horizontal");
          const builtIn = index.getByRole("tab", {
            name: "Built-in",
            exact: true,
          });
          await builtIn.focus();
          await builtIn.press("ArrowRight");
          await expect(
            index.getByRole("tab", { name: "Custom", exact: true }),
          ).toBeFocused();
          await builtIn.click();
          await page
            .getByRole("link", {
              name: "Explore Shared commons",
              exact: true,
            })
            .click();
          await page
            .getByRole("button", { name: "Observations & rules", exact: true })
            .click();
          await expect(
            page.getByRole("heading", { name: "What agents observe" }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Close", exact: true })
            .click();
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
        await page.screenshot({
          path: testInfo.outputPath(`${route}-${theme}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    });
  }
}
