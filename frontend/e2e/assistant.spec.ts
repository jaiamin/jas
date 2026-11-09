import { expect, test } from "@playwright/test";

test("sidebar has one brand, a visible collapse control and persistent keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const sidebar = page.locator('[data-slot="sidebar"]');
  await expect(page.getByRole("link", { name: "JAS home" })).toHaveCount(1);
  const collapse = page.getByRole("button", {
    name: "Collapse sidebar",
    exact: true,
  });
  await expect(collapse).toBeVisible();
  await collapse.click();
  const expand = page.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await expect(expand).toBeFocused();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(
    sidebar.getByRole("link", { name: "Experiments", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await page.keyboard.press("Control+b");
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await collapse.click();
  await expand.press("Enter");
  await expect(collapse).toBeFocused();
});
