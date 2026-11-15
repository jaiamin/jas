import { expect, test } from "@playwright/test";
import { createStudy } from "./helpers.js";

test("run controls advance, start, pause and suppress completed actions", async ({
  page,
  request,
}) => {
  const { run } = await createStudy(request);
  const id = run.summary.id;
  const actions: string[] = [];
  await page.route(`**/api/runs/${id}`, (route) =>
    route.fulfill({ json: run }),
  );
  await page.route(`**/api/runs/${id}/turns/*`, (route) =>
    route.fulfill({ json: { number: 0, checkpoint: run.state } }),
  );
  await page.route(`**/api/runs/${id}/control`, async (route) => {
    const { action } = route.request().postDataJSON();
    actions.push(action);
    if (action === "step") {
      run.summary.turn = 1;
      run.summary.status = "paused";
    } else run.summary.status = action === "start" ? "running" : "pausing";
    await route.fulfill({ json: {} });
  });
  await page.goto(`/runs/${id}?turn=0`);
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.getByLabel("Run progress")).toContainText(
    `1 / ${run.summary.total_turns}`,
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page).not.toHaveURL(/turn=/);
  await expect(
    page.getByRole("button", { name: "Step", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Finishing turn…" }),
  ).toBeDisabled();
  run.summary.status = "paused";
  await expect(
    page.getByRole("button", { name: "Run", exact: true }),
  ).toBeEnabled();
  expect(actions).toEqual(["step", "start", "pause"]);
  run.summary.status = "complete";
  // Idle runs refresh on navigation/focus rather than polling an external writer.
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Step", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Run", exact: true }),
  ).toHaveCount(0);
});

test("study control follows active runs, including pausing, and preserves old revisions", async ({
  page,
  request,
}) => {
  const { study } = await createStudy(request);
  const actions: string[] = [];
  await page.route(
    new RegExp(`/api/studies/${study.id}(?:/control)?(?:\\?.*)?$`),
    (route) => {
      if (route.request().url().endsWith("/control")) {
        const { action } = route.request().postDataJSON();
        actions.push(action);
        for (const run of study.runs)
          run.status = action === "start" ? "running" : "pausing";
        return route.fulfill({ json: {} });
      }
      return route.fulfill({ json: study });
    },
  );
  await page.goto(`/experiments/${study.id}`);
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause experiment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause experiment" }).click();
  await expect(page.getByRole("link", { name: "Watch live" })).toHaveAttribute(
    "href",
    `/runs/${study.runs[0]?.id}`,
  );
  for (const run of study.runs) run.status = "paused";
  await expect(
    page.getByRole("button", { name: "Run experiment" }),
  ).toBeVisible();
  expect(actions).toEqual(["start", "pause"]);
  study.revisions.unshift({ number: 2, created: study.created, sha256: "new" });
  await page.reload();
  await expect(
    page.getByText("This is a preserved design version.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run experiment" }),
  ).toHaveCount(0);
  study.revisions.shift();
  for (const run of study.runs) run.status = "complete";
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Run experiment" }),
  ).toHaveCount(0);
});

test("switching study revisions preserves the selected tab and Agent context", async ({
  page,
  request,
}) => {
  const { study } = await createStudy(request);
  await request.post(`/api/studies/${study.id}/revisions`, {
    data: { design: { ...study.design, title: "Revision two" } },
  });
  await page.goto(`/experiments/${study.id}?tab=runs`);
  await page.getByRole("combobox", { name: "Design version" }).click();
  await page.getByRole("option", { name: "Version 1", exact: true }).click();
  await expect(page).toHaveURL(/tab=runs/);
  await expect(
    page.getByRole("heading", { name: study.design.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Assistant", exact: true }),
  ).toContainText("v1");
});

test("execution errors open request inspection without changing the recorded cutoff", async ({
  page,
  request,
}) => {
  const { run } = await createStudy(request);
  run.summary.error = "Provider unavailable";
  run.summary.status = "failed";
  await page.route(`**/api/runs/${run.summary.id}`, (route) =>
    route.fulfill({ json: run }),
  );
  await page.goto(`/runs/${run.summary.id}?turn=0`);
  await page
    .getByRole("button", { name: "Inspect requests", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Rules & evidence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Record", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/turn=0/);
});
