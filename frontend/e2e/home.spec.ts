import { expect, test } from "@playwright/test";
import { createStudy } from "./helpers.js";

const settings = {
  providers: { openai: true },
  planner_model: "openai:gpt-6.1-sol",
  assistant_model: "openai:gpt-6.1-sol",
};

test("Home submits once, opens the saved Agent conversation and never resubmits on back or reload", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  let submissions = 0;
  let question = "";
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chats", async (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({
        json: submissions
          ? [{ id: "home-chat", title: question, status: "complete" }]
          : [],
      });
    submissions++;
    const body = route.request().postDataJSON();
    expect(body.context).toBe("general");
    expect(body.chat_id).toBeNull();
    question = body.question;
    await pending;
    await route.fulfill({
      status: 202,
      json: { id: "home-answer", chat_id: "home-chat" },
    });
  });
  await page.route("**/api/chats/home-chat", (route) =>
    route.fulfill({
      json: [
        {
          id: "home-answer",
          chat_id: "home-chat",
          question,
          purpose: "design",
          status: "complete",
          study_id: null,
          run_id: null,
          cutoffs: {},
          output: {
            supported: false,
            explanation:
              "A narrower question is needed before designing the protocol.",
          },
        },
      ],
    }),
  );
  await page.goto("/");
  await expect(page).toHaveTitle("JAS");
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-slot="input-group"]')).toHaveCSS(
    "opacity",
    "1",
  );
  const suggestions = page
    .getByRole("region", { name: "Experiment suggestions" })
    .getByRole("button");
  await expect(suggestions).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Suggestions", exact: true }),
  ).toBeVisible();
  await suggestions.last().click();
  await expect(page.getByLabel("Message Agent", { exact: true })).toHaveValue(
    /Vary only signal accuracy/,
  );
  expect(submissions).toBe(0);
  await suggestions.first().click();
  const input = page.getByLabel("Message Agent", { exact: true });
  await expect(input).toHaveValue(/public messages/);
  await expect(input).toBeFocused();
  expect(submissions).toBe(0);
  await page.reload();
  await expect(input).toHaveValue(/public messages/);
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeEnabled();
  await page.getByRole("form", { name: "Agent composer" }).evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  expect(submissions).toBe(1);
  release();
  await expect(page).toHaveURL(/\/agent\?chat=home-chat$/);
  await expect(
    page
      .getByRole("region", { name: "Agent conversation" })
      .getByText(question, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A narrower question is needed before designing the protocol.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Agent conversation" })
      .getByText(question, { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(input).toHaveValue("");
  expect(submissions).toBe(1);
});

test("Home preserves failed drafts and disables paid submission without a configured provider", async ({
  page,
}) => {
  let available = true;
  let submissions = 0;
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { ...settings, providers: { openai: available } } }),
  );
  await page.route("**/api/chats", (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: [] });
    expect(route.request().postDataJSON().context).toBe("general");
    submissions++;
    return route.fulfill({
      status: 503,
      json: { detail: "Provider temporarily unavailable" },
    });
  });
  await page.goto("/");
  // Home never inherits record scope from a URL or a previous Agent selection.
  await page.goto("/?context=run:unselected");
  const input = page.getByLabel("Message Agent", { exact: true });
  await input.fill("Keep this experiment question");
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("Keep this experiment question\n");
  await input.press("Enter");
  await expect(page.getByRole("alert")).toContainText(
    "Provider temporarily unavailable",
  );
  await expect(input).toHaveValue("Keep this experiment question\n");
  available = false;
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toHaveCount(0);
  await expect(input).toHaveValue("Keep this experiment question\n");
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Configure a provider", exact: true }),
  ).toBeVisible();
  expect(submissions).toBe(1);
});

test("late Home responses keep the user's destination and leave the chat in history", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  let submitted = false;
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chats", async (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({
        json: submitted
          ? [
              {
                id: "late-home-chat",
                title: "A question sent from Home",
                status: "pending",
              },
            ]
          : [],
      });
    submitted = true;
    await pending;
    await route.fulfill({
      status: 202,
      json: { id: "late-home-answer", chat_id: "late-home-chat" },
    });
  });
  await page.goto("/");
  await page
    .getByLabel("Message Agent", { exact: true })
    .fill("A question sent from Home");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("link", { name: "Experiments", exact: true }).click();
  release();
  await expect(page).toHaveTitle("JAS");
  await page.getByRole("link", { name: "Agent", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Past chats" })
      .getByRole("link", { name: "A question sent from Home" }),
  ).toHaveAttribute("href", "/agent?chat=late-home-chat");
});

for (const width of [390, 1440])
  for (const theme of ["light", "dark"]) {
    test(`Home shows useful work with contained layouts · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.route("**/api/settings", (route) =>
        route.fulfill({ json: settings }),
      );
      const { study, run } = await createStudy(request);
      await page.addInitScript(
        ({ theme, design }) => {
          localStorage.setItem("jas-theme", theme);
          for (const [index, title] of [
            "Continue the latest protocol",
            "An older unfinished protocol",
          ].entries()) {
            const path = `/new?template=${index ? "trust" : "commons"}`;
            localStorage.setItem(
              `jas:draft:${path}`,
              JSON.stringify({
                path,
                title,
                updated: `2026-11-0${9 - index}T00:00:00Z`,
                design,
                json: JSON.stringify(design),
                mode: "visual",
              }),
            );
          }
        },
        { theme, design: study.design },
      );
      await page.route("**/api/studies", (route) =>
        route.fulfill({
          json: Array.from({ length: 6 }, (_, i) => ({
            id: `recent-${i}`,
            title: `Experiment ${i}: a long title about resource allocation and cooperation`,
            created: `2026-11-0${9 - i}T00:00:00Z`,
            run_count: 4,
            completed_runs: 0,
            status: "ready",
          })),
        }),
      );
      await page.route("**/api/runs", (route) =>
        route.fulfill({ json: [{ ...run.summary, status: "running" }] }),
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "What would you like to test?" }),
      ).toBeVisible();
      const geometry = await page
        .locator('[data-slot="input-group"]')
        .evaluate((box) => {
          const bounds = box.getBoundingClientRect();
          const backdrop = document
            .querySelector("[data-slot=home-backdrop]")
            ?.getBoundingClientRect();
          return {
            top: bounds.top,
            height: bounds.height,
            width: bounds.width,
            edge: backdrop?.bottom,
            shadow: getComputedStyle(box).boxShadow,
          };
        });
      expect(geometry.width).toBeLessThanOrEqual(672);
      expect(geometry.height).toBeGreaterThanOrEqual(136);
      expect(
        ((geometry.edge ?? 0) - geometry.top) / geometry.height,
      ).toBeCloseTo(0.6, 1);
      expect(geometry.shadow).not.toBe("none");
      await expect(
        page
          .getByRole("region", { name: "Recent experiments" })
          .getByRole("link", { name: /^Experiment \d/ }),
      ).toHaveCount(4);
      await expect(
        page
          .getByRole("region", { name: "Continue working" })
          .getByRole("link"),
      ).toHaveCount(1);
      await expect(
        page.getByText("Continue the latest protocol", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("An older unfinished protocol", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page
          .getByRole("region", { name: "In progress" })
          .getByRole("link", { name: new RegExp(study.design.title) }),
      ).toHaveAttribute("href", `/runs/${run.summary.id}`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("button", {
          name: "Pause background animation",
          exact: true,
        })
        .click();
      await expect(page.locator(".home-grid-cell").first()).toHaveCSS(
        "animation-play-state",
        "paused",
      );
      await page
        .getByRole("button", {
          name: "Resume background animation",
          exact: true,
        })
        .click();
      await expect(page.locator(".home-grid-cell").first()).toHaveCSS(
        "animation-play-state",
        "running",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator(".home-grid-cell").first()).toHaveCSS(
        "animation-name",
        "none",
      );
      await page.screenshot({
        path: testInfo.outputPath(`home-${theme}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      if (width === 390)
        await page.getByRole("button", { name: "Open menu" }).click();
      const nav = page.getByRole("navigation", { name: "Main navigation" });
      await expect(nav.getByRole("link")).toHaveText([
        "Home",
        "Agent",
        "Experiments",
        "Runs",
        "Environments",
      ]);
      const typography = await nav.getByRole("link").evaluateAll((links) =>
        links.map((link) => {
          const style = getComputedStyle(link);
          return `${style.fontSize}/${style.fontWeight}`;
        }),
      );
      expect(new Set(typography).size).toBe(1);
      if (width === 390)
        await page
          .getByRole("button", { name: "Close menu", exact: true })
          .click();
      await page.getByRole("link", { name: "New", exact: true }).click();
      await expect(page).toHaveURL(/\/new$/);
    });
  }
