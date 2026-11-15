import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`seed results, run grid and matched replay preserve repetition · ${width}`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const starters = await (await request.get("/api/starters")).json();
    const design = starters.find(
      (starter: { id: string }) => starter.id === "commons-messages",
    ).design;
    design.seeds = [7, 19];
    design.repetitions = 2;
    design.rounds = 2;
    for (const [index, condition] of design.conditions.entries())
      condition.harness = {
        kind: "scripted",
        version: "1.0.0",
        policy: index ? "commons_half_v1" : "commons_keep_v1",
        max_requests: 0,
        max_tool_operations: 0,
        tools: [],
      };
    const created = await request.post("/api/studies", { data: { design } });
    expect(created.ok()).toBe(true);
    const { id } = await created.json();
    expect(
      (
        await request.post(`/api/studies/${id}/control`, {
          data: { action: "start" },
        })
      ).ok(),
    ).toBe(true);
    await expect
      .poll(async () =>
        (await (await request.get(`/api/studies/${id}`)).json()).runs.every(
          (run: { status: string }) => run.status === "complete",
        ),
      )
      .toBe(true);
    await page.goto(`/experiments/${id}`);
    await expect(page.getByRole("tab")).toHaveCount(5);
    await expect(
      page.getByRole("region", { name: "Experiment overview" }),
    ).toContainText("averaged");
    await expect(
      page
        .getByRole("region", { name: "Experiment overview" })
        .getByRole("img"),
    ).toHaveCount(1);
    await page.getByRole("tab", { name: "Results", exact: true }).click();
    const results = page.getByRole("region", { name: "Condition results" });
    await expect(
      results
        .getByRole("row")
        .filter({
          has: page.getByRole("cell", {
            name: "Contribution rate",
            exact: true,
          }),
        })
        .locator("svg circle"),
    ).toHaveCount(4);
    await results
      .getByRole("button", { name: /Contribution rate · No messages/ })
      .click();
    const detail = page.getByRole("dialog");
    await expect(detail.getByRole("link")).toHaveCount(4);
    await detail.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: "Runs", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Run status grid" }).getByRole("link"),
    ).toHaveCount(8);
    await page.getByRole("tab", { name: "Results", exact: true }).click();
    const match = results
      .getByRole("link", { name: "No messages / Messages", exact: true })
      .nth(1);
    await expect(match).toHaveAttribute("href", /seed=7&repetition=2/);
    await match.click();
    await expect(
      page.getByRole("heading", { name: "Matched replay", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Version 1 · seed 7 · repetition 2", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Jump to difference", exact: true })
      .click();
    await expect(page).toHaveURL(/turn=1/);
    await expect(
      page.getByRole("region", { name: "Left condition" }),
    ).toContainText("Contribute · 0");
    await expect(
      page.getByRole("region", { name: "Right condition" }),
    ).toContainText("Contribute · 5");
    await page.locator("body").press("ArrowRight");
    await expect(page).toHaveURL(/turn=2/);
    await page.reload();
    await expect(
      page.getByRole("slider", { name: "Recorded turn", exact: true }),
    ).toHaveAttribute("aria-valuenow", "2");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await (await request.get("/api/settings")).json()).usage.requests,
    ).toBe(0);
  });
}

test("closing a pending Assistant panel retains its chat and frozen cutoff", async ({
  page,
  request,
}) => {
  const starters = await (await request.get("/api/starters")).json();
  const design = starters.find(
    (starter: { id: string }) => starter.id === "commons-messages",
  ).design;
  design.seeds = [7];
  design.rounds = 1;
  for (const condition of design.conditions)
    condition.harness = {
      kind: "scripted",
      version: "1.0.0",
      policy: "commons_half_v1",
      max_requests: 0,
      max_tool_operations: 0,
      tools: [],
    };
  const created = await request.post("/api/studies", { data: { design } });
  expect(created.ok()).toBe(true);
  const { id } = await created.json();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  const runId = study.runs[0].id;
  await request.post(`/api/runs/${runId}/control`, {
    data: { action: "start" },
  });
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/runs/${runId}`)).json()).summary.status,
    )
    .toBe("complete");
  await page.route("**/api/settings", async (route) => {
    const actual = await (await route.fetch()).json();
    await route.fulfill({
      json: { ...actual, providers: { ...actual.providers, openai: true } },
    });
  });
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let sends = 0;
  let body: Record<string, unknown> = {};
  await page.route("**/api/chats", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    sends++;
    body = route.request().postDataJSON();
    await pending;
    await route.fulfill({
      status: 202,
      json: { id: "panel-answer", chat_id: "panel-chat" },
    });
  });
  await page.route("**/api/chats/panel-chat", (route) =>
    route.fulfill({
      json: [
        {
          id: "panel-answer",
          chat_id: "panel-chat",
          purpose: "analysis",
          status: "complete",
          question: "What happened by this turn?",
          run_id: runId,
          study_id: id,
          cutoffs: { [runId]: 1 },
          output: { answer: "Pinned response", citations: [], caveats: [] },
          usage: {
            requests: 0,
            input_tokens: 0,
            output_tokens: 0,
            cost_usd: 0,
            partial: false,
          },
          error: null,
          created: "2026-11-14",
        },
      ],
    }),
  );
  await page.goto(`/runs/${runId}?turn=1`);
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  let panel = page.getByRole("complementary", {
    name: "Assistant",
    exact: true,
  });
  await panel
    .getByLabel("Message Assistant", { exact: true })
    .fill("What happened by this turn?");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect.poll(() => sends).toBe(1);
  expect(body).toMatchObject({
    context: `run:${runId}`,
    revision: 1,
    through_turn: 1,
  });
  await panel
    .getByRole("button", { name: "Close Assistant", exact: true })
    .click();
  finish();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key),
        `jas:assistant-panel:run:${runId}:1`,
      ),
    )
    .toBe("panel-chat");
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  panel = page.getByRole("complementary", { name: "Assistant", exact: true });
  await expect(
    panel.getByText("Pinned response", { exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: /chat history/i }).click();
  await expect(
    page.getByRole("link", { name: "Open in Assistant", exact: true }),
  ).toHaveAttribute("href", /chat=panel-chat.*revision=1.*through_turn=1/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Recent chats" })).toHaveCount(
    0,
  );
  await panel
    .getByRole("button", { name: "Close Assistant", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Assistant", exact: true })
      .getByText("Pinned response", { exact: true }),
  ).toBeVisible();
  expect(sends).toBe(1);
  expect(
    (await (await request.get("/api/settings")).json()).usage.requests,
  ).toBe(0);
});
