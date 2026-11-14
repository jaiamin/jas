import { expect, test } from "@playwright/test";

test("long recorded consequences keep desktop playback within reach", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/watch/commons-messages?turn=4");
  const story = page.getByRole("region", { name: "Turn story" });
  await expect(story).toContainText("4. Consequence");
  await expect(
    page.getByRole("button", { name: "Play recording", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("slider", { name: "Recorded turn", exact: true }),
  ).toBeInViewport();
  await story.getByRole("button", { name: "Full observation" }).focus();
  await page.keyboard.press("End");
  await expect
    .poll(() => story.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
});

for (const width of [390, 1440]) {
  test(`keyless starters open the shared viewer and preserve moment links · ${width}`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/") && request.method() !== "GET")
        writes.push(request.url());
    });
    await page.goto("/watch/evidence-report");
    await expect(
      page.getByText("Scripted demo", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("Before the first turn");
    await page
      .getByRole("button", { name: "Next recorded turn", exact: true })
      .click();
    await expect(page).toHaveURL(/turn=1/);
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("Read artifact");
    await page.locator("body").press("ArrowRight");
    await expect(page).toHaveURL(/turn=2/);
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("Write artifact");
    await page.reload();
    await expect(
      page.getByRole("slider", { name: "Recorded turn", exact: true }),
    ).toHaveAttribute("aria-valuenow", "2");
    await page
      .getByRole("button", { name: /Investigator.*Scripted demo/ })
      .click();
    await expect(
      page.getByRole("complementary", { name: "Agent-visible world" }),
    ).toContainText(
      "Global metrics and private world state belong to researcher view",
    );
    await expect(
      page.getByRole("complementary", { name: "World and metrics" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Use this starter", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "New experiment", exact: true }),
    ).toBeVisible();
    expect(
      writes.every((url) => /\/design\/(validate|estimate)$/.test(url)),
    ).toBe(true);
    const settings = await (await request.get("/api/settings")).json();
    expect(settings.usage.requests).toBe(0);
  });
}

test("each bundled recording opens without provider configuration", async ({
  page,
  request,
}) => {
  const starters = await (await request.get("/api/starters")).json();
  for (const starter of starters) {
    await page.goto(`/environments?environment=${starter.design.environment}`);
    await page
      .getByRole("link", { name: "Watch a recorded run", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/watch/${starter.id}$`));
    await page
      .getByRole("button", { name: "Next recorded turn", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("1. Observation");
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("4. Consequence");
    await expect(
      page.getByRole("button", { name: "Play recording", exact: true }),
    ).toBeEnabled();
  }
  expect(
    (await (await request.get("/api/settings")).json()).usage.requests,
  ).toBe(0);
});
