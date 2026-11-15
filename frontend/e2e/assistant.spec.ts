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

for (const theme of ["light", "dark"]) {
  test(`sidebar hover stays neutral and selection stays blue · ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(
      (theme) => localStorage.setItem("jas-theme", theme),
      theme,
    );
    await page.goto("/experiments");
    const sidebar = page.locator('[data-slot="sidebar"]');
    const selected = sidebar.getByRole("link", {
      name: "Experiments",
      exact: true,
    });
    const normal = sidebar.getByRole("link", {
      name: "Environments",
      exact: true,
    });
    const settings = sidebar.getByRole("link", {
      name: "Settings",
      exact: true,
    });
    const blue = await selected.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const gray = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--muted)";
      document.body.append(probe);
      const gray = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return gray;
    });
    expect(blue).not.toBe(gray);
    for (const state of ["expanded", "collapsed"]) {
      if (state === "collapsed")
        await page
          .getByRole("button", { name: "Collapse sidebar", exact: true })
          .click();
      for (const item of [normal, settings]) {
        await item.hover();
        await expect(item).toHaveCSS("background-color", gray);
        await expect(selected).toHaveCSS("background-color", blue);
      }
      await selected.hover();
      await expect(selected).toHaveCSS("background-color", blue);
    }
    await normal.hover();
    await page.screenshot({
      path: testInfo.outputPath(`sidebar-hover-${theme}.png`),
      animations: "disabled",
    });
  });
}
