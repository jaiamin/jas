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
      for (const route of ["agent", "environments"]) {
        await page.goto(`/${route}`);
        if (route === "agent")
          await expect(
            page.getByLabel("Message Agent", { exact: true }),
          ).toBeVisible();
        else
          await expect(
            page.getByRole("heading", { name: "What agents observe" }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (route === "environments") {
          await expect(
            page.locator('img[src="/illustrations/page-headings/lab.webp"]'),
          ).toHaveCount(0);
          const index = page.getByRole("tablist", {
            name: "Environments",
            exact: true,
          });
          await expect(index).toHaveAttribute(
            "aria-orientation",
            width <= 700 ? "horizontal" : "vertical",
          );
          const first = page.getByRole("tab", {
            name: "Shared commons",
            exact: false,
          });
          await first.focus();
          await first.press(width <= 700 ? "ArrowRight" : "ArrowDown");
          await expect(
            page.getByRole("tab", { name: "Trust exchange", exact: false }),
          ).toBeFocused();
          await first.click();
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
