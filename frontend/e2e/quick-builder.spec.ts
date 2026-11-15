import { expect, test } from "@playwright/test";
import { selectEditorSection } from "./helpers.js";

for (const width of [390, 1440]) {
  test(`General preserves invalid seeds and the full protocol across modes · ${width}`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") writes.push(request.url());
    });
    await page.goto("/new?starter=workflow-materials");
    await expect(
      page.getByRole("tab", { name: "General", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("combobox", { name: "What varies" }),
    ).toHaveText("Material stock");
    await expect(
      page.getByLabel("Material units for Seven material units"),
    ).toHaveValue("7");
    await expect(
      page.getByLabel("Material units for Nine material units"),
    ).toHaveValue("9");
    await expect(
      page.getByRole("button", { name: "Save and run", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Seeds and repetitions", exact: true })
      .click();
    const seeds = page.getByLabel("Seeds", { exact: true });
    await seeds.fill("7, unfinished");
    await expect(
      page.getByRole("button", { name: "Save", exact: true }),
    ).toBeDisabled();
    await page.getByRole("tab", { name: "Advanced", exact: true }).click();
    await selectEditorSection(page, "Run plan");
    await expect(page.getByLabel("Matched seeds", { exact: true })).toHaveValue(
      "7, unfinished",
    );
    await page.goto("/");
    await page.goto("/new?starter=workflow-materials");
    await expect(page.getByLabel("Matched seeds", { exact: true })).toHaveValue(
      "7, unfinished",
    );
    await page.getByRole("tab", { name: "General", exact: true }).click();
    await page
      .getByRole("button", { name: "Seeds and repetitions", exact: true })
      .click();
    await seeds.fill("7, 11");
    await expect(
      page.getByRole("button", { name: "Save", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/experiments\/[a-f0-9]+$/);
    const id = page.url().split("/").at(-1);
    const saved = await (await request.get(`/api/studies/${id}`)).json();
    const starters = await (await request.get("/api/starters")).json();
    const original = starters.find(
      (starter: { id: string }) => starter.id === "workflow-materials",
    ).design;
    expect(saved.design).toEqual({ ...original, seeds: [7, 11] });
    expect(writes.some((url) => url.endsWith("/control"))).toBe(false);
    expect(
      (await (await request.get("/api/settings")).json()).usage.requests,
    ).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("Save and run commits one explicit start and the displayed ceiling", async ({
  page,
  request,
}) => {
  const starters = await (await request.get("/api/starters")).json();
  const design = starters.find(
    (starter: { id: string }) => starter.id === "evidence-report",
  ).design;
  design.budget_usd = 0.5;
  design.conditions[0].harness = {
    kind: "scripted",
    version: "1.0.0",
    policy: "artifact_copy_v1",
    max_requests: 0,
    max_tool_operations: 0,
    tools: [],
  };
  const path = "/new?starter=evidence-report";
  await page.goto("/");
  await page.evaluate(
    ({ design, path }) =>
      localStorage.setItem(
        `jas:draft:${path}`,
        JSON.stringify({
          path,
          title: design.title,
          updated: new Date().toISOString(),
          design,
          json: "",
          mode: "quick",
        }),
      ),
    { design, path },
  );
  let starts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/control"))
      starts++;
  });
  await page.goto(path);
  const run = page.getByRole("button", { name: "Save and run", exact: true });
  await expect(run).toBeEnabled();
  await expect(page.locator("#estimate-summary")).toContainText(
    "Spending ceiling: $0.50",
  );
  await run.click();
  await expect(page).toHaveURL(/\/experiments\/[a-f0-9]+$/);
  const id = page.url().split("/").at(-1);
  await expect
    .poll(async () =>
      (await (await request.get(`/api/studies/${id}`)).json()).runs.every(
        (run: { status: string }) => run.status === "complete",
      ),
    )
    .toBe(true);
  expect(starts).toBe(1);
  expect(
    (await (await request.get(`/api/studies/${id}`)).json()).design.budget_usd,
  ).toBe(0.5);
  expect(
    (await (await request.get("/api/settings")).json()).usage.requests,
  ).toBe(0);
});

test("unknown starters are explicit errors", async ({ page }) => {
  await page.goto("/new?starter=does-not-exist");
  await expect(page.getByRole("alert")).toContainText("Starter not found");
  await expect(
    page.getByRole("textbox", { name: "Question", exact: true }),
  ).toHaveCount(0);
});
