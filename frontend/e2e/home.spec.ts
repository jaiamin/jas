import { expect, test } from "@playwright/test";
import { settings as settingsFixture } from "../src/test/fixtures.js";
import { createStudy } from "./helpers.js";

const settings = {
  ...settingsFixture,
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
  await expect(recent.locator('[data-slot="skeleton"]')).toHaveCount(
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
  const starters = page.getByRole("region", { name: "Experiment ideas" });
  await expect(starters.getByRole("button")).toHaveCount(4);
  const input = page.getByLabel("Message Assistant", { exact: true });
  await input.fill(
    "Design an experiment about public messages and cooperation.",
  );
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
  await expect(page).toHaveURL(/\/experiments$/);
});

for (const width of [390, 1440])
  for (const theme of ["light", "dark"]) {
    test(`Home keeps a pixel cloud scene and original content positions · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      const artworkRequests: string[] = [];
      page.on("request", (request) => {
        if (
          /\/(city\.(gif|webp)|home-dissolve\.svg|terrain\.svg)(?:$|\?)/.test(
            request.url(),
          )
        )
          artworkRequests.push(request.url());
      });
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.route("**/api/settings", (route) =>
        route.fulfill({ json: settings }),
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const manualLink = page.getByRole("link", { name: "start from scratch" });
      await expect(manualLink.locator("span")).toHaveCSS(
        "text-decoration-line",
        "underline",
      );
      await expect(manualLink.locator("span")).toHaveCSS(
        "text-underline-offset",
        "4px",
      );
      await expect(manualLink.locator("span")).toHaveCSS(
        "text-decoration-thickness",
        "1px",
      );
      await expect(manualLink.locator("svg")).toHaveCSS(
        "text-decoration-line",
        "none",
      );
      const hero = page.getByRole("region", {
        name: "What would you like to test?",
      });
      await expect(hero.locator("img, video")).toHaveCount(0);
      const geometry = await hero.evaluate((element) => {
        const title = element.querySelector("h1");
        const composer = element.querySelector("form");
        const ideas = document.getElementById("starter-title");
        const divider = element.querySelector('[data-slot="separator"]');
        if (!title || !composer || !ideas || !divider)
          throw new Error("Missing Home content or divider");
        return {
          titleTop: title.getBoundingClientRect().top,
          composerTop: composer.getBoundingClientRect().top,
          ideasTop: ideas.getBoundingClientRect().top,
          composerHeight: composer.getBoundingClientRect().height,
          fieldColor: getComputedStyle(
            element.querySelector(".home-field") as Element,
          ).backgroundColor,
          pageColor: getComputedStyle(document.body).backgroundColor,
          divider: divider.getBoundingClientRect().toJSON(),
          width: element.getBoundingClientRect().width,
          titleColor: getComputedStyle(title).color,
          foreground: getComputedStyle(element).color,
          blurred: [title, ...title.querySelectorAll("*")].some(
            (node) =>
              getComputedStyle(node, "::before").backdropFilter !== "none",
          ),
        };
      });
      // Positions captured before replacing the city: preserve both content rows.
      expect(geometry.titleTop).toBe(width === 390 ? 204 : 208);
      expect(geometry.composerTop).toBe(width === 390 ? 252 : 260);
      expect(geometry.ideasTop).toBeGreaterThan(
        geometry.composerTop + geometry.composerHeight,
      );
      expect(geometry.divider.width).toBe(geometry.width);
      expect(geometry.divider.height).toBe(1);
      expect(geometry.divider.top).toBeCloseTo(
        geometry.composerTop + geometry.composerHeight * 0.6,
        1,
      );
      expect(geometry.fieldColor).not.toBe(geometry.pageColor);
      expect(geometry.titleColor).toBe(geometry.foreground);
      expect(geometry.blurred).toBe(false);
      await expect(hero.locator(".home-world")).toHaveAttribute(
        "data-active",
        "true",
      );
      expect(artworkRequests).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`pixel-home-${theme}-${width}.png`),
        animations: "disabled",
      });
    });
  }

test("Home pixel art fills every cell without grid gaps or cropped edges", async ({
  page,
}) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const world = page.locator("canvas.home-world");
  for (const width of [333, 390, 753, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        world.evaluate(
          (canvas: HTMLCanvasElement) =>
            Math.abs(
              parseFloat(canvas.style.width) -
                (canvas.parentElement?.getBoundingClientRect().width ?? 0),
            ) < 0.01,
        ),
      )
      .toBe(true);
    const scene = await world.evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d");
      const divider = canvas.parentElement?.querySelector(
        '[data-slot="separator"]',
      );
      if (!context || !divider)
        throw new Error("Missing pixel scene or divider");
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let gaps = 0;
      const colors = new Set<string>();
      for (let pixel = 0; pixel < data.length; pixel += 4) {
        if (data[pixel + 3] !== 255) gaps++;
        colors.add(`${data[pixel]},${data[pixel + 1]},${data[pixel + 2]}`);
      }
      const bounds = canvas.getBoundingClientRect();
      const field = divider.closest(".home-field")?.getBoundingClientRect();
      if (!field) throw new Error("Missing scene field");
      const styles = getComputedStyle(canvas);
      return {
        gaps,
        colors: colors.size,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        fieldX: field.x,
        bottom: bounds.bottom,
        dividerTop: divider.getBoundingClientRect().top,
        rendering: styles.imageRendering,
        mask: styles.maskImage,
        filter: styles.filter,
      };
    });
    expect(scene.gaps).toBe(0);
    expect(scene.colors).toBeGreaterThanOrEqual(5);
    expect(scene.colors).toBeLessThanOrEqual(6);
    expect(scene.width / scene.sourceWidth).toBeCloseTo(5, 0);
    expect(scene.height / scene.sourceHeight).toBeCloseTo(5, 0);
    expect(scene.x).toBe(scene.fieldX);
    expect(scene.bottom).toBeCloseTo(scene.dividerTop, 2);
    expect(scene.rendering).toBe("pixelated");
    expect(scene.mask).toBe("none");
    expect(scene.filter).toBe("none");
  }
});

test("Home clouds respect reduced motion and pause offscreen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const mosaic = page.locator("canvas.home-world");
  await expect(mosaic).toHaveAttribute("data-active", "false");
  const image = () =>
    mosaic.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const initial = await image();
  await page.waitForTimeout(500);
  expect(await image()).toBe(initial);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(mosaic).toHaveAttribute("data-active", "true");
  await expect.poll(image).not.toBe(initial);
  await page
    .getByRole("region", { name: "Recent experiments" })
    .scrollIntoViewIfNeeded();
  await expect(mosaic).toHaveAttribute("data-active", "false");
  const paused = await image();
  await page.waitForTimeout(500);
  expect(await image()).toBe(paused);
  await page
    .getByRole("heading", { name: "What would you like to test?" })
    .scrollIntoViewIfNeeded();
  await expect(mosaic).toHaveAttribute("data-active", "true");
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
  await page.goto("/");
  const input = page.getByLabel("Message Assistant", { exact: true });
  await input.fill("Compare cooperation with and without messages");
  await page
    .getByRole("form", { name: "Assistant composer" })
    .getByRole("link", { name: "start from scratch" })
    .click();
  await expect(page).toHaveURL(/\/new$/);
  await page.goBack();
  await expect(input).toHaveValue(
    "Compare cooperation with and without messages",
  );
  expect(submissions).toBe(0);
});

test("Home submits once, opens the saved Assistant conversation and never resubmits on back or reload", async ({
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
          ? [
              {
                id: "home-chat",
                title: question,
                updated: new Date().toISOString(),
                status: "complete",
              },
            ]
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
  const starters = page.getByRole("region", { name: "Experiment ideas" });
  await expect(starters.getByRole("button")).toHaveCount(4);
  expect(submissions).toBe(0);
  const input = page.getByLabel("Message Assistant", { exact: true });
  await input.fill(
    "Design an experiment about public messages and cooperation.",
  );
  await expect(input).toBeFocused();
  expect(submissions).toBe(0);
  await page.reload();
  await expect(input).toHaveValue(/public messages/);
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeEnabled();
  await page
    .getByRole("form", { name: "Assistant composer" })
    .evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
    });
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  expect(submissions).toBe(1);
  release();
  await expect(page).toHaveURL(/\/assistant\?chat=home-chat$/);
  await expect(
    page
      .getByRole("region", { name: "Assistant conversation" })
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
      .getByRole("region", { name: "Assistant conversation" })
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
  const input = page.getByLabel("Message Assistant", { exact: true });
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
                updated: new Date().toISOString(),
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
    .getByLabel("Message Assistant", { exact: true })
    .fill("A question sent from Home");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("link", { name: "Experiments", exact: true }).click();
  release();
  await expect(page).toHaveTitle("JAS");
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await page.getByRole("button", { name: /chat history/i }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Past chats" })
      .getByRole("link", { name: "A question sent from Home" }),
  ).toHaveAttribute("href", "/assistant?chat=late-home-chat");
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
        .getByRole("form", { name: "Assistant composer" })
        .locator('[data-slot="card"]')
        .evaluate((box) => {
          const bounds = box.getBoundingClientRect();
          return {
            top: bounds.top,
            height: bounds.height,
            width: bounds.width,
            shadow: getComputedStyle(box).boxShadow,
          };
        });
      expect(geometry.width).toBeLessThanOrEqual(672);
      expect(geometry.height).toBeGreaterThanOrEqual(136);
      expect(geometry.top).toBe(width === 390 ? 252 : 260);
      // The title remains above the composer, using the shared theme foreground.
      await expect(
        page
          .getByRole("form", { name: "Assistant composer" })
          .locator('[data-slot="card"]')
          .getByRole("heading", { name: "What would you like to test?" }),
      ).toHaveCount(0);
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
      ).toHaveAttribute("href", "/experiments");
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
        draftSection.getByRole("button", { name: "View all drafts" }),
      ).toHaveAttribute("aria-expanded", "false");
      await expect(
        page
          .getByRole("region", { name: "Recent experiments" })
          .getByRole("link", { name: "New", exact: true }),
      ).toHaveAttribute("href", "/new");
      await expect(
        page
          .getByRole("region", { name: "Experiment ideas" })
          .getByRole("button"),
      ).toHaveCount(4);
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
      const draftToggle = draftSection.getByRole("button", {
        name: "Drafts",
        exact: true,
      });
      await draftToggle.click();
      await expect(continueDraft).toHaveCount(0);
      await expect(draftToggle).toHaveAttribute("aria-expanded", "false");
      await expect(
        draftSection.getByRole("button", { name: "View all drafts" }),
      ).toHaveCount(0);
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
      const starters = page.getByRole("region", {
        name: "Experiment ideas",
      });
      const cards = starters.getByRole("button");
      await expect(cards).toHaveCount(4);
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS("padding-left", "16px");
        await expect(card).toHaveCSS("padding-right", "16px");
      }
      const boxes = await cards.evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect();
          return { x: box.x, width: box.width, right: box.right };
        }),
      );
      expect(boxes.every((box) => box.width >= 160 && box.right <= width)).toBe(
        true,
      );
      expect(new Set(boxes.map((box) => Math.round(box.width))).size).toBe(1);
      const group = starters.locator('[data-slot="item-group"]');
      await expect(group).toHaveCSS("gap", "0px");
      const edges = await group.evaluate((group) =>
        [...group.children]
          .filter((child) => getComputedStyle(child).display !== "none")
          .map((child) => {
            const box = child.getBoundingClientRect();
            const content = child
              .querySelector(":scope > span")
              ?.getBoundingClientRect();
            return {
              x: box.x,
              y: box.y,
              right: box.right,
              bottom: box.bottom,
              contentLeft: content ? content.left - box.left : null,
              contentRight: content ? box.right - content.right : null,
            };
          }),
      );
      for (let index = 1; index < edges.length; index++) {
        const previous = edges[index - 1];
        const current = edges[index];
        expect(
          Math.abs(
            width >= 1280
              ? current.x - previous.right
              : current.y - previous.bottom,
          ),
        ).toBeLessThan(0.02);
      }
      if (width >= 1280) {
        for (const edge of edges.filter((edge) => edge.contentLeft !== null)) {
          expect(edge.contentLeft).toBe(16);
          expect(edge.contentRight).toBe(16);
        }
      }
      await starters.getByRole("button").first().hover();
      await page.screenshot({
        path: testInfo.outputPath(`home-hover-${theme}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.mouse.move(0, 0);
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
        "Gallery",
        "Experiments",
        "Runs",
        "Environments",
        /Docs/,
        /JAS MCP/,
        "Examples",
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
      await draftSection
        .getByRole("button", { name: "View all drafts" })
        .click();
      await expect(page).toHaveURL(/\/$/);
      await expect(
        draftSection.getByRole("button", { name: "Show fewer drafts" }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(
        draftSection.getByRole("link", {
          name: "The oldest draft",
          exact: true,
        }),
      ).toBeVisible();
      await draftSection
        .getByRole("button", { name: "Show fewer drafts" })
        .click();
      await expect(
        draftSection.locator('[data-slot="item-title"]'),
      ).toHaveCount(3);
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
  test(`Home and Assistant composers grow, scroll internally and shrink again · ${width}`, async ({
    page,
  }, testInfo) => {
    await page.route("**/api/settings", (route) =>
      route.fulfill({ json: settings }),
    );
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/assistant"]) {
      await page.goto(path);
      const input = page.getByLabel("Message Assistant", { exact: true });
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
      await expect(input).toHaveCSS("padding-top", "12px");
      await expect(input).toHaveCSS("padding-bottom", "8px");
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
      if (path === "/assistant") {
        await page.screenshot({
          path: testInfo.outputPath(`agent-composer-${width}.png`),
          fullPage: true,
        });
      }
    }
  });
}
