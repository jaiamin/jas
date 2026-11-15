import { expect, test } from "@playwright/test";
import { selectText, templateDesign } from "./helpers.js";

for (const width of [390, 1440]) {
  test(`draft deletion is confirmed, persistent across navigation · ${width}`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const catalog = await (await request.get("/api/catalog")).json();
    await page.goto("/");
    await page.evaluate((design) => {
      for (const [index, title] of [
        "Draft to delete",
        "Keep this draft",
      ].entries()) {
        const path = `/new?template=${index ? "trust" : "commons"}`;
        const specification = { ...design, title };
        localStorage.setItem(
          `jas:draft:${path}`,
          JSON.stringify({
            path,
            title,
            updated: new Date().toISOString(),
            design: specification,
            json: JSON.stringify(specification),
            mode: "visual",
          }),
        );
      }
    }, templateDesign(catalog));
    await page.goto("/");
    const draft = page.getByRole("link", {
      name: "Draft to delete",
      exact: true,
    });
    const remove = page.getByRole("button", {
      name: "Delete Draft to delete draft",
      exact: true,
    });
    await expect(draft.locator("time")).toHaveText("Just now");
    await expect(draft.locator("time")).toHaveAttribute("title", /^Edited /);
    await page.mouse.move(0, 0);
    await expect(remove).toHaveCSS("opacity", "1");
    await draft.hover();
    await expect(remove).toHaveCSS("opacity", "1");
    await page.mouse.move(0, 0);
    await draft.focus();
    await expect(remove).toHaveCSS("opacity", "1");
    await remove.click();
    const dialog = page.getByRole("alertdialog", { name: "Delete draft?" });
    await expect(dialog).toContainText("Draft to delete");
    await selectText(
      page,
      dialog.getByRole("button", { name: "Delete draft", exact: true }),
    );
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("jas:draft:/new?template=commons"),
      ),
    ).not.toBeNull();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(draft).toBeVisible();
    await remove.click();
    await dialog
      .getByRole("button", { name: "Delete draft", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(draft).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("jas:draft:/new?template=commons"),
      ),
    ).toBeNull();
    await expect(
      page.getByRole("link", { name: "Keep this draft", exact: true }),
    ).toBeVisible();
    await page.goto("/experiments");
    await expect(page.getByRole("button", { name: /^Drafts/ })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Keep this draft", exact: true }),
    ).toHaveCount(0);
    await page.goto("/");
    await expect(draft).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Keep this draft", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Delete Keep this draft draft",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Delete draft", exact: true })
      .click();
    await expect(page.getByRole("button", { name: /^Drafts/ })).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.startsWith("jas:draft:")),
      ),
    ).toEqual([]);
  });

  test(`a failed draft deletion keeps the draft and confirmation recoverable · ${width}`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const catalog = await (await request.get("/api/catalog")).json();
    await page.goto("/");
    await page.evaluate((design) => {
      localStorage.setItem(
        "jas:draft:/new",
        JSON.stringify({
          path: "/new",
          title: "Protected draft",
          updated: new Date().toISOString(),
          design,
          json: JSON.stringify(design),
          mode: "visual",
        }),
      );
    }, templateDesign(catalog));
    await page.goto("/");
    await page.evaluate(() => {
      const original = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (key.startsWith("jas:draft:"))
          throw new Error("Storage temporarily unavailable");
        original.call(this, key);
      };
    });
    await page
      .getByRole("button", {
        name: "Delete Protected draft draft",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("alertdialog", { name: "Delete draft?" });
    await dialog
      .getByRole("button", { name: "Delete draft", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Storage temporarily unavailable",
    );
    expect(
      await page.evaluate(() => localStorage.getItem("jas:draft:/new")),
    ).not.toBeNull();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Protected draft", exact: true }),
    ).toBeVisible();
  });
}

test.describe("touch draft controls", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("delete stays visible without hover", async ({ page, request }) => {
    const catalog = await (await request.get("/api/catalog")).json();
    await page.goto("/");
    await page.evaluate((design) => {
      localStorage.setItem(
        "jas:draft:/new",
        JSON.stringify({
          path: "/new",
          title: "Touch draft",
          updated: new Date().toISOString(),
          design,
          json: JSON.stringify(design),
          mode: "visual",
        }),
      );
    }, templateDesign(catalog));
    await page.reload();
    const remove = page.getByRole("button", {
      name: "Delete Touch draft draft",
      exact: true,
    });
    await expect(remove).toHaveCSS("opacity", "1");
    await remove.tap();
    await expect(
      page.getByRole("alertdialog", { name: "Delete draft?" }),
    ).toBeVisible();
  });
});
