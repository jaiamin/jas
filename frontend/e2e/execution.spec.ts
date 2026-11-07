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
  await expect(page.locator(".run-facts")).toContainText(
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
  await page.route(`**/api/studies/${study.id}**`, (route) => {
    if (route.request().url().endsWith("/control")) {
      const { action } = route.request().postDataJSON();
      actions.push(action);
      for (const run of study.runs)
        run.status = action === "start" ? "running" : "pausing";
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: study });
  });
  await page.goto(`/studies/${study.id}`);
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
    page.getByText("This is a preserved design revision.", { exact: false }),
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

test("switching study revisions preserves assistant visibility and the selected tab", async ({
  page,
  request,
}) => {
  const { study } = await createStudy(request);
  await request.post(`/api/studies/${study.id}/revisions`, {
    data: { design: { ...study.design, title: "Revision two" } },
  });
  await page.goto(`/studies/${study.id}?assistant=1&tab=runs`);
  await page.getByRole("combobox", { name: "Design revision" }).click();
  await page.getByRole("option", { name: "Revision 1", exact: true }).click();
  await expect(page).toHaveURL(/assistant=1/);
  await expect(page).toHaveURL(/tab=runs/);
  await expect(
    page.getByRole("button", { name: "Ask AI", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("heading", { name: study.design.title, exact: true }),
  ).toBeVisible();
});
