import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const source = readFileSync(
  new URL("../../backend/tests/fixtures/t16_sealed_relay.wat", import.meta.url),
  "utf8",
);

for (const theme of ["light", "dark"]) {
  test(`independent extension review, reuse, run and replay · ${theme}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize(
      theme === "dark"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 },
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/environments?view=candidates");
    await page.getByLabel("Candidate specification", { exact: true }).fill(
      JSON.stringify({
        format: "jas-extension-candidate-v1",
        name: `Independent relay ${theme}`,
        provenance: "Frozen T16 DEVELOPMENT fixture; no generation",
        source,
        examples: [
          { state: 24, expected: 6 },
          { state: 53, expected: 8 },
        ],
      }),
    );
    const qualified = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/extensions/qualify") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Check containment", exact: true })
      .click();
    expect((await (await qualified).json()).status).toBe("qualified");
    await page
      .getByRole("button", { name: "Validate candidate", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Needs world review", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Check sealed relay admission",
        exact: true,
      })
      .click();
    await expect(page.getByText(/^Admission passed · /)).toBeVisible();
    await expect(
      page.getByText(/Finite checks do not certify arbitrary programs/),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`admission-${theme}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByText(/^Admission passed · /)).toBeVisible();
    await page
      .getByRole("button", { name: "Save admitted environment", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Review an experiment", exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "Review", exact: true }),
    ).toHaveAttribute("data-state", "active");
    await expect(page.getByText(/Three action credits/).first()).toBeVisible();
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/studies\//);
    await page.getByRole("tab", { name: "Runs", exact: true }).click();
    await page.locator('a[href^="/runs/"]').first().click();
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      page.getByText("Complete", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Record", exact: true }).click();
    await page
      .getByRole("button", { name: "Verify exact replay", exact: true })
      .click();
    await expect(
      page.getByText("2 turns verified locally. No model calls."),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`replay-${theme}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
