import { expect, test } from "@playwright/test";

test("Agent is one full page with an inner history rail and contextual composer", async ({
  page,
  request,
}) => {
  await page.goto("/studies");
  const sidebar = page.locator('[data-slot="sidebar"]').first();
  await expect(
    sidebar.getByRole("link", { name: "New experiment", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ask Agent", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Agent", exact: true }).click();
  await expect(page).toHaveTitle("JAS");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(
    sidebar.getByRole("complementary", { name: "Chat history" }),
  ).toHaveCount(0);
  await expect(
    page.locator("main").getByRole("complementary", { name: "Chat history" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Agent workspace" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "How do matched seeds help comparisons?",
      exact: true,
    })
    .click();
  const draft = page.getByLabel("Message Agent", { exact: true });
  await expect(draft).toHaveValue("How do matched seeds help comparisons?");
  await expect(draft).toBeFocused();
  await draft.focus();
  await expect(draft).toHaveCSS("outline-style", "none");
  await expect(page.locator('[data-slot="input-group"]')).toHaveCSS(
    "box-shadow",
    /0px 0px 0px 3px/,
  );
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
  await page.getByRole("link", { name: "Ask Agent", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/agent\\?context=run%3A${run.id}`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const context = page.getByRole("combobox", { name: "Message context" });
  await expect(context).toContainText(run.id.slice(0, 6));
  const input = page.getByRole("textbox", {
    name: "Message Agent",
    exact: true,
  });
  await input.fill("Compare the recorded strategies");
  await context.click();
  await page.getByRole("option", { name: "General", exact: true }).click();
  await expect(input).toHaveValue("Compare the recorded strategies");
  await page.reload();
  await expect(input).toHaveValue("Compare the recorded strategies");
  await expect(context).toContainText("General");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(input).toHaveValue("");
});

test("saved conversations resume after reload and new chats keep separate histories", async ({
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
  await page.goto("/agent");
  const input = page.getByLabel("Message Agent", { exact: true });
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
  expect(submitted[1]).toEqual({
    question: "How do repetitions help?",
    context: "general",
    chat_id: "saved-chat",
  });
  await page.reload();
  await expect(
    page.getByText("Each condition shares the same initial randomization."),
  ).toBeAttached();
  await expect(
    page
      .getByRole("navigation", { name: "Past chats" })
      .getByRole("link", { name: "What is a matched seed?" }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(
    page.getByText(
      "Repetitions create independent trials under the same seed.",
    ),
  ).toHaveCount(0);
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
    await page.goto(`/studies/${id}`);
    await page.getByRole("link", { name: "Ask Agent", exact: true }).click();
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
      .getByRole("option", {
        name: new RegExp(`Rev ${run.revision} .*${run.id.slice(0, 6)}`),
      })
      .click();
    await page
      .getByLabel("Message Agent", { exact: true })
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
    await context.click();
    await page.getByRole("option", { name: "General", exact: true }).click();
    await page
      .getByLabel("Message Agent", { exact: true })
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
    await expect(page.getByLabel("Message Agent", { exact: true })).toHaveValue(
      "An unsent follow-up",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (theme === "dark") {
      await page
        .getByRole("button", { name: "Conversations", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Agent conversations" })
        .getByRole("link", {
          name: "What changed after the first round?",
          exact: true,
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
    title: "Protocol from Agent conversation",
  };
  let message: object | undefined;
  let submitted: object | undefined;
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
      return route.fulfill({
        json: message
          ? [{ id: "proposal-chat", title: "Study cooperation" }]
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
  await page.goto("/agent?context=new");
  await page
    .getByLabel("Message Agent", { exact: true })
    .fill("Study cooperation");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("heading", { name: design.title })).toBeVisible();
  expect(submitted).toEqual({
    question: "Study cooperation",
    context: "new",
    chat_id: null,
  });
  await expect(page).toHaveURL(/agent\?chat=proposal-chat/);
  await page
    .getByRole("link", { name: "Review protocol", exact: true })
    .click();
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    design.title,
  );
  await expect(
    page.getByRole("button", { name: "Create experiment", exact: true }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Back to Agent", exact: true }).click();
  await expect(page).toHaveURL(/agent\?chat=proposal-chat/);
  await expect(page.getByRole("heading", { name: design.title })).toBeVisible();
});

test("submission errors keep the draft and missing providers disable sending", async ({
  page,
}) => {
  let available = true;
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
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
  await page.goto("/agent");
  const input = page.getByLabel("Message Agent", { exact: true });
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

test("large chat histories keep the conversation and composer within the viewport", async ({
  page,
}) => {
  await page.route("**/api/chats", (route) =>
    route.fulfill({
      json: Array.from({ length: 120 }, (_, index) => ({
        id: `chat-${index}`,
        title:
          "A long experiment question about competing incentives and the evidence needed to distinguish strategies",
        status: "complete",
      })),
    }),
  );
  await page.goto("/agent");
  await expect(
    page.getByRole("heading", { name: "What can we explore?" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Message Agent", { exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const history = page
    .getByRole("complementary", { name: "Chat history" })
    .locator('[data-slot="sidebar-content"]');
  expect(
    await history.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
});
