import { expect, test } from "@playwright/test";

test("four examples adapt to creation, saved treatments and a run without submitting", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const { id } = await (
    await request.post("/api/studies", {
      data: {
        design: {
          ...catalog.templates[0].design,
          title: "Messages under scarcity",
          question: "Do public messages change contributions?",
        },
      },
    })
  ).json();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  const run = study.runs[0];
  let submitted = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/chats"))
      submitted++;
  });
  await page.goto("/agent");
  const suggestions = page
    .getByRole("region", { name: "Suggested questions" })
    .getByRole("button");
  await expect(suggestions).toHaveCount(4);
  const context = page.getByRole("combobox", { name: "Message context" });
  const draft = page.getByLabel("Message Agent", { exact: true });
  await expect(context).toContainText("Add context");
  await page
    .getByRole("button", {
      name: "Design an experiment",
      exact: true,
    })
    .click();
  await expect(draft).toHaveValue(/Help me design an agent experiment/);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/studies/${id}`, async (route) => {
    await pending;
    await route.continue();
  });
  await context.click();
  await page
    .getByRole("option", { name: "Messages under scarcity", exact: true })
    .click();
  try {
    await expect(suggestions).toHaveCount(0);
    await expect(draft).toHaveValue(/Help me design an agent experiment/);
    await draft.fill("");
    await expect(
      page.getByRole("status", { name: "Loading suggested questions" }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByRole("button", { name: "Review setup", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compare conditions", exact: true })
    .click();
  await expect(draft).toHaveValue(new RegExp(study.design.conditions[0].name));
  await expect(draft).toHaveValue(new RegExp(study.design.conditions[1].name));
  await expect(suggestions).toHaveCount(0);
  await draft.fill("");
  await page.getByRole("button", { name: "Review setup", exact: true }).click();
  await expect(draft).toHaveValue(/Do public messages change contributions\?/);
  let failed = true;
  let releaseRun: () => void = () => {};
  const runPending = new Promise<void>((resolve) => {
    releaseRun = resolve;
  });
  await page.route(`**/api/runs/${run.id}`, async (route) => {
    if (failed)
      return route.fulfill({
        status: 503,
        json: { detail: "Run protocol unavailable" },
      });
    await runPending;
    await route.continue();
  });
  await context.click();
  await page
    .getByRole("option", {
      name: new RegExp(`Rev ${run.revision} .*${run.id.slice(0, 6)}`),
    })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Run protocol unavailable",
  );
  await expect(suggestions).toHaveCount(0);
  await expect(draft).toHaveValue(/Do public messages change contributions\?/);
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  try {
    await expect(suggestions).toHaveCount(0);
    await expect(draft).toHaveValue(
      /Do public messages change contributions\?/,
    );
    await draft.fill("");
    await expect(
      page.getByRole("status", { name: "Loading suggested questions" }),
    ).toBeVisible();
  } finally {
    releaseRun();
  }
  await expect(suggestions).toHaveCount(4);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review condition", exact: true })
    .click();
  await expect(draft).toHaveValue(
    new RegExp(
      `condition “${run.condition}”, seed ${run.seed}, repetition ${run.repetition}`,
    ),
  );
  await expect(draft).toBeFocused();
  expect(submitted).toBe(0);
});

for (const width of [320, 1440]) {
  test(`Agent shortcuts fade while drafting without moving the composer · ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    let submissions = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/chats"))
        submissions++;
    });
    await page.goto("/agent");
    const suggestions = page.getByRole("region", {
      name: "Suggested questions",
    });
    const draft = page.getByLabel("Message Agent", { exact: true });
    const composer = page.getByRole("form", { name: "Agent composer" });
    await expect(suggestions.getByRole("button")).toHaveText([
      "Design an experiment",
      "Review a setup",
      "Understand results",
      "Learn the basics",
    ]);
    const bounds = await composer.boundingBox();
    await draft.fill("Check this idea");
    await expect(suggestions).toHaveCount(0);
    await expect(page.locator('[aria-label="Suggested questions"]')).toHaveCSS(
      "opacity",
      "0",
    );
    expect(await composer.boundingBox()).toEqual(bounds);
    await draft.fill("");
    await expect(suggestions.getByRole("button")).toHaveCount(4);
    expect(await composer.boundingBox()).toEqual(bounds);
    const buttons = await suggestions.getByRole("button").all();
    const boxes = await Promise.all(
      buttons.map((button) => button.boundingBox()),
    );
    expect(new Set(boxes.map((box) => box?.height)).size).toBe(1);
    if (width === 1440)
      expect(new Set(boxes.map((box) => box?.y)).size).toBe(1);
    const shortcut = suggestions.getByRole("button", {
      name: "Learn the basics",
    });
    await shortcut.focus();
    await shortcut.press("Enter");
    await expect(draft).toBeFocused();
    await expect(draft).toHaveValue(/Explain how JAS experiments work/);
    await expect(suggestions).toHaveCount(0);
    const text = await draft.inputValue();
    await page.reload();
    await expect(draft).toHaveValue(text);
    await expect(suggestions).toHaveCount(0);
    await draft.fill("");
    await expect(suggestions.getByRole("button")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(submissions).toBe(0);
  });
}
