import { expect, test } from "@playwright/test";
import type { ExperimentPreflight } from "../src/lib/types.js";

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
    const expectFullWidthReply = async (streaming: boolean) => {
      await expect
        .poll(() =>
          page
            .locator(
              `[data-streaming="${streaming}"] [data-slot="bubble-content"] > div`,
            )
            .evaluate((text) => {
              const message = text.closest('[data-slot="message-content"]');
              if (!message) throw new Error("Missing reply container");
              const content = text.getBoundingClientRect();
              const available = message.getBoundingClientRect();
              return Math.max(
                Math.abs(content.left - available.left),
                Math.abs(available.right - content.right),
              );
            }),
        )
        .toBeLessThanOrEqual(2);
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
    await expect(page.locator("[data-slot=spinner]")).toHaveCount(0);
    const assistantTarget = page.getByLabel("Assistant", { exact: true });
    await expect(assistantTarget).toHaveAttribute(
      "data-agent-state",
      "working",
    );
    const playing = () =>
      assistantTarget.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      );
    await expect.poll(playing).toBeGreaterThan(0);
    await expect(assistantTarget.locator("[data-orbit]")).toHaveCount(2);
    await expect(
      assistantTarget.locator(":scope > circle:nth-child(3)"),
    ).toHaveCSS("fill-opacity", "1");
    const target = await page
      .getByLabel("Assistant", { exact: true })
      .boundingBox();
    const thinking = await page
      .getByRole("button", { name: "Thinking", exact: true })
      .boundingBox();
    expect(thinking && target && thinking.x > target.x + target.width).toBe(
      true,
    );
    expect(
      thinking &&
        target &&
        Math.abs(
          thinking.y + thinking.height / 2 - target.y - target.height / 2,
        ),
    ).toBeLessThanOrEqual(1);
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
    await expectFullWidthReply(true);
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
    await expect.poll(playing).toBe(0);
    row = {
      ...row,
      status: "complete",
      output: { ...row.output, partial: "", answer: row.output.partial },
    };
    await expect(page.locator('[data-streaming="true"]')).toHaveCount(0);
    await expectFullWidthReply(false);
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
    await expect(assistantTarget).toHaveAttribute("data-agent-state", "idle");
    await expect(assistantTarget.locator("[data-agent-orbits]")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    expect(await playing()).toBe(0);
    await expect(
      page.locator('[data-slot="message-header"] .lucide-check'),
    ).toHaveCount(0);
    await expect(activity).toHaveAttribute("aria-expanded", "false");
    await activity.click();
    const recorded = page.locator('[aria-label="Recorded activity"]');
    await expect(recorded).toContainText("Thinking");
    await expect(recorded).toContainText("Writing");
    await expect(recorded.locator("svg")).toHaveCount(0);
    await activity.click();
    // Read both boxes in one frame: closing Activity moves both elements, so
    // sequential boundingBox calls can manufacture a gap during the animation.
    await expect(async () => {
      const geometry = await page
        .getByTitle("Copy response", { exact: true })
        .evaluate((button) => {
          const icon = button.querySelector("svg");
          const response = button
            .closest('[data-slot="message"]')
            ?.querySelector('[data-streaming="false"]');
          if (!icon || !response)
            throw new Error("Missing response or copy icon");
          const iconBox = icon.getBoundingClientRect();
          const responseBox = response.getBoundingClientRect();
          return {
            left: iconBox.x - responseBox.x,
            gap: iconBox.y - responseBox.bottom,
          };
        });
      expect(geometry.left).toBeCloseTo(2, 0);
      expect(geometry.gap).toBeLessThanOrEqual(14);
    }).toPass();
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
    const checked = await request.post("/api/design/preflight", {
      data: { design },
    });
    expect(checked.ok()).toBe(true);
    const preflight: ExperimentPreflight = await checked.json();
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
        introduction: undefined as string | undefined,
        supported: true,
        design,
        explanation:
          "Supported: finite_stock maps directly. No preflight evidence was supplied.",
        summary:
          "Compare cooperation under two resource levels using matched seeds.",
        activity: ["answering"],
        planning: {
          preflight: null as ExperimentPreflight | null,
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
    // Keep the node being read mounted through the purpose handoff.
    const acknowledgement = await page
      .getByText(row.output.partial, { exact: true })
      .elementHandle();
    row.purpose = "design";
    row.output.stage = "scoping";
    row.output.activity.push("scoping");
    row.output.introduction = row.output.partial;
    row.output.partial = "";
    release();
    await expect(
      page.getByText("I will prepare a protocol for review.", { exact: true }),
    ).toBeVisible();
    for (const [stage, label] of [
      ["scoping", "Scoping the question"],
      ["researching", "Researching methods"],
      ["drafting", "Drafting the protocol"],
      ["checking", "Checking mechanics"],
      ["reviewing", "Reviewing the design"],
      ["revising", "Refining the protocol"],
    ]) {
      row.output.stage = stage ?? "scoping";
      row.output.activity.push(row.output.stage);
      if (stage === "reviewing") row.output.planning.preflight = preflight;
      await expect(
        page.locator('[data-slot="trace-line"][role="status"]'),
      ).toHaveText(label ?? "");
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(
        await acknowledgement?.evaluate((element) => element.isConnected),
      ).toBe(true);
    }
    await expect(
      page.getByRole("button", { name: "Refining the protocol", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await page
      .getByRole("button", { name: "Refining the protocol", exact: true })
      .click();
    const guide = page
      .locator(
        '[data-slot="message-header"] [data-slot="trace-collapsible-content-inner"]',
      )
      .first();
    await expect(guide).toBeVisible();
    const targetBounds = await page
      .getByLabel("Assistant", { exact: true })
      .boundingBox();
    const guideBounds = await guide.boundingBox();
    expect(
      targetBounds &&
        guideBounds &&
        Math.abs(guideBounds.x + 0.5 - targetBounds.x - targetBounds.width / 2),
    ).toBeLessThanOrEqual(1);
    await page
      .getByRole("button", { name: "Study scope", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Research sources", exact: true })
      .click();
    await expect(
      page.getByText(row.output.planning.brief.operationalization),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Methods reference/ }),
    ).toHaveAttribute("href", "https://example.org/methods");
    await page
      .getByRole("button", { name: "Mechanical checks", exact: true })
      .click();
    await expect(
      page.getByText(/scripted decisions · No model calls/),
    ).toBeVisible();
    await expect(
      page.getByText("No mechanical issues found", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator(
        '[data-slot="trace-collapsible-content"] [data-slot="alert"]',
      ),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`checks-${theme}.png`),
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Mechanical checks", exact: true })
      .click();
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
    await expect(page.locator('[data-streaming="false"]')).toHaveText([
      row.output.introduction,
      row.output.summary,
    ]);
    await expect(
      page.getByText(row.output.explanation, { exact: true }),
    ).toHaveCount(0);
    const summary = proposal.getByLabel("Protocol summary");
    await expect(summary.locator("dt")).toHaveText([
      "Agents",
      "Conditions",
      "Planned runs",
    ]);
    await expect(summary.locator("dd")).toHaveText([
      String(design.profiles.length),
      String(design.conditions.length),
      String(
        design.conditions.length * design.seeds.length * design.repetitions,
      ),
    ]);
    const cardBounds = await proposal.boundingBox();
    const itemBounds = await proposal
      .locator('xpath=ancestor::*[@data-slot="message-scroller-item"]')
      .boundingBox();
    // Stock Card draws its ring outside its box; leave it inside paint containment.
    expect(
      cardBounds &&
        itemBounds &&
        cardBounds.x + cardBounds.width + 1 <= itemBounds.x + itemBounds.width,
    ).toBe(true);
    await expect(page.getByRole("link", { name: "JAS home" })).toHaveCount(
      theme === "dark" ? 0 : 1,
    );
    await expect(page.locator('main img[src="/logo.svg"]')).toHaveCount(0);
    expect(
      await acknowledgement?.evaluate((element) => element.isConnected),
    ).toBe(true);
    const activity = page.getByRole("button", { name: "Protocol reviewed" });
    await expect(activity).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByText(row.output.planning.brief.operationalization),
    ).toBeVisible();
    await activity.click();
    await expect(activity).toHaveAttribute("aria-expanded", "false");
    await activity.click();
    await page
      .getByRole("button", { name: "Study scope", exact: true })
      .click();
    await expect(
      page.getByText(row.output.planning.brief.operationalization),
    ).toBeVisible();
    await activity.click();
    await page.screenshot({
      path: testInfo.outputPath(`proposal-${theme}.png`),
      animations: "disabled",
    });
    await page.reload();
    await expect(page.locator('[data-streaming="false"]')).toHaveText([
      row.output.introduction,
      row.output.summary,
    ]);
    await activity.click();
    await expect(activity).toHaveAttribute("aria-expanded", "true");
    // A stable child can still be clipped by its expanding ancestor.
    await expect
      .poll(() =>
        page
          .locator('[data-slot="trace-collapsible-content"]')
          .evaluateAll(
            (elements) =>
              elements
                .flatMap((element) => element.getAnimations())
                .filter((animation) => animation.playState === "running")
                .length,
          ),
      )
      .toBe(0);
    const draftNotes = page.getByRole("button", {
      name: "Draft notes (before checks)",
      exact: true,
    });
    await draftNotes.click();
    await expect(draftNotes).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByText(row.output.explanation, { exact: true }),
    ).toBeVisible();
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
