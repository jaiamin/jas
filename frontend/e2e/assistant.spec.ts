import { expect, test } from "@playwright/test";

test("sidebar collapses in place, reveals its control on hover, and restores via keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const sidebar = page.locator('[data-slot="sidebar"]');
  await expect(sidebar.locator(".brand-name")).toHaveCount(0);
  await expect(
    page.locator(".shell-header").getByRole("button", { name: /sidebar/ }),
  ).toHaveCount(0);
  const collapse = sidebar.getByRole("button", {
    name: "Collapse sidebar",
    exact: true,
  });
  await collapse.click();
  const expand = sidebar.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await expect(expand).toBeFocused();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expand.hover();
  await expect(expand.locator(".brand-mark")).toHaveCSS("opacity", "0");
  await expect(expand.locator(".brand-toggle-icon")).toHaveCSS("opacity", "1");
  await expect
    .poll(async () => {
      const logo = await expand.boundingBox();
      const navigation = await sidebar
        .getByRole("link", { name: "Experiments", exact: true })
        .boundingBox();
      return Math.abs(
        (logo?.x ?? 0) +
          (logo?.width ?? 0) / 2 -
          ((navigation?.x ?? 0) + (navigation?.width ?? 0) / 2),
      );
    })
    .toBeLessThan(1);
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await page.keyboard.press("Control+b");
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await collapse.click();
  await expand.press("Enter");
  await expect(collapse).toBeFocused();
});
