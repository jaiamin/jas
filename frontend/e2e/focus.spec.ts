import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`pointer clicks suppress both native and preset focus outlines after keyboard use · ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.goto("/new");
    await page.getByLabel("Experiment name", { exact: true }).click();
    await page.keyboard.press("Tab");
    await page.keyboard.type(" An edit");
    const agents = page.getByRole("tab", { name: "Agents", exact: true });
    await agents.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-input-modality",
      "pointer",
    );
    const noPointerRing = async () => {
      const active = page.locator(":focus");
      await expect
        .poll(() =>
          active.evaluate((element) => {
            const styles = getComputedStyle(element);
            return styles.outlineStyle;
          }),
        )
        .toBe("none");
    };
    await noPointerRing();
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await agents.click();
    await noPointerRing();
    const trigger = page
      .locator('[data-slot="accordion-trigger"]:visible')
      .first();
    await trigger.click();
    await noPointerRing();
    await page.getByRole("link", { name: "Experiments", exact: true }).click();
    await noPointerRing();
    // Keyboard navigation keeps an explicit focus indicator.
    await page.keyboard.press("Tab");
    await expect(page.locator("html")).toHaveAttribute(
      "data-input-modality",
      "keyboard",
    );
    await expect
      .poll(() =>
        page.locator(":focus").evaluate((element) => {
          const styles = getComputedStyle(element);
          const ring = styles.getPropertyValue("--tw-ring-shadow").trim();
          return (
            styles.outlineStyle !== "none" ||
            (ring !== "" && ring !== "0 0 #0000")
          );
        }),
      )
      .toBe(true);
  });
}
