import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const question =
  "Design an exploratory one-agent study of how a records assistant investigates conflicting authorized folios, revises a persistent report, and decides when to submit or stop. Keep unsuccessful and unverified work; do not invent a primary scalar endpoint.";

for (const [theme, width] of [
  ["light", 1440],
  ["dark", 390],
] as const) {
  test(`real question, pending proposal, review, draft edit and call-free save · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize({ width, height: 900 });
    // Only UI readiness is simulated. All questions, SSE, tools, checks and saves use HTTP.
    await page.route("**/api/settings", async (route) => {
      const response = await route.fetch();
      const settings = await response.json();
      await route.fulfill({
        response,
        json: { ...settings, providers: { openai: true, anthropic: false } },
      });
    });
    await page.goto("/agent");
    const posted = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/chats") &&
        response.request().method() === "POST",
    );
    await page.getByLabel("Message Agent", { exact: true }).fill(question);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const identity = await (await posted).json();
    await expect(page).toHaveURL(new RegExp(`chat=${identity.chat_id}`));
    await expect(
      page.getByRole("button", { name: "Send message", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("link", { name: "Review protocol", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Review protocol", exact: true }),
    ).toBeVisible();
    const rows = await (
      await request.get(`/api/chats/${identity.chat_id}`)
    ).json();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    const proposalPath = testInfo.outputPath("reviewed-proposal.json");
    await writeFile(proposalPath, JSON.stringify(row, null, 2));
    await testInfo.attach("reviewed-proposal", {
      path: proposalPath,
      contentType: "application/json",
    });
    expect(row.id).toBe(identity.id);
    expect(row.question).toBe(question);
    expect(row.output.design.profiles).toHaveLength(1);
    expect(row.output.design.hypothesis).toBe("");
    const probe = row.output.research.operations.find(
      (operation: { request: { source?: { kind: string } } }) =>
        operation.request.source?.kind === "candidate",
    );
    expect(probe.status).toBe("complete");
    expect(probe.data.next_observation.last_result.content).toEqual({
      reading: 37,
    });
    await page
      .getByRole("button", { name: "Protocol reviewed", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Study scope", exact: true })
      .click();
    await expect(
      page.getByText("Exploratory design", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Recorded activity")).toContainText(
      "Probing a copied world",
    );
    await page.screenshot({
      path: testInfo.outputPath("activity.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Review protocol", exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "Review", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.getByText("Protocol notes", { exact: true }).click();
    await expect(
      page.getByText("Exploratory design", { exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Conditions", exact: true }).click();
    await page.getByLabel("Maximum artifact writes", { exact: true }).fill("3");
    await page.reload();
    await page.getByRole("tab", { name: "Conditions", exact: true }).click();
    await expect(
      page.getByLabel("Maximum artifact writes", { exact: true }),
    ).toHaveValue("3");
    await page.getByRole("tab", { name: "Question", exact: true }).click();
    await expect(
      page.getByLabel("Research question", { exact: true }),
    ).toHaveValue(question);
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await page
      .getByRole("button", { name: "Check experiment", exact: true })
      .click();
    await page.getByRole("button", { name: /Review \d+ findings/ }).click();
    await expect(
      page.getByText(/semantic fit to the question was not re-reviewed/),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("review.png"),
      fullPage: true,
    });
    const before = await (await request.get("/api/settings")).json();
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/studies\//);
    const sid = new URL(page.url()).pathname.split("/").at(-1);
    const exported = await (
      await request.get(`/api/studies/${sid}/export`)
    ).json();
    const after = await (await request.get("/api/settings")).json();
    expect(after.usage.requests).toBe(before.usage.requests);
    expect(exported.study.plan_id).toBe(identity.id);
    expect(
      exported.study.design.conditions[0].parameters.artifacts.write_limit,
    ).toBe(3);
    expect(exported.study.design.environment_source).toEqual(
      row.output.design.environment_source,
    );
    expect(exported.runs).toHaveLength(1);
    expect(exported.runs[0].record.summary.status).toBe("ready");
    expect(exported.runs[0].record.summary.turn).toBe(0);
    expect(
      exported.requests.every(
        (call: { run_id: string | null }) => call.run_id === null,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    const exportPath = testInfo.outputPath("proposal-revisions-export.json");
    await writeFile(exportPath, JSON.stringify({ row, exported }, null, 2));
    await testInfo.attach("proposal-revisions-export", {
      path: exportPath,
      contentType: "application/json",
    });
  });
}

test("review clarification is visible and continues in the same chat", async ({
  page,
  request,
}) => {
  const studiesBefore = await (await request.get("/api/studies")).json();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch();
    const settings = await response.json();
    await route.fulfill({
      response,
      json: { ...settings, providers: { openai: true, anthropic: false } },
    });
  });
  await page.goto("/agent");
  await page
    .getByLabel("Message Agent", { exact: true })
    .fill(`${question} [review-budget-choice]`);
  const posted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/chats") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const identity = await (await posted).json();
  await expect(
    page.getByText("Do you accept a shared experiment-wide ceiling?", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Request stopped", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Review protocol", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Do you accept a shared experiment-wide ceiling?", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Message Agent", { exact: true })
    .fill("Yes, use the shared experiment-wide ceiling.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Review protocol", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`chat=${identity.chat_id}`));
  const rows = await (
    await request.get(`/api/chats/${identity.chat_id}`)
  ).json();
  expect(rows.map((row: { status: string }) => row.status)).toEqual([
    "complete",
    "complete",
  ]);
  expect(await (await request.get("/api/studies")).json()).toEqual(
    studiesBefore,
  );
  expect(errors).toEqual([]);
});
