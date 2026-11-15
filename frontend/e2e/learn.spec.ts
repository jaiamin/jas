import { expect, test } from "@playwright/test";

for (const width of [320, 1440])
  for (const theme of ["light", "dark"]) {
    test(`Learn links and examples stay usable · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("jas-theme", theme),
        theme,
      );
      const writes: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/") && request.method() !== "GET")
          writes.push(request.url());
      });
      await page.goto("/settings");
      const header = page.locator('[data-slot="workspace-header"]');
      const docs = header.getByRole("link", { name: /^Docs/ });
      await expect(docs).toHaveAttribute("href", "https://jas.mintlify.site");
      await expect(docs).toHaveAttribute("target", "_blank");
      await expect(docs).toHaveAttribute("rel", "noreferrer");
      await expect(docs.locator("svg")).toHaveCount(0);
      const controls = await header.locator("a, button").evaluateAll((items) =>
        items.map((item) => {
          const box = item.getBoundingClientRect();
          return { x: box.x, right: box.right, center: box.y + box.height / 2 };
        }),
      );
      expect(new Set(controls.map((control) => control.center)).size).toBe(1);
      expect(
        controls.every((control) => control.x >= 0 && control.right <= width),
      ).toBe(true);
      expect(
        await docs.evaluate(
          (element) => element.nextElementSibling?.textContent,
        ),
      ).toBe("Assistant");
      if (width === 320)
        await page
          .getByRole("button", { name: "Open menu", exact: true })
          .click();
      const sidebar = page.locator('[data-slot="sidebar-content"]:visible');
      await expect(sidebar.getByText("Learn", { exact: true })).toBeVisible();
      const learn = sidebar.locator('[data-slot="sidebar-group"]').last();
      await expect(
        learn
          .getByRole("link", { name: /^Docs/ })
          .locator("svg.lucide-book-text"),
      ).toBeVisible();
      await expect(
        learn
          .getByRole("link", { name: /^JAS MCP/ })
          .locator("svg.lucide-cable"),
      ).toBeVisible();
      await expect(
        learn
          .getByRole("link", { name: "Examples", exact: true })
          .locator("svg.lucide-blocks"),
      ).toBeVisible();
      await expect(learn.getByRole("link")).toHaveText([
        "Docs(opens in a new tab)",
        "JAS MCP(opens in a new tab)",
        "Examples",
      ]);
      const mcp = learn.getByRole("link", { name: /^JAS MCP/ });
      await expect(mcp).toHaveAttribute(
        "href",
        "https://jas.mintlify.site/integrations/jas-mcp",
      );
      await expect(mcp).toHaveAttribute("target", "_blank");
      await expect(mcp.locator("svg.lucide-arrow-up-right")).toBeVisible();
      await learn.getByRole("link", { name: "Examples", exact: true }).click();
      await expect(page).toHaveURL(/\/examples$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const examples = await (await request.get("/api/starters")).json();
      expect(examples).toHaveLength(8);
      await expect(page.getByRole("article")).toHaveCount(8);
      await expect(
        page
          .getByRole("region", { name: "Work & evidence", exact: true })
          .getByRole("article"),
      ).toHaveCount(3);
      await expect(
        page
          .getByRole("region", { name: "Cooperation & decisions", exact: true })
          .getByRole("article"),
      ).toHaveCount(5);
      const columns = await page
        .locator('[data-slot="example-grid"]')
        .first()
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(" ").length,
        );
      expect(columns).toBe(width === 320 ? 1 : 3);
      await expect(
        page.getByRole("heading", { name: "Examples", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Examples", exact: true }),
      ).toHaveCSS("font-size", width < 640 ? "20px" : "22px");
      const titleIcon = page.locator('[data-slot="avatar"]');
      await expect(titleIcon).toHaveCSS("width", "36px");
      await expect(titleIcon.locator("svg.lucide-blocks")).toHaveCSS(
        "width",
        "18px",
      );
      await expect(
        page.getByText(
          /Watch a scripted demonstration, then reuse its protocol/,
        ),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const example of examples) {
        const row = page.getByRole("article").filter({
          has: page.getByRole("heading", {
            name: example.design.title,
            exact: true,
          }),
        });
        await expect(
          row.getByRole("link", {
            name: `Watch ${example.design.title}`,
            exact: true,
          }),
        ).toHaveAttribute("href", `/watch/${example.id}`);
        await expect(
          row.getByRole("link", {
            name: `Use ${example.design.title}`,
            exact: true,
          }),
        ).toHaveAttribute("href", `/new?starter=${example.id}`);
        await expect(
          row.locator('[data-slot="example-preview"]'),
        ).toContainText(example.design.conditions[0].name);
        expect(
          await row.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
      }
      await page.screenshot({
        path: testInfo.outputPath(`examples-${theme}-${width}.png`),
      });
      if (width === 1440) {
        const grid = page.locator('[data-slot="example-grid"]').first();
        const columnCount = () =>
          grid.evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(" ").length,
          );
        await header
          .getByRole("button", { name: "Assistant", exact: true })
          .click();
        await expect.poll(columnCount).toBe(2);
        await page
          .getByRole("complementary", { name: "Assistant", exact: true })
          .getByRole("button", { name: "Close Assistant", exact: true })
          .click();
        await expect.poll(columnCount).toBe(3);
      }
      await page
        .getByRole("link", {
          name: `Watch ${examples[0].design.title}`,
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(new RegExp(`/watch/${examples[0].id}$`));
      await expect(
        page.getByText("Scripted demo", { exact: true }).first(),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Examples", exact: true })
        .last()
        .click();
      await page
        .getByRole("link", {
          name: `Use ${examples[0].design.title}`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "New experiment", exact: true }),
      ).toBeVisible();
      expect(
        writes.every((url) => /\/design\/(validate|estimate)$/.test(url)),
      ).toBe(true);
    });
  }

test("Examples has loading, retry and empty recovery without model calls", async ({
  page,
}) => {
  let fail = true;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/starters", async (route) => {
    await pending;
    await route.fulfill(
      fail
        ? {
            status: 503,
            json: { detail: "Examples are temporarily unavailable" },
          }
        : { json: [] },
    );
  });
  await page.goto("/examples");
  await expect(
    page.getByRole("status", { name: "Loading examples" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByText("Examples are temporarily unavailable"),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("No examples available", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Loading examples" }),
  ).toHaveCount(0);
});

test("Collapsed Learn keeps one icon and useful link names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("jas-sidebar", "collapsed"),
  );
  await page.goto("/examples");
  const sidebar = page.locator('[data-slot="sidebar"]');
  for (const name of [/^Docs/, /^JAS MCP/, /^Examples$/]) {
    const link = sidebar.getByRole("link", { name });
    await expect(link).toBeVisible();
    await expect(link.locator("svg:visible")).toHaveCount(1);
  }
  await expect(
    sidebar.getByRole("link", { name: "Examples", exact: true }),
  ).toHaveAttribute("data-active", "true");
});
