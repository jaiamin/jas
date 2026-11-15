import { expect, test } from "@playwright/test";

const cards = [
  "Messages and cooperation",
  "Shared memory",
  "A scripted control",
].map((title, index) => ({
  id: `gallery-fixture-${index}`,
  title,
  finding:
    "Scripted demonstration of a recorded comparison, with evidence to inspect and replay.",
  tags: ["communication"],
  models: [],
  world: "commons",
  author: "researcher",
  slug: `fixture-${index}`,
  version: 1,
  created: "2026-11-15T00:00:00Z",
  visibility: "public",
  verified: true,
  featured: index === 0,
  fork_count: index,
  sha256: "scripted-fixture-hash",
  url: `https://gallery.example/p/researcher/fixture-${index}/v1`,
}));

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`Gallery discovery and signed-out publishing stay minimal · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      const protectedRequests: string[] = [];
      page.on("request", (request) => {
        if (/\/api\/(publishing|community\/mine)$/.test(request.url()))
          protectedRequests.push(request.url());
      });
      await page.route("**/api/community?*", (route) =>
        route.fulfill({ json: cards }),
      );
      await page.route("**/api/community/filters", (route) =>
        route.fulfill({
          json: { worlds: ["commons"], models: [], tags: ["communication"] },
        }),
      );
      await page.route("**/api/publishing", (route) =>
        route.fulfill({
          json: {
            origin: "https://gallery.example",
            identity: null,
            error: null,
          },
        }),
      );
      await page.goto("/gallery");
      await expect(
        page.getByRole("heading", { name: "Gallery", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: cards[0].title, exact: true }),
      ).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: cards[1].title, exact: true }),
      ).toBeVisible();
      expect(protectedRequests).toEqual([]);
      await expect(
        page.getByRole("button", { name: "Publish experiment" }),
      ).toHaveCount(0);
      await expect(page.getByText("Connect the gallery")).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`gallery-${theme}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("combobox", { name: "Filter world" }).click();
      await page.getByRole("option", { name: "Commons", exact: true }).click();
      await expect(page).toHaveURL(/world=commons/);
      await expect(
        page.getByRole("combobox", { name: "Filter world" }),
      ).toContainText("Commons");
      await expect(
        page.getByRole("option", { name: "Commons", exact: true }),
      ).not.toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("tab", { name: "My published" }).click();
      await expect(
        page.getByRole("button", { name: "Sign in with GitHub", exact: true }),
      ).toBeVisible();
      expect(
        protectedRequests.some((url) => url.endsWith("/community/mine")),
      ).toBe(false);
      await expect(
        page.getByRole("textbox", { name: "Gallery URL" }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`gallery-sign-in-${theme}-${width}.png`),
        fullPage: true,
      });
    });
  }
}

test("Gallery unavailable state recovers without setup instructions", async ({
  page,
}) => {
  let available = false;
  await page.route("**/api/community?*", (route) =>
    route.fulfill(
      available
        ? { json: [] }
        : { status: 503, json: { detail: "upstream diagnostic" } },
    ),
  );
  await page.route("**/api/community/filters", (route) =>
    route.fulfill({ json: { worlds: [], models: [], tags: [] } }),
  );
  await page.goto("/gallery");
  await expect(
    page.getByText("Gallery is unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Could not load this view")).toHaveCount(0);
  await expect(page.getByText("Connect the gallery")).toHaveCount(0);
  available = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("Nothing published yet", { exact: true }),
  ).toBeVisible();
});

test("My published keeps actions on each card and confirms unpublish", async ({
  page,
}) => {
  let removed = false;
  await page.route("**/api/publishing", (route) =>
    route.fulfill({
      json: {
        origin: "https://gallery.example",
        identity: { handle: "researcher", scope: "publish" },
        error: null,
      },
    }),
  );
  await page.route("**/api/community/mine", (route) =>
    route.fulfill({ json: removed ? [] : [cards[0]] }),
  );
  await page.route(
    "**/api/community/researcher/fixture-0?version=1",
    async (route) => {
      expect(route.request().method()).toBe("DELETE");
      removed = true;
      await route.fulfill({ json: { unpublished: true } });
    },
  );
  await page.goto("/gallery?view=mine");
  await expect(
    page.getByRole("heading", { name: cards[0].title, exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toBeVisible();
  expect(removed).toBe(false);
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(removed).toBe(false);
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await confirmation
    .getByRole("button", { name: "Unpublish", exact: true })
    .click();
  await expect(
    page.getByText("No publications yet", { exact: true }),
  ).toBeVisible();
  expect(removed).toBe(true);
});
