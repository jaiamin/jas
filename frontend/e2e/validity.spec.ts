import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

test("checks expose institution incentive limits without spending and invalidate after edits", async ({
  page,
  request,
}) => {
  const before = await (await request.get("/api/settings")).json();
  await page.goto("/new?template=institution");
  await page
    .getByRole("button", { name: "Check experiment", exact: true })
    .click();
  const report = page.getByRole("region", { name: "Experiment check" });
  await expect(report.getByText("Review experiment limits")).toBeVisible();
  await report.getByRole("button", { name: /Review \d+ findings/ }).click();
  await expect(report.getByText(/Work earns 2 personal credits/)).toBeVisible();
  await expect(report.getByText(/no finite resource stock/)).toBeVisible();
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Changed check snapshot");
  await expect(
    page.getByText("Protocol changed. Check again for current findings."),
  ).toBeVisible();
  await expect(report).toHaveCount(0);
  const after = await (await request.get("/api/settings")).json();
  expect(after.usage.requests).toBe(before.usage.requests);
});

test("JSON inactive treatments are blocked in the editor and at the real save endpoint", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog);
  design.conditions[1].parameters.institution.oversight = 0.123;
  await page.goto("/new?template=commons");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  await page
    .getByLabel("Complete JSON specification")
    .fill(JSON.stringify(design));
  await page
    .getByRole("button", { name: "Check experiment", exact: true })
    .click();
  await expect(page.getByText("Resolve before execution")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create experiment", exact: true }),
  ).toBeDisabled();
  const saved = await request.post("/api/studies", { data: { design } });
  expect(saved.status()).toBe(422);
});

test("mobile check, save and overview show the same real report", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/new?template=commons");
  await page
    .getByRole("button", { name: "Check experiment", exact: true })
    .click();
  await expect(page.getByText("No mechanical issues found")).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/studies") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  const { id } = await (await response).json();
  await page.waitForURL(`**/studies/${id}`);
  await expect(page.getByText("No mechanical issues found")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run experiment", exact: true }),
  ).toBeEnabled();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  expect(study.preflight.status).toBe("checked");
  expect(study.preflight.probe_turns).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
