import { expect, test } from "@playwright/test";
import { createStudy } from "./helpers.js";

const settings = {
  providers: { openai: true },
  planner_model: "openai:gpt-6.1-sol",
  assistant_model: "openai:gpt-6.1-sol",
};

test("Home keeps immediate content usable while only database rows show skeletons", async ({
  page,
}) => {
  let releaseStudies = () => {};
  let releaseSettings = () => {};
  const pendingStudies = new Promise<void>((resolve) => {
    releaseStudies = resolve;
  });
  const pendingSettings = new Promise<void>((resolve) => {
    releaseSettings = resolve;
  });
  await page.addInitScript(() => {
    const path = "/new";
    localStorage.setItem(
      `jas:draft:${path}`,
      JSON.stringify({
        path,
        title: "A local unfinished experiment",
        updated: new Date().toISOString(),
        design: {},
        json: "{}",
        mode: "json",
      }),
    );
  });
  await page.route("**/api/settings", async (route) => {
    await pendingSettings;
    await route.fulfill({ json: settings });
  });
  await page.route("**/api/studies", async (route) => {
    await pendingStudies;
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/runs", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  const recent = page.getByRole("region", { name: "Recent experiments" });
  const loading = recent.getByRole("status", {
    name: "Loading recent experiments",
  });
  await expect(loading).toBeVisible();
  const placeholders = loading.locator('[data-slot="skeleton"]');
  expect(await placeholders.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(
    await placeholders.count(),
  );
  await expect(
    page
      .getByRole("region", { name: "Drafts", exact: true })
      .getByRole("link", {
        name: "A local unfinished experiment",
      }),
  ).toBeVisible();
  for (const label of ["New", "View all"]) {
    await expect(
      recent.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }
  const suggestions = page
    .getByRole("region", { name: "Experiment ideas" })
    .getByRole("button");
  await expect(suggestions).toHaveCount(4);
  await suggestions.first().click();
  const input = page.getByLabel("Message Agent", { exact: true });
  await expect(input).toHaveValue(/public messages/);
  const send = page.getByRole("button", { name: "Send message" });
  await expect(send).toBeDisabled();
  const newPosition = await recent
    .getByRole("link", { name: "New", exact: true })
    .boundingBox();
  releaseSettings();
  await expect(send).toBeEnabled();
  await expect(loading).toBeVisible();
  releaseStudies();
  await expect(loading).toHaveCount(0);
  await expect(
    recent.getByText("Your experiments will appear here"),
  ).toBeVisible();
  expect(
    await recent.getByRole("link", { name: "New", exact: true }).boundingBox(),
  ).toEqual(newPosition);
  await recent.getByRole("link", { name: "View all", exact: true }).click();
  await expect(page).toHaveURL(/\/studies$/);
});

test("the grid ecosystem evolves only while visible and motion is enabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const grid = page.locator(".home-grid");
  const frame = () =>
    grid
      .locator("rect")
      .evaluateAll((cells) =>
        cells
          .map(
            (cell) =>
              `${cell.getAttribute("fill")}:${cell.getAttribute("style")}`,
          )
          .join("|"),
      );
  // Provider availability and fonts affect the hero height. Measure the settled
  // keyless layout before checking motion; a resize legitimately rebuilds cells.
  await expect(
    page.getByRole("link", { name: "Configure a provider", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(() =>
      grid.evaluate((element) => {
        const svg = element as SVGSVGElement;
        const bounds = svg.getBoundingClientRect();
        return Math.max(
          Math.abs(svg.viewBox.baseVal.width - bounds.width),
          Math.abs(svg.viewBox.baseVal.height - bounds.height),
        );
      }),
    )
    .toBeLessThan(18);
  await expect(grid).toHaveAttribute("data-paused", "true");
  expect(await grid.locator("rect").count()).toBeLessThanOrEqual(3456);
  const still = await frame();
  await page.waitForTimeout(900);
  expect(await frame()).toBe(still);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(grid).toHaveAttribute("data-paused", "false");
  await expect.poll(frame).not.toBe(still);
  await page
    .getByRole("region", { name: "Recent experiments" })
    .scrollIntoViewIfNeeded();
  await expect(grid).toHaveAttribute("data-paused", "true");
  const offscreen = await frame();
  await page.waitForTimeout(900);
  expect(await frame()).toBe(offscreen);
  await grid.scrollIntoViewIfNeeded();
  await expect(grid).toHaveAttribute("data-paused", "false");
  await expect.poll(frame).not.toBe(offscreen);
});

test("Composer's manual editor link preserves the message without submitting", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  let submissions = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/chats") && request.method() === "POST")
      submissions++;
  });
  for (const path of ["/", "/agent"]) {
    await page.goto(path);
    const input = page.getByLabel("Message Agent", { exact: true });
    await input.fill("Compare cooperation with and without messages");
    await page
      .getByRole("form", { name: "Agent composer" })
      .getByRole("link", { name: "start from scratch" })
      .click();
    await expect(page).toHaveURL(/\/new$/);
    await page.goBack();
    await expect(input).toHaveValue(
      "Compare cooperation with and without messages",
    );
  }
  expect(submissions).toBe(0);
});

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
    page.getByRole("region", { name: "Drafts", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Recent experiments" })
      .getByRole("link", { name: "New", exact: true }),
  ).toHaveAttribute("href", "/new");
  await expect(
    page.getByRole("combobox", { name: "Message context" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-slot="input-group"]')).toHaveCSS(
    "opacity",
    "1",
  );
  const suggestions = page
    .getByRole("region", { name: "Experiment ideas" })
    .getByRole("button");
  await expect(suggestions).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "Experiment ideas", exact: true }),
  ).toBeVisible();
  await suggestions.last().click();
  await expect(page.getByLabel("Message Agent", { exact: true })).toHaveValue(
    /Vary only regeneration/,
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
            "",
            "An earlier draft",
            "The oldest draft",
          ].entries()) {
            const path =
              index === 0
                ? "/new?template=commons"
                : `/new?plan=draft-${index}`;
            localStorage.setItem(
              `jas:draft:${path}`,
              JSON.stringify({
                path,
                title,
                updated: `2026-11-0${9 - index}T00:00:00Z`,
                design: { ...design, title },
                json: JSON.stringify({ ...design, title }),
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
            environment: study.design.environment,
            question: study.design.question,
            revision: 1,
            title: `Experiment ${i}: a long title about resource allocation and cooperation`,
            created:
              i === 0
                ? new Date().toISOString()
                : `2026-11-0${9 - i}T00:00:00Z`,
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
        .getByRole("form", { name: "Agent composer" })
        .locator('[data-slot="card"]')
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
      const recentSection = page.getByRole("region", {
        name: "Recent experiments",
      });
      await expect(
        recentSection.getByRole("link", { name: "View all", exact: true }),
      ).toHaveAttribute("href", "/studies");
      await expect(recentSection.locator("time").first()).toHaveText(
        "Just now",
      );
      await expect(recentSection.locator("time").first()).toHaveAttribute(
        "title",
        /^Created /,
      );
      await expect(recentSection.locator('[data-slot="badge"]')).toHaveCount(0);
      await expect(recentSection).not.toContainText("runs complete");
      const experimentOptions = recentSection.getByRole("button", {
        name: /^More options for Experiment /,
      });
      await expect(experimentOptions).toHaveCount(4);
      const created = await recentSection
        .locator("time")
        .first()
        .getAttribute("datetime");
      await experimentOptions.first().click();
      const experimentMenu = page.getByRole("menu");
      await expect(experimentMenu).toBeVisible();
      await expect(experimentMenu).toContainText("Created");
      await expect(experimentMenu.locator("time")).toHaveAttribute(
        "datetime",
        created ?? "",
      );
      await page.keyboard.press("Escape");
      await expect(experimentMenu).toHaveCount(0);
      await expect(experimentOptions.first()).toBeFocused();
      await expect(page).toHaveURL(/\/$/);
      const draftSection = page.getByRole("region", {
        name: "Drafts",
        exact: true,
      });
      const continueDraft = draftSection.getByRole("link", {
        name: /^Continue the latest protocol/,
      });
      await expect(continueDraft).toHaveAttribute(
        "href",
        "/new?template=commons",
      );
      await expect(continueDraft).toHaveAttribute(
        "title",
        "Continue the latest protocol",
      );
      await expect(draftSection.locator('[data-slot="item-title"]')).toHaveText(
        [
          "Continue the latest protocol",
          "An older unfinished protocol",
          "Untitled experiment",
        ],
      );
      await expect(
        draftSection.getByRole("link", { name: "View all drafts" }),
      ).toHaveAttribute("href", "/studies#drafts");
      await expect(
        page
          .getByRole("region", { name: "Recent experiments" })
          .getByRole("link", { name: "New", exact: true }),
      ).toHaveAttribute("href", "/new");
      await expect(
        page
          .getByRole("region", { name: "Experiment ideas" })
          .getByRole("link"),
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
      await expect(
        page.getByRole("button", { name: /background animation/ }),
      ).toHaveCount(0);
      const completeCells = await page.locator(".home-grid").evaluate((svg) => {
        const bounds = (svg as SVGSVGElement).viewBox.baseVal;
        return [
          ...svg.querySelectorAll<SVGRectElement>(".home-grid-cell"),
        ].every(
          (cell) =>
            cell.x.baseVal.value >= 0 &&
            cell.y.baseVal.value >= 0 &&
            cell.x.baseVal.value + cell.width.baseVal.value <= bounds.width &&
            cell.y.baseVal.value + cell.height.baseVal.value <= bounds.height,
        );
      });
      expect(completeCells).toBe(true);
      const filledEdges = await page.locator(".home-grid").evaluate((svg) => {
        const cells = [
          ...svg.querySelectorAll<SVGRectElement>(".home-grid-cell"),
        ];
        return {
          top: Math.min(...cells.map((cell) => cell.y.baseVal.value)),
          bottom: Math.max(
            ...cells.map(
              (cell) => cell.y.baseVal.value + cell.height.baseVal.value,
            ),
          ),
          height: (svg as SVGSVGElement).viewBox.baseVal.height,
        };
      });
      expect(filledEdges.top).toBe(0);
      expect(filledEdges.bottom).toBe(filledEdges.height);
      const draftToggle = draftSection.getByRole("button", {
        name: "Drafts",
        exact: true,
      });
      await draftToggle.click();
      await expect(continueDraft).toHaveCount(0);
      await expect(draftToggle).toHaveAttribute("aria-expanded", "false");
      await expect(draftSection.locator('[data-slot="separator"]')).toHaveCount(
        0,
      );
      await draftToggle.click();
      await expect(continueDraft).toBeVisible();
      const experiments = page.getByRole("region", {
        name: "Recent experiments",
      });
      const experimentToggle = experiments.getByRole("button", {
        name: "Recent experiments",
        exact: true,
      });
      await experimentToggle.click();
      await expect(experiments.locator('[data-slot="separator"]')).toHaveCount(
        0,
      );
      await expect(
        experiments.getByRole("link", { name: /^Experiment \d/ }),
      ).toHaveCount(0);
      await expect(
        experiments.getByRole("link", { name: "New", exact: true }),
      ).toBeVisible();
      await expect(
        experiments.getByRole("link", { name: "View all", exact: true }),
      ).toBeVisible();
      await experimentToggle.click();
      await expect(
        experiments.getByRole("link", { name: /^Experiment \d/ }),
      ).toHaveCount(4);
      for (const toggle of [draftToggle, experimentToggle]) {
        await toggle.hover();
        await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        const hitArea = await toggle.evaluate((button) => ({
          button: button.getBoundingClientRect().width,
          heading: button.parentElement?.getBoundingClientRect().width ?? 0,
        }));
        expect(hitArea.button).toBeLessThan(hitArea.heading);
      }
      await continueDraft.hover();
      await expect(continueDraft.locator("..")).not.toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      const deleteDraft = draftSection.getByRole("button", {
        name: "Delete Continue the latest protocol draft",
      });
      await deleteDraft.hover();
      await expect(deleteDraft).not.toHaveCSS(
        "background-color",
        /(?:\/\s*0|,\s*0)\)$/,
      );
      const firstExperiment = experiments
        .getByRole("link", { name: /^Experiment \d/ })
        .first();
      await firstExperiment.hover();
      await expect(firstExperiment.locator("..")).not.toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await experimentOptions.first().hover();
      await expect(experimentOptions.first()).not.toHaveCSS(
        "background-color",
        /(?:\/\s*0|,\s*0)\)$/,
      );
      for (const action of [deleteDraft, experimentOptions.first()]) {
        const inset = await action.evaluate((button) => {
          const row = button.parentElement?.parentElement;
          if (!row) throw new Error("Missing record row");
          return (
            row.getBoundingClientRect().right -
            button.getBoundingClientRect().right
          );
        });
        expect(inset).toBeGreaterThan(0);
        expect(inset).toBeLessThan(8);
      }
      await page.screenshot({
        path: testInfo.outputPath(`home-record-hover-${theme}-${width}.png`),
        fullPage: true,
      });
      const suggestionSection = page.getByRole("region", {
        name: "Experiment ideas",
      });
      const illustrations = suggestionSection.locator("img");
      await expect(illustrations).toHaveCount(4);
      await expect
        .poll(() =>
          illustrations.evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          ),
        )
        .toBe(true);
      const firstSuggestion = suggestionSection.getByRole("button").first();
      await firstSuggestion.hover();
      const suggestionEdges = await suggestionSection
        .locator('[data-slot="item-group"]')
        .evaluate((group) => {
          const bounds = group.getBoundingClientRect();
          const buttons = [...group.querySelectorAll("button")];
          const boxes = buttons.map((button) => button.getBoundingClientRect());
          const horizontal = getComputedStyle(group).flexDirection === "row";
          const last = boxes.at(-1);
          if (!last) throw new Error("Suggestions are missing");
          return {
            horizontal,
            topGap: boxes[0].top - bounds.top,
            leftGap: boxes[0].left - bounds.left,
            endGap: bounds.bottom - last.bottom,
            gaps: boxes
              .slice(1)
              .map((box, index) =>
                horizontal
                  ? box.left - boxes[index].right
                  : box.top - boxes[index].bottom,
              ),
            borders: buttons.map(
              (button) => getComputedStyle(button).borderTopWidth,
            ),
          };
        });
      expect(suggestionEdges.topGap).toBeCloseTo(1, 1);
      expect(suggestionEdges.horizontal).toBe(width >= 1280);
      expect(suggestionEdges.leftGap).toBeCloseTo(1, 1);
      expect(suggestionEdges.endGap).toBeCloseTo(1, 1);
      for (const gap of suggestionEdges.gaps) expect(gap).toBeCloseTo(1, 1);
      expect(suggestionEdges.borders).toEqual(Array(4).fill("0px"));
      await page.screenshot({
        path: testInfo.outputPath(`home-hover-${theme}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.mouse.move(0, 0);
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
      await draftSection.getByRole("link", { name: "View all drafts" }).click();
      await expect(page).toHaveURL(/\/studies#drafts$/);
      await expect(
        page.getByRole("button", { name: "Drafts · 5", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByRole("link", { name: "The oldest draft", exact: true }),
      ).toBeVisible();
      await page.goBack();
      await continueDraft.click();
      await expect(page).toHaveURL(/\/new\?template=commons$/);
      await expect(
        page.getByLabel("Experiment name", { exact: true }),
      ).toHaveValue("Continue the latest protocol");
      await page.goBack();
      await page.getByRole("link", { name: "New", exact: true }).click();
      await expect(page).toHaveURL(/\/new$/);
    });
  }

for (const width of [390, 1440]) {
  test(`Home and Agent composers grow, scroll internally and shrink again · ${width}`, async ({
    page,
  }, testInfo) => {
    await page.route("**/api/settings", (route) =>
      route.fulfill({ json: settings }),
    );
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/agent"]) {
      await page.goto(path);
      const input = page.getByLabel("Message Agent", { exact: true });
      const group = input.locator("..");
      const appearance = () =>
        group.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            color: style.borderColor,
            width: style.borderWidth,
            shadows: style.boxShadow
              .split(/,(?![^(]*\))/)
              .filter((shadow) =>
                (shadow.match(/-?[\d.]+px/g) ?? []).some(
                  (length) => Number.parseFloat(length) !== 0,
                ),
              ),
          };
        });
      await input.blur();
      const restingBorder = await appearance();
      await input.focus();
      await expect.poll(appearance).toEqual(restingBorder);
      await input.fill("A short question");
      const initialHeight = (await input.boundingBox())?.height ?? 0;
      expect(initialHeight).toBe(88);
      await expect(input).toHaveCSS("font-size", "15px");
      await input.fill(
        Array.from({ length: 6 }, (_, i) => `Question line ${i + 1}`).join(
          "\n",
        ),
      );
      await expect
        .poll(async () => (await input.boundingBox())?.height ?? 0)
        .toBeGreaterThan(initialHeight);
      await input.fill(
        Array.from({ length: 40 }, (_, i) => `Question line ${i + 1}`).join(
          "\n",
        ),
      );
      const scroll = await input.evaluate((element) => ({
        height: element.clientHeight,
        content: element.scrollHeight,
      }));
      expect(scroll.height).toBeLessThanOrEqual(192);
      expect(scroll.content).toBeGreaterThan(scroll.height);
      await expect(
        page.getByRole("button", { name: "Send message", exact: true }),
      ).toBeInViewport();
      await expect(input).toHaveValue(/Question line 40$/);
      await input.fill("A short question");
      await expect
        .poll(async () => (await input.boundingBox())?.height ?? 0)
        .toBe(initialHeight);
      if (path === "/agent") {
        await page.screenshot({
          path: testInfo.outputPath(`agent-composer-${width}.png`),
          fullPage: true,
        });
      }
    }
  });
}
