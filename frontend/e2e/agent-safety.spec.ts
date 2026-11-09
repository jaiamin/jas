import { expect, test } from "@playwright/test";
import { selectText } from "./helpers.js";

for (const destination of ["experiments", "new chat"]) {
  test(`a delayed Agent submission preserves navigation to ${destination}`, async ({
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
      route.fulfill({ json: [] }),
    );
    await page.goto("/agent");
    const input = page.getByLabel("Message Agent", { exact: true });
    await input.fill("Original question");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect.poll(() => submitted).toBe(true);
    if (destination === "experiments") {
      await page
        .getByRole("link", { name: "Experiments", exact: true })
        .click();
      await expect(page).toHaveURL(/\/studies$/);
    } else {
      await page.getByRole("button", { name: "New chat", exact: true }).click();
      await expect(page).toHaveURL(/\/agent\?new=/);
      await input.fill("Keep this new draft");
    }
    const chosenURL = page.url();
    release();
    await expect
      .poll(() =>
        page.evaluate(() => sessionStorage.getItem("jas:agent-draft:new")),
      )
      .toBeNull();
    await expect(page).toHaveURL(chosenURL);
    if (destination === "new chat") {
      await expect(input).toHaveValue("Keep this new draft");
      await expect(
        page.getByRole("navigation", { name: "Past chats" }),
      ).toContainText("Original question");
    } else {
      await page.getByRole("link", { name: "Agent", exact: true }).click();
      await expect(
        page.getByRole("navigation", { name: "Past chats" }),
      ).toContainText("Original question");
    }
  });
}

for (const path of ["/", "/agent"]) {
  test(`suggestion text can be selected without changing the composer · ${path}`, async ({
    page,
  }) => {
    let submissions = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/chats"))
        submissions++;
    });
    await page.goto(path);
    const input = page.getByLabel("Message Agent", { exact: true });
    await input.fill("My unfinished research question");
    const suggestions = page.getByRole("region", {
      name: path === "/" ? "Experiment ideas" : "Suggested questions",
    });
    await expect(suggestions.getByRole("button")).toHaveCount(4);
    const first = suggestions.getByRole("button").first();
    const text = first.locator("span").last();
    await selectText(page, text);
    await expect(input).toHaveValue("My unfinished research question");
    await first.focus();
    await first.press("Enter");
    await expect(input).not.toHaveValue("My unfinished research question");
    await expect(input).toBeFocused();
    const chosenQuestion = await input.inputValue();
    const chosenURL = page.url();
    await selectText(
      page,
      page.getByRole("link", { name: "start from scratch" }).locator("span"),
    );
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
  await page.goto("/agent");
  const form = page.getByRole("form", { name: "Agent composer" });
  const input = page.getByLabel("Message Agent", { exact: true });
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
