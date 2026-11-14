import { expect, test } from "@playwright/test";
import { settings as settingsFixture } from "../src/test/fixtures.js";
import { selectText } from "./helpers.js";

for (const destination of ["experiments", "new chat"]) {
  test(`a delayed Agent submission preserves navigation to ${destination}`, async ({
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
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let submitted = false;
    await page.route("**/api/chats", async (route) => {
      if (route.request().method() !== "POST")
        return route.fulfill({
          json: submitted
            ? [
                {
                  id: "late-chat",
                  title: "Original question",
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
        json: { id: "late-answer", chat_id: "late-chat" },
      });
    });
    await page.route("**/api/chats/late-chat", (route) =>
      route.fulfill({
        json: [
          {
            id: "earlier-answer",
            chat_id: "late-chat",
            question: "Earlier question",
            purpose: "general",
            status: "complete",
            study_id: null,
            run_id: null,
            output: { answer: "Earlier answer", citations: [], caveats: [] },
            cutoffs: {},
          },
        ],
      }),
    );
    const sourceChat = destination === "new chat" ? "late-chat" : "new";
    await page.goto(
      destination === "new chat" ? "/assistant?chat=late-chat" : "/assistant",
    );
    const input = page.getByLabel("Message Assistant", { exact: true });
    await input.fill("Original question");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect.poll(() => submitted).toBe(true);
    if (destination === "experiments") {
      await page
        .getByRole("link", { name: "Experiments", exact: true })
        .click();
      await expect(page).toHaveURL(/\/experiments$/);
    } else {
      await page.getByRole("button", { name: "New chat", exact: true }).click();
      await expect(page).toHaveURL(/\/assistant\?new=/);
      await input.fill("Keep this new draft");
    }
    const chosenURL = page.url();
    release();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => sessionStorage.getItem(key),
          `jas:agent-draft:${sourceChat}`,
        ),
      )
      .toBeNull();
    await expect(page).toHaveURL(chosenURL);
    if (destination === "new chat") {
      await expect(input).toHaveValue("Keep this new draft");
      await page
        .getByRole("button", { name: "Chat history", exact: true })
        .click();
      await expect(
        page.getByRole("navigation", { name: "Past chats" }),
      ).toContainText("Original question");
    } else {
      await page.getByRole("link", { name: "Assistant", exact: true }).click();
      await page
        .getByRole("button", { name: "Chat history", exact: true })
        .click();
      await expect(
        page.getByRole("navigation", { name: "Past chats" }),
      ).toContainText("Original question");
    }
  });
}

for (const path of ["/assistant"]) {
  test(`suggestion text can be selected without changing the composer · ${path}`, async ({
    page,
  }) => {
    let submissions = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/chats"))
        submissions++;
    });
    await page.goto(path);
    const input = page.getByLabel("Message Assistant", { exact: true });
    if (path === "/") await input.fill("My unfinished research question");
    const suggestions = page.getByRole("region", {
      name: path === "/" ? "Experiment ideas" : "Suggested questions",
    });
    await expect(suggestions.getByRole("button")).toHaveCount(4);
    // The provider notice changes layout; measure the drag after it is visible.
    await expect(
      page.getByRole("link", { name: "Configure a provider", exact: true }),
    ).toBeVisible();
    const first = suggestions.getByRole("button").first();
    const text = first.locator("span").last();
    await selectText(page, text);
    await expect(input).toHaveValue(
      path === "/" ? "My unfinished research question" : "",
    );
    await first.focus();
    await first.press("Enter");
    await expect(input).not.toHaveValue("My unfinished research question");
    await expect(input).toBeFocused();
    const chosenQuestion = await input.inputValue();
    const chosenURL = page.url();
    if (path === "/") {
      await selectText(
        page,
        page.getByRole("link", { name: "start from scratch" }).locator("span"),
      );
    } else {
      await expect(
        page.getByRole("link", { name: "start from scratch" }),
      ).toHaveCount(0);
    }
    await expect(page).toHaveURL(chosenURL);
    await expect(input).toHaveValue(chosenQuestion);
    await expect(
      page.getByRole("button", { name: "Undo suggestion", exact: true }),
    ).toHaveCount(0);
    await input.fill("An intentional edit after choosing");
    await page.reload();
    await expect(input).toHaveValue("An intentional edit after choosing");
    expect(submissions).toBe(0);
  });
}

test("retrying provider availability never submits the message form", async ({
  page,
}) => {
  let checks = 0;
  let submissions = 0;
  await page.route("**/api/settings", (route) => {
    checks++;
    return route.fulfill({
      status: 503,
      json: { detail: "Provider check unavailable" },
    });
  });
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/chats"))
      submissions++;
  });
  await page.goto("/assistant");
  const form = page.getByRole("form", { name: "Assistant composer" });
  const input = page.getByLabel("Message Assistant", { exact: true });
  await input.fill("Keep this question until I send it");
  await expect(
    form.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await form.evaluate((form) => {
    form.setAttribute("data-submissions", "0");
    form.addEventListener("submit", () =>
      form.setAttribute("data-submissions", "1"),
    );
  });
  const previousChecks = checks;
  const retry = form.getByRole("button", { name: "Retry", exact: true });
  await selectText(page, retry);
  expect(checks).toBe(previousChecks);
  await retry.click();
  await expect.poll(() => checks).toBeGreaterThan(previousChecks);
  await expect(form).toHaveAttribute("data-submissions", "0");
  await expect(input).toHaveValue("Keep this question until I send it");
  expect(submissions).toBe(0);
});
