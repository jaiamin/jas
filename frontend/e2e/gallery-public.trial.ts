import { expect, test } from "@playwright/test";

test("Gallery honors system dark mode when browser storage is unavailable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException(
          "Browser storage is unavailable",
          "SecurityError",
        );
      },
    });
  });
  await page.goto("/gallery");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.getByRole("link", { name: /A recorded commons experiment/ }),
  ).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`anonymous phone reading loads one recording on demand and supports playback · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    const recordings: string[] = [];
    const writes: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (req) => {
      if (/\/runs\//.test(req.url())) recordings.push(req.url());
      if (req.url().includes("/api/") && req.method() !== "GET")
        writes.push(req.url());
    });
    await page.goto("/gallery");
    const footerLinks = page.locator("footer").getByRole("link");
    await expect(footerLinks).toHaveCount(3);
    for (const link of await footerLinks.all()) {
      await expect(link).toHaveCSS("text-decoration-line", "underline");
      await expect(link).toHaveCSS("text-underline-offset", "4px");
      await expect(link).toHaveCSS("text-decoration-thickness", "1px");
    }
    await expect(page.locator("html")).toHaveClass(
      theme === "dark" ? "dark" : "",
    );
    await page
      .getByRole("link", { name: /A recorded commons experiment/ })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "A recorded commons experiment",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("Before the first turn");
    expect(recordings).toHaveLength(1);
    await page
      .getByRole("button", { name: "Next recorded turn", exact: true })
      .click();
    await expect(page).toHaveURL(/turn=1/);
    await expect(
      page.getByRole("region", { name: "Turn story" }),
    ).toContainText("Contribute");
    await page
      .getByRole("button", { name: /Replay verified, 2 of 2 runs/ })
      .click();
    await expect(
      page.getByText(/Recorded actions reproduce every saved state/),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("slider", { name: "Recorded turn", exact: true }),
    ).toHaveAttribute("aria-valuenow", "1");
    await expect(page.getByText(/jas fork researcher\//)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download full record" }),
    ).toHaveAttribute("href", /\/record\?version=1$/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`public-phone-${theme}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Report this publication" }).click();
    await page
      .getByLabel("What should the operator review?")
      .fill("A browser regression report for this scripted demonstration.");
    await page
      .getByRole("button", { name: "Send report", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Report sent");
    expect(writes).toHaveLength(1);
    expect(errors).toEqual([]);
    expect((await request.get("/api/settings")).status()).toBe(404);
  });
}

test("anonymous Gallery account page never requests protected device tokens", async ({
  page,
}) => {
  const protectedReads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/gallery-account/tokens"))
      protectedReads.push(request.url());
  });
  await page.goto("/gallery/account");
  await expect(
    page.getByRole("heading", { name: "Sign in to publish", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue with GitHub", exact: true }),
  ).toBeVisible();
  expect(protectedReads).toEqual([]);
});
