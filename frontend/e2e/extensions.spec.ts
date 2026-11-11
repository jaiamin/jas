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
  const qualification = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/extensions/qualify") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Check containment", exact: true })
    .click();
  const qualified = await qualification;
  expect(qualified.ok()).toBe(true);
  expect((await qualified.json()).status).toBe("qualified");
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

test("new candidate validation replaces the selected historical review", async ({
  page,
}) => {
  const qualification = await page.request.post("/api/extensions/qualify");
  expect((await qualification.json()).status).toBe("qualified");
  const created = await page.request.post("/api/extensions/validate", {
    data: { ...safe, name: "Earlier candidate" },
  });
  expect(created.ok()).toBe(true);
  const earlier = await created.json();
  const originalURL = `/environments?view=candidates&review=${earlier.id}`;
  await page.goto(originalURL);
  const review = page.getByRole("region", {
    name: "Candidate review",
    exact: true,
  });
  await expect(
    review.getByText("Earlier candidate", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Candidate specification", { exact: true })
    .fill(JSON.stringify(safe));
  const submitted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/extensions/validate") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Validate candidate", exact: true })
    .click();
  const saved = await (await submitted).json();
  expect(saved.id).not.toBe(earlier.id);
  await expect(page).toHaveURL(new RegExp(`review=${saved.id}`));
  await expect(review.getByText(safe.name, { exact: true })).toBeVisible();
  await page.reload();
  await expect(review.getByText(safe.name, { exact: true })).toBeVisible();
  await page.goto(originalURL);
  await expect(
    review.getByText("Earlier candidate", { exact: true }),
  ).toBeVisible();
});

test("late candidate validation preserves the newly selected historical review", async ({
  page,
}) => {
  const qualification = await page.request.post("/api/extensions/qualify");
  expect((await qualification.json()).status).toBe("qualified");
  const original = await page.request.post("/api/extensions/validate", {
    data: { ...safe, name: "Original historical candidate" },
  });
  const originalReview = await original.json();
  const other = await page.request.post("/api/extensions/validate", {
    data: { ...safe, name: "Other historical candidate" },
  });
  const otherReview = await other.json();
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/extensions/validate", async (route) => {
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  await page.goto(`/environments?view=candidates&review=${originalReview.id}`);
  await page
    .getByLabel("Candidate specification", { exact: true })
    .fill(JSON.stringify(safe));
  const response = page.waitForResponse(
    (value) =>
      value.url().endsWith("/api/extensions/validate") &&
      value.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Validate candidate", exact: true })
    .click();
  try {
    await page
      .getByRole("link", { name: "Other historical candidate", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`review=${otherReview.id}`));
  } finally {
    release();
  }
  expect((await response).ok()).toBe(true);
  await expect(
    page.getByRole("button", { name: "Validate candidate", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(new RegExp(`review=${otherReview.id}`));
  await expect(
    page
      .getByRole("region", { name: "Candidate review", exact: true })
      .getByText("Other historical candidate", { exact: true }),
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
