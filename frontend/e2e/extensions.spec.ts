import { expect, test } from "@playwright/test";

const safe = {
  format: "jas-extension-candidate-v1",
  name: "T02 browser safe fixture",
  provenance: "Independent keyless DEVELOPMENT fixture",
  source:
    '(module (func (export "step") (param i32) (result i32) local.get 0 i32.const 4 i32.add))',
  examples: [{ state: 3, expected: 7 }],
};

test("candidate review qualifies the real runtime and retains the submitted draft", async ({
  page,
}) => {
  await page.goto("/environments");
  await page.getByRole("tab", { name: "Candidates", exact: true }).click();
  await page.getByLabel("Candidate specification").fill(JSON.stringify(safe));
  await page.getByRole("tab", { name: "Built-in", exact: true }).click();
  await page.getByRole("tab", { name: "Candidates", exact: true }).click();
  await expect(page.getByLabel("Candidate specification")).toHaveValue(
    JSON.stringify(safe),
  );
  await page
    .getByRole("button", { name: "Check containment", exact: true })
    .click();
  await expect(
    page.getByText("Containment qualified", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Validate candidate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Needs world review" }),
  ).toBeVisible();
  await expect(
    page.getByText("Experiment execution is disabled.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "T02 browser safe fixture", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/review=[a-f0-9]+/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Needs world review" }),
  ).toBeVisible();
  await expect(
    page.getByText("Supplied examples matched.", { exact: true }),
  ).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`candidate failure and draft recovery remain usable on mobile · ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    const unavailable = {
      status: "failed",
      validation_enabled: false,
      execution_enabled: false,
      detail: "Worker unavailable; containment is not qualified.",
      fingerprint: null,
      case_sha256: null,
      wasmtime_version: null,
      checks: [],
    };
    await page.route("**/api/extensions/runtime", (route) =>
      route.fulfill({ json: unavailable }),
    );
    await page.route("**/api/extensions/qualify", (route) =>
      route.fulfill({ json: unavailable }),
    );
    await page.goto("/environments?view=candidates");
    await expect(
      page.getByRole("button", { name: "Validate candidate", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Candidate specification").fill('{"unfinished":');
    await page
      .getByRole("button", { name: "Check containment", exact: true })
      .click();
    await expect(
      page.getByText("Validation disabled", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(unavailable.detail, { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Candidate specification")).toHaveValue(
      '{"unfinished":',
    );
    await expect(
      page.getByRole("button", { name: "Validate candidate", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Candidate specification").focus();
    await expect(page.getByLabel("Candidate specification")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../data/t02/browser-candidate-${theme}.png`,
      fullPage: true,
    });
  });
}
