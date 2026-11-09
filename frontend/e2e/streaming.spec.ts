import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`Agent streams formatted prose, keeps the composer anchored and recovers after disconnect · ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize(
      theme === "dark"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    );
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          providers: { openai: true },
          planner_model: "openai:gpt-6.1-sol",
          assistant_model: "openai:gpt-6.1-sol",
        },
      }),
    );
    let row = {
      id: "stream-answer",
      chat_id: "stream-chat",
      question: "Explain matched seeds",
      purpose: "general",
      status: "pending",
      cutoffs: {},
      usage: { cost_usd: 12.34, partial: false },
      study_id: null,
      run_id: null,
      output: {
        stage: "answering",
        activity: ["answering"],
        partial: "",
        answer: "",
        citations: [],
        caveats: [],
      },
    };
    let releaseStream = () => {};
    const ready = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    await page.route("**/api/chats", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 202,
            json: { id: row.id, chat_id: row.chat_id },
          })
        : route.fulfill({ json: [] }),
    );
    await page.route("**/api/chats/stream-chat", (route) =>
      route.fulfill({ json: [row] }),
    );
    await page.route("**/api/chats/stream-chat/events", async (route) => {
      await ready;
      row.output.activity.push("writing");
      row.output.partial =
        "## Matched seeds\n\nUse the **same initial randomization** in each condition.\n\n1. Choose seeds.\n2. Run each condition.\n\n| Condition | Seed |\n| --- | --- |\n| Control | 7 |\n| Treatment | 7 |\n\n```python\nseeds = [7, 19, 42]\n```";
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify(row)}\n\n`,
      });
    });
    await page.goto("/agent");
    await expect(
      page.getByLabel("Message Agent", { exact: true }),
    ).toHaveAttribute("rows", "3");
    const composer = page.getByRole("form", { name: "Agent composer" });
    const emptyBounds = await composer.boundingBox();
    const suggestions = await page
      .getByRole("region", { name: "Suggested questions" })
      .boundingBox();
    expect(emptyBounds?.y).toBeLessThan(
      (page.viewportSize()?.height ?? 0) * 0.6,
    );
    expect(suggestions?.y).toBeGreaterThan(
      (emptyBounds?.y ?? 0) + (emptyBounds?.height ?? 0),
    );
    await page
      .getByLabel("Message Agent", { exact: true })
      .fill("Explain matched seeds");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      page.locator('[data-slot="trace-line"][role="status"]'),
    ).toHaveText("Thinking");
    await expect(page.locator("[data-slot=spinner]")).toHaveCount(1);
    const target = await page
      .getByLabel("Assistant", { exact: true })
      .boundingBox();
    const thinking = await page
      .getByRole("button", { name: "Thinking", exact: true })
      .boundingBox();
    expect(thinking && target && thinking.y >= target.y + target.height).toBe(
      true,
    );
    expect(thinking?.x).toBeCloseTo(target?.x ?? 0, 0);
    const viewport = await page
      .getByRole("region", { name: "Agent conversation", exact: true })
      .boundingBox();
    const firstQuestion = await page
      .locator('[data-slot="message"][data-align="end"]')
      .first()
      .boundingBox();
    expect(
      firstQuestion && viewport && firstQuestion.y - viewport.y,
    ).toBeLessThanOrEqual(24);
    const inputSurface = await composer
      .locator('[data-slot="input-group"]')
      .boundingBox();
    expect(
      viewport && inputSurface && viewport.y + viewport.height - inputSurface.y,
    ).toBeCloseTo(12, 0);
    releaseStream();
    await expect(
      page.getByRole("heading", { name: "Matched seeds", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="trace-line"][role="status"]'),
    ).toHaveText("Writing");
    await expect(page.getByRole("table")).toContainText("Treatment");
    await expect(page.locator("[data-slot=bubble] ol li")).toHaveCount(2);
    await expect(page.locator("[data-slot=bubble] pre code")).toContainText(
      "seeds = [7, 19, 42]",
    );
    await expect(page.locator('[data-streaming="true"]')).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Send message", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("Message Agent", { exact: true }),
    ).toHaveAttribute("rows", "2");
    const activeBounds = await composer.boundingBox();
    expect(activeBounds?.y).toBeGreaterThan(
      (page.viewportSize()?.height ?? 0) * 0.6,
    );
    await expect(composer).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await expect(
      page.getByRole("heading", { name: row.question, exact: true }),
    ).toBeVisible();
    await expect(page.getByTitle("Copy response", { exact: true })).toHaveCount(
      0,
    );
    await page.screenshot({
      path: testInfo.outputPath(`streaming-${theme}.png`),
      animations: "disabled",
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page
        .locator("[data-slot=trace-line][role=status] svg")
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).animationDuration),
        ),
    ).toBeLessThanOrEqual(0.01);
    row = {
      ...row,
      status: "complete",
      output: { ...row.output, partial: "", answer: row.output.partial },
    };
    await expect(page.locator('[data-streaming="true"]')).toHaveCount(0);
    await expect(
      page.locator('[data-slot="trace-line"][role="status"]'),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Matched seeds", exact: true }),
    ).toBeVisible();
    const activity = page.getByRole("button", {
      name: "Activity",
      exact: true,
    });
    await expect(activity).toBeVisible();
    await expect(activity).toHaveAttribute("aria-expanded", "false");
    await activity.click();
    const recorded = page.locator('[aria-label="Recorded activity"]');
    await expect(recorded).toContainText("Thinking");
    await expect(recorded).toContainText("Writing");
    await activity.click();
    const copyIcon = await page
      .getByTitle("Copy response", { exact: true })
      .locator("svg")
      .boundingBox();
    const response = await page
      .locator('[data-streaming="false"]')
      .boundingBox();
    expect(copyIcon?.x).toBeCloseTo((response?.x ?? 0) + 2, 0);
    expect(
      copyIcon && response && copyIcon.y - (response.y + response.height),
    ).toBeLessThanOrEqual(14);
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByTitle("Copy response", { exact: true }).click();
    await expect(
      page.getByTitle("Copy response", { exact: true }),
    ).toHaveAttribute("data-copied", "true");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      row.output.answer,
    );
    await expect(page.getByText("$12.34", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`completed-${theme}.png`),
      animations: "disabled",
    });
    const completedBounds = await composer.boundingBox();
    expect(completedBounds?.y).toBeCloseTo(activeBounds?.y ?? 0, 0);
    await page.reload();
    await expect(activity).toBeVisible();
    await activity.click();
    await expect(recorded).toContainText("Thinking");
    await expect(recorded).toContainText("Writing");
    await expect(
      page.getByRole("heading", { name: "Matched seeds", exact: true }),
    ).toBeVisible();
  });
}

for (const malformed of ["invalid-json", "invalid-output"]) {
  test(`Agent recovers through polling after ${malformed} without resubmitting`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let submissions = 0;
    let streams = 0;
    let row = {
      id: "recover-answer",
      chat_id: "recover-chat",
      question: "Explain matched seeds",
      purpose: "general",
      status: "pending",
      cutoffs: {},
      study_id: null,
      run_id: null,
      created: "2026-11-07",
      error: null,
      output: { partial: "", answer: "", citations: [], caveats: [] },
    };
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          providers: { openai: true },
          planner_model: "openai:gpt-6.1-sol",
          assistant_model: "openai:gpt-6.1-sol",
        },
      }),
    );
    await page.route("**/api/chats", (route) => {
      if (route.request().method() !== "POST")
        return route.fulfill({ json: [] });
      submissions++;
      return route.fulfill({
        status: 202,
        json: { id: row.id, chat_id: row.chat_id },
      });
    });
    await page.route("**/api/chats/recover-chat", (route) =>
      route.fulfill({ json: [row] }),
    );
    await page.route("**/api/chats/recover-chat/events", (route) => {
      streams++;
      return route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${malformed === "invalid-json" ? "{" : JSON.stringify({ ...row, output: null })}\n\n`,
      });
    });
    await page.goto("/agent");
    await page.getByLabel("Message Agent", { exact: true }).fill(row.question);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect.poll(() => streams).toBe(1);
    row = {
      ...row,
      status: "complete",
      output: {
        ...row.output,
        answer: "Recovered through the saved response.",
      },
    };
    await expect(
      page.getByText("Recovered through the saved response."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send message", exact: true }),
    ).toBeDisabled();
    expect(submissions).toBe(1);
    expect(errors).toEqual([]);
  });
}

for (const theme of ["light", "dark"]) {
  test(`Agent presents each planning stage and a reviewable proposal · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = catalog.templates[0].design;
    const row = {
      id: "planning-answer",
      chat_id: "planning-chat",
      question: "Design a cooperation pilot",
      purpose: "general",
      status: "pending",
      cutoffs: {},
      study_id: null,
      run_id: null,
      output: {
        stage: "answering",
        partial: "I will prepare a protocol for review.",
        supported: true,
        design,
        explanation: "A controlled comparison with matched seeds.",
        planning: {
          brief: {
            operationalization:
              "Compare cooperation under two resource levels.",
            size_rationale:
              "Use matched seeds to compare the same starting conditions.",
          },
          sources: [
            { url: "https://example.org/methods", title: "Methods reference" },
          ],
        },
      },
    };
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize({
      width: theme === "dark" ? 390 : 1440,
      height: 900,
    });
    await page.route("**/api/chats", (route) =>
      route.fulfill({
        json: [
          {
            id: row.chat_id,
            title: row.question,
            updated: new Date().toISOString(),
            status: row.status,
          },
        ],
      }),
    );
    await page.route("**/api/chats/planning-chat", (route) =>
      route.fulfill({ json: [row] }),
    );
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/chats/planning-chat/events", async (route) => {
      await ready;
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify(row)}\n\n`,
      });
    });
    await page.goto("/agent?chat=planning-chat");
    await expect(
      page.getByText(row.output.partial, { exact: true }),
    ).toBeVisible();
    row.purpose = "design";
    row.output.stage = "scoping";
    row.output.partial = "";
    release();
    await expect(
      page.getByText("I will prepare a protocol for review.", { exact: true }),
    ).toHaveCount(0);
    for (const [stage, label] of [
      ["scoping", "Scoping the question"],
      ["researching", "Researching methods"],
      ["drafting", "Drafting the protocol"],
      ["reviewing", "Reviewing the design"],
      ["revising", "Refining the protocol"],
    ]) {
      row.output.stage = stage ?? "scoping";
      await expect(
        page.locator('[data-slot="trace-line"][role="status"]'),
      ).toHaveText(label ?? "");
    }
    await page.getByRole("button", { name: "Refining the protocol" }).click();
    await expect(
      page.getByText(row.output.planning.brief.operationalization),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Methods reference/ }),
    ).toHaveAttribute("href", "https://example.org/methods");
    await page.screenshot({
      path: testInfo.outputPath(`planning-${theme}.png`),
      animations: "disabled",
    });
    row.status = "complete";
    await expect(
      page.getByRole("combobox", { name: "Message context" }),
    ).toContainText("Add context");
    await expect(
      page.getByText("Protocol reviewed", { exact: true }),
    ).toBeVisible();
    const proposal = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole("heading", { name: design.title }) });
    await expect(
      proposal.getByRole("link", { name: "Review protocol" }),
    ).toHaveAttribute("href", `/new?plan=${row.id}`);
    await expect(proposal).toContainText("Ready for review. Nothing has run.");
    await expect(page.getByRole("link", { name: "JAS home" })).toHaveCount(
      theme === "dark" ? 0 : 1,
    );
    await expect(page.locator('main img[src="/logo.svg"]')).toHaveCount(0);
    const activity = page.getByRole("button", { name: "Protocol reviewed" });
    await expect(activity).toHaveAttribute("aria-expanded", "false");
    await activity.click();
    await expect(
      page.getByText(row.output.planning.brief.operationalization),
    ).toBeVisible();
    await activity.click();
    await page.screenshot({
      path: testInfo.outputPath(`proposal-${theme}.png`),
      animations: "disabled",
    });
  });
}

test("retrying a failed automatic proposal keeps the planner purpose", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
        providers: { openai: true },
        planner_model: "openai:gpt-6.1-sol",
        assistant_model: "openai:gpt-6.1-sol",
      },
    }),
  );
  const row = {
    id: "failed-plan",
    chat_id: "failed-plan-chat",
    purpose: "design",
    status: "failed",
    question: "Design a cooperation pilot",
    error: "Planner temporarily unavailable",
    study_id: null,
    run_id: null,
    cutoffs: {},
    output: { stage: "scoping" },
  };
  await page.route("**/api/chats/failed-plan-chat", (route) =>
    route.fulfill({ json: [row] }),
  );
  let submissions = 0;
  await page.route("**/api/chats", (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: [] });
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      question: row.question,
      context: "new",
      chat_id: row.chat_id,
    });
    submissions++;
    return route.fulfill({
      status: 503,
      json: { detail: "Planner temporarily unavailable" },
    });
  });
  await page.goto("/agent?chat=failed-plan-chat");
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toContainText("Add context");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("alert").last()).toContainText(
    "Your message is kept above",
  );
  expect(submissions).toBe(1);
});
