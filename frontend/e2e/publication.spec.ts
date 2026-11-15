import { expect, test } from "@playwright/test";
import type { Catalog, StudyDetail } from "../src/lib/types.js";
import { templateDesign } from "./helpers.js";

test("publishing scans the exact finished evidence, invalidates review after edits and preserves its draft", async ({
  page,
  request,
}) => {
  const catalog: Catalog = await (await request.get("/api/catalog")).json();
  const design = templateDesign(catalog);
  design.seeds = [7];
  design.rounds = 1;
  for (const condition of design.conditions) {
    condition.harness = {
      kind: "scripted",
      version: "1.0.0",
      policy: "commons_half_v1",
      tools: [],
      max_requests: 0,
      max_tool_operations: 0,
    };
  }
  const saved = await request.post("/api/studies", { data: { design } });
  expect(saved.status()).toBe(201);
  const { id } = await saved.json();
  expect(
    (
      await request.post(`/api/studies/${id}/control`, {
        data: { action: "start" },
      })
    ).status(),
  ).toBe(200);
  await expect
    .poll(async () => {
      const study: StudyDetail = await (
        await request.get(`/api/studies/${id}`)
      ).json();
      return study.runs.every((run) => run.status === "complete");
    })
    .toBe(true);
  await page.route("**/api/publishing", (route) =>
    route.fulfill({
      json: { origin: "https://gallery.example", identity: null, error: null },
    }),
  );
  await page.goto(`/experiments/${id}?tab=publish`);
  await page
    .getByLabel("One-sentence finding")
    .fill("The declared scripted policy contributes half in each condition.");
  await page
    .getByLabel("Limits or notes")
    .fill("sk-proj-testonlycredential1234567890");
  await page
    .getByRole("button", { name: "Review public record", exact: true })
    .click();
  await expect(
    page.getByText("Blocked: credential", { exact: true }),
  ).toBeVisible();
  const acknowledgement = page.getByRole("checkbox", {
    name: /I reviewed this record/,
  });
  await expect(acknowledgement).toBeDisabled();
  await page
    .getByLabel("Limits or notes")
    .fill("Scripted demonstration; not model behavior.");
  await page
    .getByRole("button", { name: "Review public record", exact: true })
    .click();
  await expect(
    page.getByText("Blocked: credential", { exact: true }),
  ).toHaveCount(0);
  await expect(acknowledgement).toBeEnabled();
  await expect(page.getByText(/Replay verified 2 of 2 runs/)).toBeVisible();
  await acknowledgement.check();
  await expect(
    page.getByRole("button", { name: "Sign in with GitHub" }),
  ).toBeVisible();
  await page
    .getByLabel("One-sentence finding")
    .fill("A revised description still needs review.");
  await expect(acknowledgement).toBeDisabled();
  await expect(acknowledgement).not.toBeChecked();
  await page.reload();
  await expect(page.getByLabel("One-sentence finding")).toHaveValue(
    "A revised description still needs review.",
  );
  expect(
    (await (await request.get("/api/settings")).json()).usage.requests,
  ).toBe(0);
});
