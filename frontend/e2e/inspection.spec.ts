import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test";

for (const { theme, width, assistant } of [
  { theme: "light", width: 390, assistant: false },
  { theme: "dark", width: 390, assistant: false },
  { theme: "light", width: 1440, assistant: true },
]) {
  test(`decision inspection focuses evidence and returns to journal · ${theme} · ${width}`, async ({
    page,
    request,
  }) => {
    const { id } = await recordedRun(page, request);
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/runs/${id}?turn=20&tab=decisions`);
    if (assistant)
      await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    const scrubber = page.getByRole("slider", { name: "Recorded turn" });
    await scrubber.focus();
    await scrubber.press("ArrowLeft");
    await expect(scrubber).toHaveAttribute("aria-valuenow", "19");
    await expect(page).toHaveURL(/turn=19/);
    await expect(
      page.getByRole("button", { name: "20", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("20 decisions", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "19", exact: true }).click();
    const evidence = page.getByRole("heading", {
      name: "Turn 19 evidence",
      exact: true,
    });
    await expect(evidence).toBeFocused();
    expect((await evidence.boundingBox())?.y).toBeLessThan(200);
    await page.getByRole("button", { name: "Back to decisions" }).click();
    const journal = page.getByRole("heading", {
      name: "Decision journal",
      exact: true,
    });
    await expect(journal).toBeFocused();
    expect((await journal.boundingBox())?.y).toBeLessThan(200);
  });
}

test("observation drafts stay with their recorded turn through polling and navigation", async ({
  page,
  request,
}) => {
  const { id, run } = await recordedRun(page, request);
  run.summary.status = "running";
  let saved: { turn: number; note: string } | undefined;
  await page.route(`**/api/runs/${id}/annotations`, async (route) => {
    if (route.request().method() === "POST") {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { id: 1 } });
    }
    return route.fulfill({
      json: saved ? [{ id: 1, label: "Observation", ...saved }] : [],
    });
  });
  await page.goto(`/runs/${id}`);
  await page.getByRole("button", { name: "Researcher observations" }).click();
  await expect(page).toHaveURL(/turn=20/);
  await page
    .getByLabel("Add an observation at turn 20")
    .fill("Evidence at turn twenty");
  run.summary.turn = 21;
  run.turns.push({ ...run.turns[0], number: 21 });
  await expect(
    page.getByRole("button", { name: "21", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Add an observation at turn 20")).toHaveValue(
    "Evidence at turn twenty",
  );
  await page.getByRole("button", { name: "21", exact: true }).click();
  await expect(page.getByLabel("Add an observation at turn 21")).toHaveValue(
    "",
  );
  await page
    .getByLabel("Add an observation at turn 21")
    .fill("Separate turn twenty-one draft");
  await page.getByRole("button", { name: "20", exact: true }).click();
  await expect(page.getByLabel("Add an observation at turn 20")).toHaveValue(
    "Evidence at turn twenty",
  );
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByText("Evidence at turn twenty", { exact: true }),
  ).toBeVisible();
  expect(saved).toMatchObject({ turn: 20, note: "Evidence at turn twenty" });
  await page.getByRole("button", { name: "21", exact: true }).click();
  await expect(page.getByLabel("Add an observation at turn 21")).toHaveValue(
    "Separate turn twenty-one draft",
  );
});

async function recordedRun(page: Page, request: APIRequestContext) {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = catalog.templates[0].design;
  const created = await (
    await request.post("/api/studies", { data: { design } })
  ).json();
  const study = await (await request.get(`/api/studies/${created.id}`)).json();
  const id = study.runs[0].id;
  const run = await (await request.get(`/api/runs/${id}`)).json();
  const action = {
    kind: "contribute",
    amount: 3,
    target: "",
    message: "",
    report: null,
    promise: null,
  };
  run.summary = { ...run.summary, turn: 20, round: 4, status: "paused" };
  run.turns = Array.from({ length: 20 }, (_, i) => ({
    number: i + 1,
    round: Math.ceil((i + 1) / 6),
    actor: design.profiles[i % 6].key,
    action,
    rationale: "A recorded test decision with an inspectable consequence.",
    latency_ms: 1000,
  }));
  await page.route(`**/api/runs/${id}`, (route) =>
    route.fulfill({ json: run }),
  );
  await page.route(`**/api/runs/${id}/turns/*`, (route) => {
    const number = Number(
      new URL(route.request().url()).pathname.split("/").at(-1),
    );
    return route.fulfill({
      json: {
        number,
        actor: design.profiles[0].key,
        observation: {},
        decision: {
          action,
          rationale: "Selected evidence",
          memory: "",
          forecast: null,
        },
        checkpoint: run.state,
        events: [],
        state_hash: "test",
      },
    });
  });
  return { id, run };
}
