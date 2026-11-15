import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`errors share compact surfaces and recovery · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      const detail = "This content couldn’t load. Try again.";
      for (const [path, endpoint] of [
        ["/experiments", "/studies"],
        ["/runs", "/runs"],
        ["/environments", "/catalog"],
        ["/examples", "/starters"],
        ["/settings", "/settings"],
      ]) {
        let failing = true;
        await page.route(`**/api${endpoint}`, (route) =>
          failing
            ? route.fulfill({ status: 503, json: { detail } })
            : route.continue(),
        );
        await page.goto(path);
        const alert = page.locator("#main").getByRole("alert");
        await expect(alert).toBeVisible();
        await expect(alert).toContainText(detail);
        await expect(alert).toHaveCSS("padding-left", "16px");
        await expect(alert).toHaveCSS("padding-top", "16px");
        const box = await alert.boundingBox();
        expect(box?.height).toBeLessThan(180);
        const icon = alert.locator(":scope > svg");
        await expect(icon).toHaveCSS("width", "16px");
        const colors = await alert.evaluate((element) => {
          const title = element.querySelector('[data-slot="alert-title"]');
          const icon = element.querySelector("svg");
          if (!title || !icon) throw new Error("Missing error title or icon");
          return {
            title: getComputedStyle(title).color,
            icon: getComputedStyle(icon).color,
          };
        });
        expect(colors.icon).not.toBe(colors.title);
        await expect(page.locator("html")).toHaveJSProperty(
          "scrollWidth",
          width,
        );
        const retry = alert.getByRole("button", { name: "Retry", exact: true });
        await retry.focus();
        await expect(retry).toBeFocused();
        if (path === "/experiments")
          await page.screenshot({
            path: testInfo.outputPath(`error-${theme}-${width}.png`),
            fullPage: true,
          });
        failing = false;
        await retry.press("Enter");
        await expect(alert).toHaveCount(0);
        await page.unroute(`**/api${endpoint}`);
      }
      await page.route("**/api/publishing", (route) =>
        route.fulfill({
          json: {
            origin: "https://gallery.example",
            identity: null,
            error:
              "Enable a system keychain to save your publishing sign-in securely.",
            error_code: "keychain_unavailable",
          },
        }),
      );
      await page.goto("/gallery?view=mine");
      const setup = page.getByRole("alert");
      await expect(setup).toContainText("Publishing needs a keychain");
      await expect(setup.getByRole("button")).toHaveCount(0);
      await expect(
        setup.getByRole("link", { name: "Publishing setup" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Sign in with GitHub" }),
      ).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`keychain-${theme}-${width}.png`),
        fullPage: true,
      });
      await expect(page.locator("html")).toHaveJSProperty("scrollWidth", width);
    });
  }
}

test("long failure messages wrap within a phone layout", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const detail = `protocol.${"unbroken-property-name".repeat(60)}`;
  await page.route("**/api/starters", (route) =>
    route.fulfill({ status: 422, json: { detail } }),
  );
  await page.goto("/examples");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText(detail);
  expect(
    await alert.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
});
