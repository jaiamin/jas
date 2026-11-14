import { expect, test } from "@playwright/test";
import { settings as settingsFixture } from "../src/test/fixtures.js";

for (const width of [320, 1440]) {
  test(`context selection keeps the composer anchored and clearable · ${width}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const title = `Cooperation across changing resource constraints and communication rules (${width}; repeat ${testInfo.repeatEachIndex})`;
    await request.post("/api/studies", {
      data: { design: { ...catalog.templates[0].design, title } },
    });
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/assistant");
    const context = page.getByRole("combobox", { name: "Message context" });
    const input = page.getByLabel("Message Assistant", { exact: true });
    await input.fill("Keep this unsent question");
    const composer = page
      .getByRole("form", { name: "Assistant composer" })
      .locator('[data-slot="input-group"]');
    await expect(
      page.getByRole("link", { name: "Configure a provider", exact: true }),
    ).toBeVisible();
    const initial = await composer.boundingBox();
    await context.click();
    const search = page.getByRole("combobox", {
      name: "Search context",
      exact: true,
    });
    await expect(search).toBeFocused();
    await search.fill("no-record-matches-this-query");
    await expect(
      page.getByText("No matching context.", { exact: true }),
    ).toBeVisible();
    await search.fill(title);
    await page.getByRole("option", { name: title, exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Suggested questions" }),
    ).toHaveCount(1);
    await expect(context).toContainText(title);
    await expect(
      page.getByRole("heading", { name: "What can we explore?", exact: true }),
    ).toBeVisible();
    expect(await composer.boundingBox()).toEqual(initial);
    await expect(context).toHaveCSS("border-width", "0px");
    const clear = page.getByRole("button", {
      name: "Clear context",
      exact: true,
    });
    await clear.hover();
    const group = page.getByRole("group", { name: "Message context controls" });
    const groupBox = await group.boundingBox();
    const clearBox = await clear.boundingBox();
    const triggerBox = await context.boundingBox();
    expect(
      groupBox &&
        clearBox &&
        groupBox.x + groupBox.width > clearBox.x + clearBox.width,
    ).toBe(true);
    expect(clearBox && triggerBox && clearBox.y + clearBox.height / 2).toBe(
      triggerBox && triggerBox.y + triggerBox.height / 2,
    );
    await expect(group).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page
      .getByRole("button", { name: "Clear context", exact: true })
      .click();
    await expect(context).toContainText("Add context");
    await expect(context).toBeFocused();
    await expect(input).toHaveValue("Keep this unsent question");
    expect(await composer.boundingBox()).toEqual(initial);
    await context.click();
    await search.fill(title);
    await search.press("Enter");
    await expect(context).toContainText(title);
    await context.click();
    await search.fill(title);
    const selectedOption = page.getByRole("option", {
      name: title,
      exact: true,
    });
    await expect(selectedOption).toHaveAttribute("data-checked", "true");
    await selectedOption.click();
    await expect(context).toContainText("Add context");
    await expect(input).toHaveValue("Keep this unsent question");
    await expect(
      page.getByRole("dialog", { name: "Choose context" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("Assistant welcome stays static on screen and after scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/assistant");
  const heading = page.getByRole("heading", { name: "What can we explore?" });
  const playing = () =>
    heading.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    );
  await expect(heading).toBeVisible();
  await expect.poll(playing).toBe(0);
  await page
    .getByRole("button", { name: "Learn the basics" })
    .scrollIntoViewIfNeeded();
  await expect(heading).not.toBeInViewport();
  await expect.poll(playing).toBe(0);
  await heading.scrollIntoViewIfNeeded();
  await expect.poll(playing).toBe(0);
  // The spec reserves motion for playback and the Home sky.
  await expect.poll(playing).toBe(0);
  await expect(heading.locator("svg")).not.toHaveAttribute("data-agent-motion");
  await page
    .getByRole("button", { name: "Learn the basics" })
    .scrollIntoViewIfNeeded();
  await expect(heading).not.toBeInViewport();
  await heading.scrollIntoViewIfNeeded();
  expect(await playing()).toBe(0);
  await expect(
    page.getByLabel("Message Assistant", { exact: true }),
  ).toBeEnabled();
});

test("Agent welcome stays static with reduced motion and does not replay a skipped entrance", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/assistant");
  const target = page
    .getByRole("heading", { name: "What can we explore?" })
    .locator("svg");
  await expect(target).toBeVisible();
  await expect(target).not.toHaveAttribute("data-agent-motion");
  expect(
    await target.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(target).not.toHaveAttribute("data-agent-motion");
  expect(
    await target.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
});

test("Agent centers a plain contextual composer without a history rail", async ({
  page,
  request,
}) => {
  await page.goto("/experiments");
  const sidebar = page.locator('[data-slot="sidebar"]').first();
  await expect(
    sidebar.getByRole("link", { name: "New experiment", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ask Assistant", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Assistant", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
  await expect(
    page.getByRole("button", { name: "New mechanics", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Investigate", exact: true }),
  ).toHaveCount(0);
  const defaultContext = page.getByRole("combobox", {
    name: "Message context",
  });
  await expect(defaultContext).toContainText("Add context");
  await defaultContext.click();
  await expect(
    page.getByRole("option", { name: "Ask anything", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "New experiment", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(
    sidebar.getByRole("complementary", { name: "Chat history" }),
  ).toHaveCount(0);
  await expect(
    page.locator("main").getByRole("complementary", { name: "Chat history" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Chat history", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "start from scratch" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("form", { name: "Assistant composer" })
      .locator('[data-slot="card"]'),
  ).toHaveCount(0);
  const headingBox = await page
    .getByRole("heading", { name: "What can we explore?" })
    .boundingBox();
  const composerBox = await page
    .getByRole("form", { name: "Assistant composer" })
    .boundingBox();
  const ideasBox = await page
    .getByRole("region", { name: "Suggested questions" })
    .boundingBox();
  expect(
    headingBox &&
      composerBox &&
      ideasBox &&
      headingBox.y + headingBox.height < composerBox.y &&
      composerBox.y + composerBox.height < ideasBox.y,
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Open Assistant workspace" }),
  ).toHaveCount(0);
  const inputGroup = page
    .getByRole("form", { name: "Assistant composer" })
    .locator('[data-slot="input-group"]');
  const restingStyle = await inputGroup.evaluate((element) => {
    const style = getComputedStyle(element);
    return { border: style.borderColor };
  });
  await page
    .getByRole("button", {
      name: "Learn the basics",
      exact: true,
    })
    .click();
  const draft = page.getByLabel("Message Assistant", { exact: true });
  await expect(draft).toHaveValue(/Explain how JAS experiments work/);
  await expect(draft).toBeFocused();
  await draft.focus();
  await expect(draft).toHaveCSS("outline-style", "none");
  await expect
    .poll(() =>
      inputGroup.evaluate((element) =>
        (getComputedStyle(element).boxShadow.match(/-?[\d.]+px/g) ?? []).every(
          (length) => Number.parseFloat(length) === 0,
        ),
      ),
    )
    .toBe(true);
  await expect(inputGroup).toHaveCSS("border-color", restingStyle.border);
  await expect(page.locator(".composer-note")).toHaveCount(0);
  const catalog = await (await request.get("/api/catalog")).json();
  const { id } = await (
    await request.post("/api/studies", {
      data: {
        design: {
          ...catalog.templates[0].design,
          title: "Context selection experiment",
        },
      },
    })
  ).json();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  const run = study.runs[0];
  await page.goto(`/runs/${run.id}`);
  await page.goto(`/assistant?context=run:${run.id}`);
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/assistant" &&
      url.searchParams.get("context") === `run:${run.id}`,
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const context = page.getByRole("combobox", { name: "Message context" });
  await expect(context).toContainText(run.id.slice(0, 6));
  const input = page.getByRole("textbox", {
    name: "Message Assistant",
    exact: true,
  });
  await input.fill("Compare the recorded strategies");
  await page
    .getByRole("button", { name: "Clear context", exact: true })
    .click();
  await expect(context).toBeFocused();
  await expect(page.getByRole("button", { name: "Clear context" })).toHaveCount(
    0,
  );
  await expect(input).toHaveValue("Compare the recorded strategies");
  await page.reload();
  await expect(input).toHaveValue("Compare the recorded strategies");
  await expect(context).toContainText("Add context");
  await context.click();
  await page
    .getByRole("option", { name: "Context selection experiment", exact: true })
    .click();
  await expect(context).toContainText("Context selection experiment");
  await expect(
    page.getByRole("heading", { name: "What can we explore?", exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("Compare the recorded strategies");
  await expect(
    page.getByRole("button", { name: "New chat", exact: true }),
  ).toHaveCount(0);
});

test("saved conversations resume after reload and new chats keep separate histories", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
        ...settingsFixture,
        providers: { openai: true },
        planner_model: "openai:gpt-6.1-sol",
        assistant_model: "openai:gpt-6.1-sol",
      },
    }),
  );
  const messages: object[] = [];
  const submitted: object[] = [];
  await page.route("**/api/chats", (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({
        json: messages.length
          ? [
              {
                id: "saved-chat",
                title: "What is a matched seed?",
                updated: new Date().toISOString(),
                status: "complete",
              },
            ]
          : [],
      });
    const body = route.request().postDataJSON();
    submitted.push(body);
    messages.push({
      id: `message-${messages.length}`,
      chat_id: "saved-chat",
      purpose: "general",
      question: body.question,
      study_id: null,
      run_id: null,
      status: "complete",
      output: {
        answer: messages.length
          ? "Repetitions create independent trials under the same seed."
          : "Each condition shares the same initial randomization.",
        citations: [],
        caveats: [],
      },
      cutoffs: {},
      usage: null,
    });
    return route.fulfill({
      status: 202,
      json: { id: `message-${messages.length - 1}`, chat_id: "saved-chat" },
    });
  });
  await page.route("**/api/chats/saved-chat", (route) =>
    route.fulfill({ json: messages }),
  );
  await page.goto("/assistant");
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toContainText("Add context");
  const input = page.getByLabel("Message Assistant", { exact: true });
  await input.fill("What is a matched seed?");
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("What is a matched seed?\n");
  await input.press("Enter");
  await expect(
    page.getByText("Each condition shares the same initial randomization."),
  ).toBeVisible();
  expect(submitted[0]).toEqual({
    question: "What is a matched seed?\n",
    context: "general",
    chat_id: null,
  });
  await expect(input).toHaveValue("");
  await input.fill("How do repetitions help?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText(
      "Repetitions create independent trials under the same seed.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What is a matched seed?", exact: true }),
  ).toBeVisible();
  expect(submitted[1]).toEqual({
    question: "How do repetitions help?",
    context: "general",
    chat_id: "saved-chat",
  });
  await page.reload();
  await expect(
    page.getByText("Each condition shares the same initial randomization."),
  ).toBeAttached();
  await page.getByRole("button", { name: "Chat history", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Past chats" })
      .getByRole("link", { name: "What is a matched seed?" }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "New chat", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Repetitions create independent trials under the same seed.",
    ),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Chat history", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Past chats" })
    .getByRole("link", { name: "What is a matched seed?" })
    .click();
  await expect(
    page.getByText(
      "Repetitions create independent trials under the same seed.",
    ),
  ).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`investigation preserves citations and retries the original scope · ${theme}`, async ({
    page,
    request,
  }) => {
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          ...settingsFixture,
          providers: { openai: true },
          planner_model: "openai:gpt-6.1-sol",
          assistant_model: "openai:gpt-6.1-sol",
        },
      }),
    );
    const catalog = await (await request.get("/api/catalog")).json();
    const { id } = await (
      await request.post("/api/studies", {
        data: {
          design: {
            ...catalog.templates[0].design,
            title: "Cooperation across changing resource constraints",
          },
        },
      })
    ).json();
    const study = await (await request.get(`/api/studies/${id}`)).json();
    const run = study.runs[0];
    let messages: object[] = [];
    let submitted: { question?: string; context?: string; chat_id?: string } =
      {};
    await page.route("**/api/chats", (route) => {
      if (route.request().method() !== "POST")
        return route.fulfill({
          json: messages.length
            ? [
                {
                  id: "evidence-chat",
                  title: "What changed after the first round?",
                  updated: new Date().toISOString(),
                },
              ]
            : [],
        });
      submitted = route.request().postDataJSON();
      messages = [
        {
          id: "qa-analysis",
          chat_id: "evidence-chat",
          purpose: "analysis",
          question: submitted.question,
          study_id: id,
          run_id: run.id,
          status: "pending",
          output: {
            stage: "reading",
            examined: [{ run_id: run.id, start: 1, end: 3, full_turn: false }],
          },
          cutoffs: { [run.id]: 3 },
        },
      ];
      return route.fulfill({
        status: 202,
        json: { id: "qa-analysis", chat_id: "evidence-chat" },
      });
    });
    await page.route("**/api/chats/evidence-chat", (route) =>
      route.fulfill({ json: messages }),
    );
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize(
      theme === "dark"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    );
    await page.goto(`/experiments/${id}`);
    await page.goto(`/assistant?context=study:${id}`);
    const context = page.getByRole("combobox", { name: "Message context" });
    await expect(context).toContainText(study.design.title);
    await context.click();
    await expect
      .poll(
        async () => (await page.getByRole("listbox").boundingBox())?.width ?? 0,
      )
      .toBeGreaterThanOrEqual(theme === "dark" ? 340 : 400);
    const menu = await page.getByRole("listbox").boundingBox();
    expect(menu?.x).toBeGreaterThanOrEqual(0);
    expect(menu?.width).toBeGreaterThanOrEqual(theme === "dark" ? 340 : 400);
    expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
    await page
      .getByRole("combobox", { name: "Search context", exact: true })
      .fill(`Seed ${run.seed}`);
    await expect(
      page.getByRole("option", { name: study.design.title, exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("option", {
        name: new RegExp(`Version ${run.revision} .*${run.id.slice(0, 6)}`),
      })
      .click();
    await page
      .getByLabel("Message Assistant", { exact: true })
      .fill("What changed after the first round?");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      page.getByText("Reading recorded turns", { exact: true }),
    ).toBeVisible();
    expect(submitted.context).toBe(`run:${run.id}`);
    await expect(
      page.getByRole("button", { name: "Send message" }),
    ).toBeDisabled();
    messages = [
      {
        ...messages[0],
        status: "complete",
        output: {
          answer: "The group contributed more.",
          citations: [{ run_id: run.id, turn: 3 }],
          examined: [{ run_id: run.id, start: 1, end: 3, full_turn: false }],
          caveats: ["One run is descriptive."],
        },
      },
    ];
    await expect(
      page.getByText("The group contributed more.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Turn 3", exact: true }),
    ).toHaveAttribute("href", `/runs/${run.id}?turn=3&tab=decisions`);
    await page.getByText("Limitations & uncertainty", { exact: true }).click();
    await expect(page.getByText("One run is descriptive.")).toBeVisible();
    await page
      .getByRole("button", { name: "Clear context", exact: true })
      .click();
    await page
      .getByLabel("Message Assistant", { exact: true })
      .fill("An unsent follow-up");
    messages = [
      { ...messages[0], status: "failed", error: "Provider request timed out" },
    ];
    await expect(page.getByRole("alert")).toContainText(
      "Provider request timed out",
    );
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByText("Reading recorded turns", { exact: true }),
    ).toBeVisible();
    expect(submitted.context).toBe(`run:${run.id}`);
    expect(submitted.question).toBe("What changed after the first round?");
    await expect(
      page.getByLabel("Message Assistant", { exact: true }),
    ).toHaveValue("An unsent follow-up");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (theme === "dark") {
      await page
        .getByRole("button", { name: "Chat history", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Recent chats" })
        .getByRole("link", {
          name: /What changed after the first round/,
        })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });
}

test("creation stays in chat and hands a reviewed protocol to the editor", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = {
    ...catalog.templates[0].design,
    title: "Protocol from Assistant conversation",
  };
  let message: object | undefined;
  let submitted: object | undefined;
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
        ...settingsFixture,
        providers: { openai: true },
        planner_model: "openai:gpt-6.1-sol",
        assistant_model: "openai:gpt-6.1-sol",
      },
    }),
  );
  await page.route("**/api/chats", (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({
        json: message
          ? [
              {
                id: "proposal-chat",
                title: "Study cooperation",
                updated: new Date().toISOString(),
              },
            ]
          : [],
      });
    submitted = route.request().postDataJSON();
    message = {
      id: "proposal-answer",
      chat_id: "proposal-chat",
      question: "Study cooperation",
      purpose: "design",
      status: "complete",
      study_id: null,
      run_id: null,
      cutoffs: {},
      output: {
        supported: true,
        explanation: "A compact pilot with matched seeds.",
        design,
      },
    };
    return route.fulfill({
      status: 202,
      json: { id: "proposal-answer", chat_id: "proposal-chat" },
    });
  });
  await page.route("**/api/chats/proposal-chat", (route) =>
    route.fulfill({ json: [message] }),
  );
  await page.route("**/api/analyses/proposal-answer", (route) =>
    route.fulfill({ json: message }),
  );
  await page.goto("/assistant");
  await page
    .getByLabel("Message Assistant", { exact: true })
    .fill("Study cooperation");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("heading", { name: design.title })).toBeVisible();
  expect(submitted).toEqual({
    question: "Study cooperation",
    context: "general",
    chat_id: null,
  });
  await expect(page).toHaveURL(/assistant\?chat=proposal-chat/);
  await page
    .getByRole("link", { name: "Review protocol", exact: true })
    .click();
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue(
    design.question,
  );
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("link", { name: "Back to Assistant", exact: true })
    .click();
  await expect(page).toHaveURL(/assistant\?chat=proposal-chat/);
  await expect(page.getByRole("heading", { name: design.title })).toBeVisible();
});

test("submission errors keep the draft and missing providers disable sending", async ({
  page,
}) => {
  let available = true;
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
        ...settingsFixture,
        providers: { openai: available },
        planner_model: "openai:gpt-6.1-sol",
        assistant_model: "openai:gpt-6.1-sol",
      },
    }),
  );
  await page.route("**/api/chats", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 409, json: { detail: "Provider unavailable" } })
      : route.fulfill({ json: [] }),
  );
  await page.goto("/assistant");
  const input = page.getByLabel("Message Assistant", { exact: true });
  await input.fill("Keep this question after an error");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Provider unavailable");
  await expect(input).toHaveValue("Keep this question after an error");
  available = false;
  await page.reload();
  await expect(input).toHaveValue("Keep this question after an error");
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Configure a provider" }),
  ).toBeVisible();
});

for (const width of [320, 1440]) {
  test(`large chat histories stay inside the popup · ${width}`, async ({
    page,
  }) => {
    await page.route("**/api/chats", (route) =>
      route.fulfill({
        json: Array.from({ length: 120 }, (_, index) => ({
          id: `chat-${index}`,
          updated: new Date().toISOString(),
          title:
            "A long experiment question about competing incentives and the evidence needed to distinguish strategies",
          status: "complete",
        })),
      }),
    );
    await page.setViewportSize({ width, height: 600 });
    await page.goto("/assistant");
    await expect(
      page.getByRole("heading", { name: "What can we explore?" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Message Assistant", { exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Chat history", exact: true })
      .click();
    const popup = page.getByRole("dialog", { name: "Recent chats" });
    const history = popup.locator('[data-slot="scroll-area-viewport"]');
    await expect(popup.getByRole("link")).toHaveCount(120);
    expect(
      await popup
        .getByRole("link")
        .first()
        .evaluate((element) => element.getBoundingClientRect().width <= 320),
    ).toBe(true);
    expect(
      await popup
        .getByRole("link")
        .first()
        .locator(":scope > span")
        .evaluate((element) => element.scrollWidth > element.clientWidth),
    ).toBe(true);
    const popupBox = await popup.boundingBox();
    expect(
      popupBox &&
        popupBox.y >= 0 &&
        popupBox.y + popupBox.height <= (page.viewportSize()?.height ?? 0),
    ).toBe(true);
    expect(
      await history.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await history.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(popup.getByRole("link").last()).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Chat history", exact: true }),
    ).toBeFocused();
  });
}

test("history loads inside its popup while the new-chat composer stays editable", async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let historyRequests = 0;
  await page.route("**/api/chats", async (route) => {
    historyRequests++;
    await ready;
    await route.fulfill({ json: [] });
  });
  await page.goto("/assistant");
  const input = page.getByLabel("Message Assistant", { exact: true });
  await expect(input).toBeVisible();
  expect(historyRequests).toBe(0);
  const trigger = page.getByRole("button", {
    name: "Chat history",
    exact: true,
  });
  await trigger.click();
  const popup = page.getByRole("dialog", { name: "Recent chats" });
  await expect(
    popup.getByRole("status", { name: "Loading chats" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Loading conversation" }),
  ).toHaveCount(0);
  await expect(input).toBeEnabled();
  await page.keyboard.press("Escape");
  await input.fill("My unfinished question");
  await trigger.click();
  release();
  await expect(popup.getByText("No chats yet", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("My unfinished question");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("base Agent renders immediately and only context options wait for the database", async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  for (const path of ["studies", "runs"]) {
    await page.route(`**/api/${path}`, async (route) => {
      await ready;
      await route.fulfill({ json: [] });
    });
  }
  await page.goto("/assistant");
  await expect(
    page.getByRole("heading", { name: "What can we explore?" }),
  ).toBeVisible();
  const input = page.getByLabel("Message Assistant", { exact: true });
  await expect(
    page
      .getByRole("region", { name: "Suggested questions" })
      .getByRole("button"),
  ).toHaveCount(4);
  await input.fill("A question before records finish loading");
  await expect(
    page.getByRole("region", { name: "Suggested questions" }),
  ).toHaveCount(1);
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  await page.getByRole("combobox", { name: "Message context" }).click();
  await expect(
    page.getByRole("status", { name: "Loading experiments and runs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Search context", exact: true }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("status", { name: "Loading experiments and runs" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("No saved experiments or runs.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("A question before records finish loading");
});

test("saved transcript loading keeps history and New available without showing a fake conversation", async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chats/loading-chat", async (route) => {
    await ready;
    await route.fulfill({ json: [] });
  });
  await page.goto("/assistant?chat=loading-chat");
  await expect(
    page.getByRole("status", { name: "Loading conversation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chat history", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Assistant composer" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  release();
  await expect(
    page.getByRole("heading", { name: "What can we explore?" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Message Assistant", { exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("status", { name: "Loading conversation" }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/assistant\?new=/);
});

for (const width of [320, 1440]) {
  test(`long conversation titles indicate truncation and keep the full question available · ${width}`, async ({
    page,
  }) => {
    const question =
      "Explain how matched random seeds and repeated trials help compare cooperation across different resource levels, communication rules and agent memory settings.";
    await page.setViewportSize({ width, height: 800 });
    await page.route("**/api/chats/long-title", (route) =>
      route.fulfill({
        json: [
          {
            id: "long-answer",
            chat_id: "long-title",
            question,
            purpose: "general",
            status: "complete",
            cutoffs: {},
            study_id: null,
            run_id: null,
            output: {
              answer: "Use matched conditions.",
              activity: ["answering", "writing"],
            },
          },
        ],
      }),
    );
    await page.goto("/assistant?chat=long-title");
    const title = page.locator("main header h1");
    await expect(title).toHaveText(
      `${Array.from(question).slice(0, 79).join("").trimEnd()}…`,
    );
    await expect(title).toHaveAttribute("title", question);
    await expect(title).toHaveCSS("text-overflow", "ellipsis");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}

test("last reply clears the composer and its copy hover stays inside the message", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const settings = await request.get("/api/settings");
  let revealSettings = () => {};
  const settingsReady = new Promise<void>((resolve) => {
    revealSettings = resolve;
  });
  await page.route("**/api/settings", async (route) => {
    await settingsReady;
    await route.fulfill({ response: settings });
  });
  await page.route("**/api/chats/long-response", (route) =>
    route.fulfill({
      json: [
        {
          id: "long-response",
          chat_id: "long-response",
          question: "Explain this experiment",
          purpose: "general",
          status: "complete",
          cutoffs: {},
          study_id: null,
          run_id: null,
          output: {
            answer: Array.from(
              { length: 24 },
              (_, index) =>
                `Paragraph ${index + 1}: compare matched conditions using the recorded evidence.`,
            ).join("\n\n"),
            activity: ["answering", "writing"],
          },
        },
      ],
    }),
  );
  const viewport = page.getByRole("region", { name: "Assistant conversation" });
  let initialHeight = 0;
  try {
    await page.goto("/assistant?chat=long-response");
    initialHeight = await viewport.evaluate((node) => node.clientHeight);
    await expect(
      viewport.getByText("Explain this experiment", { exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page
      .getByRole("button", { name: "Scroll to end", exact: true })
      .click();
    await expect
      .poll(() =>
        viewport.evaluate(
          (node) => node.scrollHeight - node.scrollTop - node.clientHeight,
        ),
      )
      .toBeLessThanOrEqual(1);
  } finally {
    revealSettings();
  }
  await expect(
    page.getByRole("link", { name: "Configure a provider", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => viewport.evaluate((node) => node.clientHeight))
    .toBeLessThan(initialHeight);
  const copy = page.getByTitle("Copy response", { exact: true });
  await expect(copy).toBeInViewport();
  await copy.hover();
  const button = await copy.boundingBox();
  const item = await copy
    .locator('xpath=ancestor::*[@data-slot="message-scroller-item"]')
    .boundingBox();
  expect(button && item && button.x >= item.x).toBe(true);
  const footer = await copy
    .locator('xpath=ancestor::*[@data-slot="message-footer"]')
    .boundingBox();
  const input = await page
    .getByRole("form", { name: "Assistant composer" })
    .locator('[data-slot="input-group"]')
    .boundingBox();
  expect(
    input && footer && input.y - footer.y - footer.height,
  ).toBeGreaterThanOrEqual(24);
  await viewport.hover();
  await page.mouse.wheel(0, -400);
  await expect
    .poll(() =>
      viewport.evaluate(
        (node) => node.scrollHeight - node.scrollTop - node.clientHeight,
      ),
    )
    .toBeGreaterThan(200);
  await page
    .getByRole("textbox", { name: "Message Assistant", exact: true })
    .fill(
      Array.from({ length: 12 }, (_, index) => `Unsent line ${index + 1}`).join(
        "\n",
      ),
    );
  await expect
    .poll(() =>
      viewport.evaluate(
        (node) => node.scrollHeight - node.scrollTop - node.clientHeight,
      ),
    )
    .toBeGreaterThan(200);
});
