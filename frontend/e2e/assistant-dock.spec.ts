import { expect, test } from "@playwright/test";
import { settings as settingsFixture } from "../src/test/fixtures.js";
import { createStudy } from "./helpers.js";

const settings = { ...settingsFixture, providers: { openai: true } };
const reply = (chatId: string, question = "An earlier question") => [
  {
    id: `${chatId}-answer`,
    chat_id: chatId,
    question,
    purpose: "general",
    status: "complete",
    study_id: null,
    run_id: null,
    cutoffs: {},
    output: { answer: "A recorded answer", citations: [], caveats: [] },
  },
];

for (const width of [390, 1440])
  for (const theme of ["light", "dark"]) {
    test(`Assistant pane keeps page, history and drafts together · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("jas-theme", theme),
        theme,
      );
      await page.route("**/api/settings", (route) =>
        route.fulfill({ json: settings }),
      );
      let sends = 0;
      page.on("request", (request) => {
        if (request.method() === "POST" && request.url().endsWith("/api/chats"))
          sends++;
      });
      await page.route("**/api/chats", (route) =>
        route.fulfill({
          json: [
            {
              id: "history-chat",
              title: "An earlier question",
              updated: new Date().toISOString(),
              status: "complete",
            },
          ],
        }),
      );
      await page.route("**/api/chats/history-chat", (route) =>
        route.fulfill({ json: reply("history-chat") }),
      );
      await page.goto("/");
      await expect(
        page.getByRole("region", { name: "Get started" }),
      ).toHaveCount(0);
      const ideas = page.getByRole("region", { name: "Experiment ideas" });
      await expect(ideas.getByRole("button")).toHaveCount(4);
      for (const [index, topic] of [
        /shared-commons/,
        /trust-exchange/,
        /artifact-investigation/,
        /institutional-workflow/,
      ].entries()) {
        await ideas.getByRole("button").nth(index).click();
        await expect(
          page.getByLabel("Message Assistant", { exact: true }),
        ).toHaveValue(topic);
      }
      await expect(
        page.getByRole("button", { name: "Assistant", exact: true }),
      ).toHaveCount(0);
      await page.goto("/settings");
      const toggle = page.locator(
        'button[aria-controls="workspace-assistant"]',
      );
      await expect(toggle).toHaveCSS("padding-left", "10px");
      await expect(toggle).toHaveCSS("padding-right", "10px");
      const centers = await page
        .locator(
          '[data-slot="workspace-header"] button, [data-slot="workspace-header"] a',
        )
        .evaluateAll((controls) =>
          controls.map((control) => {
            const box = control.getBoundingClientRect();
            return box.y + box.height / 2;
          }),
        );
      expect(new Set(centers).size).toBe(1);
      const contents = await toggle.locator("svg, span").evaluateAll((items) =>
        items.map((item) => {
          const box = item.getBoundingClientRect();
          return box.y + box.height / 2;
        }),
      );
      expect(new Set(contents).size).toBe(1);
      await toggle.click();
      const pane = page.getByRole("complementary", {
        name: "Assistant",
        exact: true,
      });
      await expect(pane).toBeVisible();
      await expect(
        pane.getByRole("button", { name: /chat history/i }),
      ).toHaveText("New chat");
      await expect(pane.locator("header").getByRole("button")).toHaveCount(3);
      await expect(pane.locator("header").getByRole("link")).toHaveCount(1);
      await expect(
        pane
          .getByRole("heading", { name: "What can we explore?" })
          .locator("svg.lucide-target"),
      ).toBeVisible();
      for (const suggestion of await pane
        .getByRole("region", { name: "Suggested questions" })
        .getByRole("button")
        .all()) {
        await expect(suggestion).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)",
        );
        await expect(suggestion).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
      }
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const box = await pane.boundingBox();
      expect(box?.y).toBe(0);
      expect(box?.width).toBe(width === 390 ? 390 : 440);
      const content = page.locator('[data-slot="workspace-content"]');
      if (width === 1440)
        expect((await content.boundingBox())?.width).toBe(1440 - 240 - 440);
      else {
        await expect(content).toHaveCSS("width", "0px");
        await expect(content.locator("..")).toHaveAttribute("inert");
      }
      await expect(
        pane.getByRole("combobox", { name: "Message context" }),
      ).toContainText("Add context");
      await expect(
        pane.getByRole("button", { name: "Clear context" }),
      ).toHaveCount(0);
      const input = pane.getByLabel("Message Assistant", { exact: true });
      await expect(input).toHaveCSS("padding-top", "12px");
      const alignment = await pane.evaluate((element) => {
        const textarea = element.querySelector("textarea");
        const suggestion = element.querySelector(
          '[aria-label="Suggested questions"] svg',
        );
        if (!textarea || !suggestion)
          throw new Error("Missing composer/suggestions");
        const header = element.querySelector("header");
        return {
          input:
            textarea.getBoundingClientRect().x +
            Number.parseFloat(getComputedStyle(textarea).paddingLeft),
          suggestion: suggestion.getBoundingClientRect().x,
          welcome: element.querySelector("h2 svg")?.getBoundingClientRect().x,
          controls: [...(header?.querySelectorAll("button, a") ?? [])].map(
            (control) => {
              const box = control.getBoundingClientRect();
              return { center: box.y + box.height / 2, height: box.height };
            },
          ),
          icons: [...(header?.querySelectorAll("svg") ?? [])].map(
            (icon) => icon.getBoundingClientRect().width,
          ),
        };
      });
      expect(alignment.input).toBe(alignment.suggestion);
      expect(alignment.welcome).toBe(alignment.suggestion);
      expect(
        new Set(alignment.controls.map((control) => control.center)).size,
      ).toBe(1);
      expect(alignment.controls.every((control) => control.height === 28)).toBe(
        true,
      );
      expect(alignment.icons.every((size) => size === 16)).toBe(true);
      await expect(pane.locator("header .lucide-maximize")).toBeVisible();
      const expandBox = await pane
        .getByRole("link", { name: "Open in Assistant" })
        .boundingBox();
      const newBox = await pane
        .getByRole("button", { name: "New chat", exact: true })
        .boundingBox();
      expect(
        (newBox?.x ?? 0) - (expandBox?.x ?? 0) - (expandBox?.width ?? 0),
      ).toBe(2);
      await pane.getByRole("button", { name: "Learn the basics" }).click();
      await expect(input).toHaveValue(/Explain how JAS experiments work/);
      await input.fill("Keep this draft beside Settings");
      const composer = await pane
        .getByRole("form", { name: "Assistant composer" })
        .boundingBox();
      expect((composer?.y ?? 0) + (composer?.height ?? 0)).toBe(900);
      await page.screenshot({
        path: testInfo.outputPath(`assistant-${theme}-${width}.png`),
      });
      await pane.getByRole("button", { name: "Close Assistant" }).click();
      await expect(toggle).toBeFocused();
      await expect(pane).toBeHidden();
      await toggle.click();
      await expect(input).toHaveValue("Keep this draft beside Settings");
      await pane.getByRole("link", { name: "Open in Assistant" }).click();
      await expect(page).toHaveURL(/\/assistant\?new=/);
      await expect(
        page.getByRole("button", { name: "Assistant", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByLabel("Message Assistant", { exact: true }),
      ).toHaveValue("Keep this draft beside Settings");
      await page
        .getByLabel("Message Assistant", { exact: true })
        .fill("Edited in focused view");
      await page.goBack();
      await expect(pane).toBeHidden();
      await toggle.click();
      await expect(input).toHaveValue("Edited in focused view");
      await pane.getByRole("button", { name: /chat history/i }).click();
      await page.getByRole("link", { name: /An earlier question/ }).click();
      await expect(page).toHaveURL(/\/settings$/);
      await expect(
        pane.getByText("A recorded answer", { exact: true }),
      ).toBeVisible();
      await expect(
        pane.getByRole("button", { name: /chat history/i }),
      ).toHaveText("An earlier question");
      await expect(
        pane
          .getByRole("button", { name: /chat history/i })
          .locator('svg[data-icon="inline-start"]'),
      ).toBeVisible();
      await expect(
        pane.getByRole("heading", { name: "An earlier question" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("dialog", { name: "Recent chats" }),
      ).toHaveCount(0);
      await input.focus();
      await input.press("Escape");
      await expect(pane).toBeHidden();
      await expect(toggle).toBeFocused();
      expect(sends).toBe(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }

test("pane sends only the displayed record scope and lets users remove it", async ({
  page,
  request,
}) => {
  const { study, run } = await createStudy(request);
  await request.post(`/api/studies/${study.id}/revisions`, {
    data: { design: { ...study.design, title: "Newer revision" } },
  });
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/chats", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: [] });
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 202,
      json: { id: "scope-answer", chat_id: "scope-chat" },
    });
  });
  await page.route("**/api/chats/scope-chat", (route) =>
    route.fulfill({ json: reply("scope-chat") }),
  );
  await page.goto(`/experiments/${study.id}?revision=1&tab=runs`);
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  const pane = page.getByRole("complementary", {
    name: "Assistant",
    exact: true,
  });
  await expect(pane).toContainText(`${study.design.title} · v1`);
  await pane
    .getByLabel("Message Assistant", { exact: true })
    .fill("Review the displayed revision");
  await pane.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({
    context: `study:${study.id}`,
    revision: 1,
  });
  await expect(page).toHaveURL(
    new RegExp(`/experiments/${study.id}\\?revision=1&tab=runs$`),
  );
  await pane.getByRole("button", { name: "Clear context" }).click();
  await pane
    .getByLabel("Message Assistant", { exact: true })
    .fill("A general follow-up");
  await pane.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1].context).toBe("general");
  expect(bodies[1]).not.toHaveProperty("revision");
  await page.reload();
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await expect(pane.getByRole("button", { name: "Clear context" })).toHaveCount(
    0,
  );
  await pane.getByRole("combobox", { name: "Message context" }).click();
  await page
    .getByRole("option", { name: "Newer revision", exact: true })
    .click();
  await expect(
    pane.getByRole("button", { name: "Clear context" }),
  ).toBeVisible();
  await page.goto(`/runs/${run.summary.id}?turn=0`);
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await expect(pane).toContainText("v1 · turn 0");
  await pane
    .getByLabel("Message Assistant", { exact: true })
    .fill("Inspect only this cutoff");
  await pane.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => bodies.length).toBe(3);
  expect(bodies[2]).toMatchObject({
    context: `run:${run.summary.id}`,
    revision: 1,
    through_turn: 0,
  });
  for (const path of ["/experiments", "/runs", "/gallery", "/settings"]) {
    await page.goto(path);
    await page.getByRole("button", { name: "Assistant", exact: true }).click();
    await expect(
      pane.getByRole("button", { name: "Clear context" }),
    ).toHaveCount(0);
    await expect(
      pane.getByRole("combobox", { name: "Message context" }),
    ).toContainText("Add context");
  }
  await pane.getByRole("combobox", { name: "Message context" }).click();
  await page
    .getByRole("option", { name: "Newer revision", exact: true })
    .click();
  await pane
    .getByLabel("Message Assistant", { exact: true })
    .fill("Review this manually selected experiment");
  await pane.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => bodies.length).toBe(4);
  expect(bodies[3]).toMatchObject({
    context: `study:${study.id}`,
    revision: 2,
  });
  await expect(page).toHaveURL(/\/settings$/);
  expect(
    (await (await request.get("/api/settings")).json()).usage.requests,
  ).toBe(0);
});

test("Gallery combines browsing and publishing without a Community group", async ({
  page,
}) => {
  await page.route("**/api/community?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/community/mine", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/gallery?world=commons");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link")).toHaveText([
    "Home",
    "Gallery",
    "Experiments",
    "Runs",
    "Environments",
  ]);
  await expect(nav.getByText("Community", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "My published" }).click();
  await expect(page).toHaveURL(/world=commons&view=mine/);
  await expect(
    page.getByText("No publications yet", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Browse", exact: true }).click();
  await expect(page.getByLabel("World", { exact: true })).toHaveValue(
    "commons",
  );
});

test("usage text does not reflow during sidebar expansion", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/experiments");
  const budget = page
    .locator('[data-slot="sidebar-footer"]')
    .getByRole("link", { name: /^Usage:/, includeHidden: true });
  await expect(budget).toBeVisible();
  const before = await budget.boundingBox();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(budget).toBeHidden();
  const frames = await page.evaluate(async () => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Expand sidebar"]')
      ?.click();
    const frames: { width: number; height: number; rowHeight: number }[] = [];
    const start = performance.now();
    while (performance.now() - start < 300) {
      await new Promise(requestAnimationFrame);
      const usage = document.querySelector<HTMLElement>(
        '[data-slot="sidebar-footer"] a[aria-label^="Usage:"]',
      );
      if (usage && getComputedStyle(usage).display !== "none") {
        const box = usage.getBoundingClientRect();
        frames.push({
          width: box.width,
          height: box.height,
          rowHeight:
            usage.firstElementChild?.getBoundingClientRect().height ?? 0,
        });
      }
    }
    return frames;
  });
  expect(frames.length).toBeGreaterThan(3);
  expect(
    frames.every(
      (frame) =>
        frame.width === before?.width && frame.height === before?.height,
    ),
  ).toBe(true);
  expect(new Set(frames.map((frame) => frame.rowHeight)).size).toBe(1);
});

test("focusing a pending pane reconnects the accepted chat without resubmitting", async ({
  page,
  request,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let sends = 0;
  await page.route("**/api/chats", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: [] });
    sends++;
    await pending;
    await route.fulfill({
      status: 202,
      json: { id: "focus-answer", chat_id: "focus-chat" },
    });
  });
  await page.route("**/api/chats/focus-chat", (route) =>
    route.fulfill({ json: reply("focus-chat", "Keep the accepted question") }),
  );
  await page.goto("/experiments");
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  const pane = page.getByRole("complementary", {
    name: "Assistant",
    exact: true,
  });
  await pane
    .getByLabel("Message Assistant", { exact: true })
    .fill("Keep the accepted question");
  await pane.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => sends).toBe(1);
  await pane.getByRole("link", { name: "Open in Assistant" }).click();
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  finish();
  await expect(page).toHaveURL(/chat=focus-chat/);
  await expect(
    page.getByText("A recorded answer", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(pane).toBeHidden();
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await expect(
    pane.getByText("A recorded answer", { exact: true }),
  ).toBeVisible();
  expect(sends).toBe(1);
  expect(
    (await (await request.get("/api/settings")).json()).usage.requests,
  ).toBe(0);
});

test("late pane responses cannot replace a new chat and its reloadable draft", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let sends = 0;
  await page.route("**/api/chats", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: [] });
    sends++;
    await pending;
    await route.fulfill({
      status: 202,
      json: { id: "late-answer", chat_id: "late-pane-chat" },
    });
  });
  await page.goto("/experiments");
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  const pane = page.getByRole("complementary", {
    name: "Assistant",
    exact: true,
  });
  const input = pane.getByLabel("Message Assistant", { exact: true });
  await input.fill("The original question");
  await pane.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => sends).toBe(1);
  await pane.getByRole("button", { name: "New chat", exact: true }).click();
  await input.fill("Preserve this newer draft");
  finish();
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("jas:agent-draft:panel:general"),
      ),
    )
    .toBeNull();
  await expect(input).toHaveValue("Preserve this newer draft");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("jas:assistant-panel:general"),
    ),
  ).toBeNull();
  await page.reload();
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await expect(input).toHaveValue("Preserve this newer draft");
  expect(sends).toBe(1);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`Assistant matches navigation motion and preserves its width · ${reducedMotion}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/experiments");
    const toggle = page.getByRole("button", { name: "Assistant", exact: true });
    const dock = page.locator(".workspace-assistant-dock");
    const left = page.locator('[data-slot="sidebar-gap"]');
    const motion = await left.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        duration: style.transitionDuration,
        easing: style.transitionTimingFunction,
      };
    });
    await expect(dock).toHaveCSS(
      "transition-duration",
      reducedMotion === "reduce" ? "0s" : `${motion.duration}, 0s`,
    );
    if (reducedMotion !== "reduce")
      await expect(dock).toHaveCSS(
        "transition-timing-function",
        `${motion.easing}, linear`,
      );
    const opening = await toggle.evaluate(
      (button) =>
        new Promise<number[]>((resolve) => {
          const dock = document.querySelector(".workspace-assistant-dock");
          const start = performance.now();
          const widths: number[] = [];
          (button as HTMLButtonElement).click();
          function sample() {
            widths.push(dock?.getBoundingClientRect().width ?? -1);
            if (performance.now() - start < 300) requestAnimationFrame(sample);
            else resolve(widths);
          }
          requestAnimationFrame(sample);
        }),
    );
    expect(opening.at(-1)).toBe(440);
    if (reducedMotion === "reduce")
      expect(opening.every((width) => width === 440)).toBe(true);
    else expect(opening.some((width) => width > 0 && width < 440)).toBe(true);
    const pane = page.getByRole("complementary", {
      name: "Assistant",
      exact: true,
    });
    const input = pane.getByLabel("Message Assistant", { exact: true });
    await input.fill("Keep this draft through both directions");
    const closing = await pane
      .getByRole("button", { name: "Close Assistant" })
      .evaluate(
        (button) =>
          new Promise<number[]>((resolve) => {
            const dock = document.querySelector(".workspace-assistant-dock");
            const start = performance.now();
            const widths: number[] = [];
            (button as HTMLButtonElement).click();
            function sample() {
              widths.push(dock?.getBoundingClientRect().width ?? -1);
              if (performance.now() - start < 300)
                requestAnimationFrame(sample);
              else resolve(widths);
            }
            requestAnimationFrame(sample);
          }),
      );
    expect(closing.at(-1)).toBe(0);
    if (reducedMotion === "reduce")
      expect(closing.every((width) => width === 0)).toBe(true);
    else expect(closing.some((width) => width > 0 && width < 440)).toBe(true);
    await expect(pane).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await expect(input).toHaveValue("Keep this draft through both directions");
  });
}

for (const surface of ["pane", "focused"]) {
  test(`history deletion is confirmed and recoverable · ${surface}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === "pane" ? 390 : 1440,
      height: 900,
    });
    const title =
      "A long experiment question about competing incentives and the evidence needed to distinguish strategies";
    let deleted = false;
    let attempts = 0;
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.addInitScript(() => {
      localStorage.setItem("jas:assistant-panel:general", "remove-chat");
      localStorage.setItem(
        "jas:assistant-panel:study:remembered:1",
        "remove-chat",
      );
      localStorage.setItem(
        "jas:assistant-panel:study:unrelated:1",
        "keep-chat",
      );
    });
    await page.route("**/api/chats", (route) =>
      route.fulfill({
        json: [
          ...(!deleted
            ? [
                {
                  id: "remove-chat",
                  title,
                  updated: new Date().toISOString(),
                  status: "complete",
                },
              ]
            : []),
          {
            id: "pending-chat",
            title: "Still working",
            updated: new Date().toISOString(),
            status: "pending",
          },
        ],
      }),
    );
    await page.route("**/api/chats/remove-chat", async (route) => {
      if (route.request().method() !== "DELETE")
        return route.fulfill({ json: reply("remove-chat", title) });
      attempts++;
      if (attempts === 1)
        return route.fulfill({
          status: 422,
          json: { detail: "Wait for requests to settle." },
        });
      await ready;
      deleted = true;
      return route.fulfill({ json: { deleted: "remove-chat" } });
    });
    await page.goto(
      surface === "pane" ? "/settings" : "/assistant?chat=remove-chat",
    );
    if (surface === "pane")
      await page
        .getByRole("button", { name: "Assistant", exact: true })
        .click();
    const trigger = page.getByRole("button", { name: /chat history/i });
    await expect(trigger).toContainText("…");
    await expect(trigger).not.toHaveAttribute("title");
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "Recent chats" });
    const row = popup.getByRole("link", { name: new RegExp(title) });
    await expect(row).toContainText("…");
    await expect(row).not.toHaveAttribute("title");
    await expect(
      popup.getByRole("button", { name: "Delete chat: Still working" }),
    ).toBeDisabled();
    await popup.getByRole("button", { name: `Delete chat: ${title}` }).click();
    const confirm = page.getByRole("alertdialog", { name: "Delete chat?" });
    await confirm.getByRole("button", { name: "Cancel" }).click();
    expect(attempts).toBe(0);
    await trigger.click();
    await popup.getByRole("button", { name: `Delete chat: ${title}` }).click();
    await confirm
      .getByRole("button", { name: "Delete chat", exact: true })
      .click();
    await expect(confirm.getByRole("alert")).toContainText(
      "Wait for requests to settle.",
    );
    await confirm
      .getByRole("button", { name: "Delete chat", exact: true })
      .click();
    await expect(
      confirm.getByRole("button", { name: "Deleting…" }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(confirm).toBeVisible();
    release();
    await expect(confirm).toHaveCount(0);
    await expect(trigger).toHaveText("New chat");
    expect(
      await page.evaluate(() => [
        localStorage.getItem("jas:assistant-panel:general"),
        localStorage.getItem("jas:assistant-panel:study:remembered:1"),
        localStorage.getItem("jas:assistant-panel:study:unrelated:1"),
      ]),
    ).toEqual([null, null, "keep-chat"]);
    await trigger.click();
    await expect(
      popup.getByRole("link", { name: new RegExp(title) }),
    ).toHaveCount(0);
    if (surface === "focused")
      await expect(page).toHaveURL(/\/assistant\?new=/);
    else await expect(page).toHaveURL(/\/settings$/);
  });
}

test("opening stays manual while the last selected chat remains available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/chats", (route) =>
    route.fulfill({
      json: [
        {
          id: "remembered-chat",
          title: "My last conversation",
          updated: new Date().toISOString(),
          status: "complete",
        },
      ],
    }),
  );
  await page.route("**/api/chats/remembered-chat", (route) =>
    route.fulfill({ json: reply("remembered-chat", "My last conversation") }),
  );
  await page.goto("/experiments");
  const pane = page.getByRole("complementary", {
    name: "Assistant",
    exact: true,
  });
  const toggle = page.getByRole("button", { name: "Assistant", exact: true });
  await expect(pane).toBeHidden();
  await toggle.click();
  await pane.getByRole("button", { name: /chat history/i }).click();
  await page.getByRole("link", { name: /My last conversation/ }).click();
  await expect(pane.getByRole("button", { name: /chat history/i })).toHaveText(
    "My last conversation",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Gallery", exact: true })
    .click();
  await expect(pane).toBeHidden();
  await page.goBack();
  await expect(pane).toBeHidden();
  await toggle.click();
  await expect(pane.getByRole("button", { name: /chat history/i })).toHaveText(
    "My last conversation",
  );
  await page.reload();
  await expect(pane).toBeHidden();
  await toggle.click();
  await expect(pane.getByRole("button", { name: /chat history/i })).toHaveText(
    "My last conversation",
  );
});
