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
      route.fulfill({ json: { providers: { openai: true } } }),
    );
    let row = {
      id: "stream-answer",
      chat_id: "stream-chat",
      question: "Explain matched seeds",
      purpose: "general",
      status: "pending",
      cutoffs: {},
      study_id: null,
      run_id: null,
      output: {
        stage: "answering",
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
      row.output.partial =
        "## Matched seeds\n\nUse the **same initial randomization** in each condition.\n\n1. Choose seeds.\n2. Run each condition.\n\n| Condition | Seed |\n| --- | --- |\n| Control | 7 |\n| Treatment | 7 |\n\n```python\nseeds = [7, 19, 42]\n```";
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify(row)}\n\n`,
      });
    });
    await page.goto("/agent");
    const composer = page.locator(".assistant-form");
    const emptyBounds = await composer.boundingBox();
    const suggestions = await page.locator(".agent-suggestions").boundingBox();
    expect(emptyBounds?.y).toBeGreaterThan(
      (page.viewportSize()?.height ?? 0) * 0.6,
    );
    expect((suggestions?.y ?? 0) + (suggestions?.height ?? 0)).toBeLessThan(
      emptyBounds?.y ?? 0,
    );
    await page
      .getByLabel("Message Agent", { exact: true })
      .fill("Explain matched seeds");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Thinking");
    await expect(page.locator(".agent-thinking i")).toHaveCount(3);
    releaseStream();
    await expect(
      page.getByRole("heading", { name: "Matched seeds", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Writing");
    await expect(page.getByRole("table")).toContainText("Treatment");
    await expect(page.locator(".agent-prose ol li")).toHaveCount(2);
    await expect(page.locator(".agent-prose pre code")).toContainText(
      "seeds = [7, 19, 42]",
    );
    await expect(page.locator('[data-streaming="true"]')).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Send message", exact: true }),
    ).toBeDisabled();
    const activeBounds = await composer.boundingBox();
    expect(activeBounds?.y).toBeCloseTo(emptyBounds?.y ?? 0, -1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`streaming-${theme}.png`),
      animations: "disabled",
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page
        .locator(".agent-activity svg")
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
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Matched seeds", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Matched seeds", exact: true }),
    ).toBeVisible();
  });
}
