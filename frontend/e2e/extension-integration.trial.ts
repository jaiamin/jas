import { readFileSync } from "node:fs";
import { type APIRequestContext, expect, test } from "@playwright/test";
import type { Design, SavedEnvironment } from "../src/lib/types.js";

const source = readFileSync(
  new URL("../../backend/tests/fixtures/t16_sealed_relay.wat", import.meta.url),
  "utf8",
);

async function prepare(request: APIRequestContext) {
  expect(
    (await (await request.post("/api/extensions/qualify", { data: {} })).json())
      .status,
  ).toBe("qualified");
  const review = await (
    await request.post("/api/extensions/validate", {
      data: {
        format: "jas-extension-candidate-v1",
        name: "Independent integration relay",
        provenance: "Frozen DEVELOPMENT fixture; no generation or live calls",
        source,
        examples: [{ state: 24, expected: 6 }],
      },
    })
  ).json();
  const admission = await (
    await request.post(`/api/extensions/reviews/${review.id}/admit`, {
      data: { profile: "sealed-relay-v1" },
    })
  ).json();
  expect(admission.runnable).toBe(true);
  const saved = await request.post("/api/environments", {
    data: {
      definition: {
        name: "Independent integration relay",
        environment: "sealed_relay",
        rule_version: "1.0.0",
        extension: admission.package,
        examples: [
          {
            key: "relay",
            name: "Explicit finite relay",
            roles: ["amber", "slate"],
            parameters: {
              relay: {
                submitter: "amber",
                reviewer: "slate",
                docket: "seal-42",
              },
            },
          },
        ],
      },
    },
  });
  expect(saved.status()).toBe(201);
  return (await saved.json()) as SavedEnvironment;
}

for (const theme of ["light", "dark"]) {
  test(`pinned relay drafts survive library deletion · ${theme}`, async ({
    page,
    request,
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
    const saved = await prepare(request);
    const applied = await request.post("/api/design/use-environment", {
      data: { source: saved, example: "relay" },
    });
    const design = (await applied.json()) as Design;
    design.title = `Pinned relay ${theme}`;
    const study = await (
      await request.post("/api/studies", { data: { design } })
    ).json();
    expect(study.id).toBeTruthy();
    const removed = await request.delete(
      `/api/environments/${saved.id}?revision=1`,
    );
    expect(removed.status()).toBe(200);
    // Remove only this keyless workspace's other relay library entries too:
    // the catalog must genuinely lack a relay entry, while revision pins remain.
    for (const entry of (await (
      await request.get("/api/environments")
    ).json()) as SavedEnvironment[]) {
      if (entry.definition.environment === "sealed_relay") {
        expect(
          (
            await request.delete(
              `/api/environments/${entry.id}?revision=${entry.revision}`,
            )
          ).status(),
        ).toBe(200);
      }
    }
    const before = await (await request.get("/api/settings")).json();
    await page.goto(`/new?study=${study.id}`);
    await expect(page.getByLabel("Experiment name")).toHaveValue(design.title);
    await page.getByLabel("Experiment name").fill(`Retained ${theme}`);
    await page.reload();
    await expect(page.getByLabel("Experiment name")).toHaveValue(
      `Retained ${theme}`,
    );
    await page.getByRole("tab", { name: "Conditions", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Condition 1 model", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Condition 1 memory", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", {
        name: "Condition 1 participant harness",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Run plan", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Relay success", exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Agents", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add agent", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Remove Participant 1", exact: true }),
    ).toBeDisabled();
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await page
      .getByText("Admitted extension and independent checks", { exact: true })
      .click();
    await expect(
      page
        .getByText(`SHA-256 ${saved.definition.extension?.sha256}`, {
          exact: false,
        })
        .first(),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`pinned-editor-${theme}.png`),
      fullPage: true,
    });
    const after = await (await request.get("/api/settings")).json();
    expect(after.usage).toEqual(before.usage);
    const retained = await (
      await request.get(`/api/studies/${study.id}/export`)
    ).json();
    expect(
      retained.revisions[0].design.environment_source.definition.extension,
    ).toEqual(saved.definition.extension);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("selecting an admitted relay pins its package and retains the existing participants", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const saved = await prepare(request);
  const catalog = await (await request.get("/api/catalog")).json();
  const original = catalog.templates.find(
    (entry: { id: string }) => entry.id === "bargaining",
  ).design as Design;
  expect(original.profiles).toHaveLength(2);
  const before = await (await request.get("/api/settings")).json();
  await page.goto("/new?template=bargaining");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/design/use-environment", async (route) => {
    await gate;
    await route.continue();
  });
  const applying = page.waitForRequest(
    (r) => r.url().endsWith("/api/design/use-environment"),
    { timeout: 10_000 },
  );
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .press("Enter");
  await page
    .getByRole("option", { name: "Admitted sealed relay", exact: true })
    .press("Enter");
  // Wait for the dialog's initial Cancel focus before navigating to its action.
  // A locator.press during opening can race Radix's automatic focus transfer.
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Change environment", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await applying;
  await expect(page.getByLabel("Experiment name")).toBeDisabled();
  release();
  await expect(page.getByLabel("Experiment name")).toBeEnabled();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  const submitted = page.waitForRequest(
    (r) => r.url().endsWith("/api/studies") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  const pinned = (await submitted).postDataJSON().design as Design;
  expect(pinned.profiles).toEqual(original.profiles);
  expect(pinned.environment_source).toEqual(saved);
  expect(pinned.conditions[0].parameters.relay).toEqual({
    submitter: original.profiles[0].key,
    reviewer: original.profiles[1].key,
    docket: "seal-42",
  });
  await expect(page).toHaveURL(/\/studies\//);
  const after = await (await request.get("/api/settings")).json();
  expect(after.usage).toEqual(before.usage);
});

test("an incompatible population stays intact with a visible relay selection error", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await prepare(request);
  const catalog = await (await request.get("/api/catalog")).json();
  const original = catalog.templates.find(
    (entry: { id: string }) => entry.id === "commons",
  ).design as Design;
  expect(original.profiles.length).toBeGreaterThan(2);
  const before = await (await request.get("/api/settings")).json();
  await page.goto("/new?template=commons");
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Admitted sealed relay", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change environment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/exactly two/i);
  await expect(
    page.getByRole("combobox", { name: "Environment", exact: true }),
  ).toHaveText("Shared commons");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  const retained = JSON.parse(
    await page.getByLabel("Complete JSON specification").inputValue(),
  ) as Design;
  expect(retained).toEqual(original);
  expect((await (await request.get("/api/settings")).json()).usage).toEqual(
    before.usage,
  );
});
