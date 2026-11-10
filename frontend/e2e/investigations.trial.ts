import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("explicit scope completes through HTTP and reload without resubmission", async ({
  page,
  request,
}, testInfo) => {
  const question =
    "T14 DEVELOPMENT: describe one actor stopping in an artifact workspace.";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let submissions = 0;
  page.on("request", (sent) => {
    if (sent.url().endsWith("/api/investigations") && sent.method() === "POST")
      submissions += 1;
  });
  // UI readiness only: the fixed Sol investigation remains available when ordinary
  // chat's configured Anthropic provider is unavailable. All work uses real HTTP.
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch();
    const settings = await response.json();
    await route.fulfill({
      response,
      json: {
        ...settings,
        assistant_model: "anthropic:claude-haiku-4-5",
        providers: { openai: true, anthropic: false },
      },
    });
  });
  await page.goto("/agent");
  await page.getByLabel("Message Agent", { exact: true }).fill(question);
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  const investigate = page.getByRole("button", {
    name: "Investigate",
    exact: true,
  });
  await expect(investigate).toBeEnabled();
  await investigate.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Authorize investigation" });
  await expect(dialog).toContainText("GPT-6.1 Sol");
  await expect(dialog).toContainText("GPT-6 Luna");
  await dialog.getByLabel("Runs, including pilots", { exact: true }).fill("1");
  await dialog.getByLabel("Participant turns", { exact: true }).fill("1");
  await dialog.getByLabel("Rounds per run", { exact: true }).fill("1");
  await page.keyboard.press("Escape");
  await expect(investigate).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Message Agent", { exact: true })).toHaveValue(
    question,
  );
  await investigate.click();
  await expect(
    dialog.getByLabel("Participant turns", { exact: true }),
  ).toHaveValue("1");
  expect(submissions).toBe(0);
  const posted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/investigations") &&
      response.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Investigate · up to $1", exact: true })
    .click();
  const identity = await (await posted).json();
  await expect(page).toHaveURL(new RegExp(`chat=${identity.chat_id}`));
  await expect(
    page.getByRole("region", { name: "Investigation progress" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(
      "1 of 1 planned runs completed; 0 failed, 0 missing complete outcomes. Stopped: bounded_work_complete.",
      { exact: true },
    ),
  ).toBeVisible();
  const record = await (
    await request.get(`/api/investigations/${identity.id}`)
  ).json();
  expect(record.status).toBe("complete");
  await page
    .getByRole("button", { name: "Limitations & uncertainty", exact: true })
    .click();
  await expect(
    page.getByText(
      /small samples do not establish population or causal effects/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Completion does not certify intelligence or research validity/,
    ),
  ).toBeVisible();
  expect(record.requests).toBe(5);
  expect(record.result.research_validity).toBe("unassessed");
  expect(record.authorization.max_turns).toBe(1);
  expect(
    record.ledger.filter(
      (call: { purpose: string }) => call.purpose === "decision",
    ),
  ).toHaveLength(1);
  expect(submissions).toBe(1);
  await expect(
    page.getByRole("link", { name: "Inspect latest retained interpretation" }),
  ).toBeVisible();
  const evidence = testInfo.outputPath("investigation.json");
  await writeFile(evidence, JSON.stringify(record, null, 2));
  await testInfo.attach("public-investigation", {
    path: evidence,
    contentType: "application/json",
  });
  await page.screenshot({
    path: testInfo.outputPath("complete.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("mobile pause, reconnect and cancellation preserve the in-flight accounting", async ({
  page,
  request,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("jas-theme", "dark"));
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        providers: { openai: true, anthropic: false },
      },
    });
  });
  async function begin(question: string) {
    await page.goto(`/agent?new=${crypto.randomUUID()}`);
    await page.getByLabel("Message Agent", { exact: true }).fill(question);
    await page
      .getByRole("button", { name: "Investigate", exact: true })
      .click();
    const posted = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/investigations") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Investigate · up to $1", exact: true })
      .click();
    const identity = await (await posted).json();
    await expect(page).toHaveURL(new RegExp(`chat=${identity.chat_id}`));
    try {
      await expect
        .poll(
          async () =>
            (
              await (
                await request.get(`/api/investigations/${identity.id}`)
              ).json()
            ).requests,
        )
        .toBe(4);
    } finally {
      await writeFile(
        testInfo.outputPath(`${identity.id}.json`),
        JSON.stringify(
          await (
            await request.get(`/api/investigations/${identity.id}`)
          ).json(),
          null,
          2,
        ),
      );
    }
    return identity;
  }
  const paused = await begin(
    "T14 mobile: describe one fixed stop trajectory in an artifact workspace.",
  );
  await page
    .getByRole("button", { name: "Pause investigation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume investigation", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume investigation", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Thinking", { exact: true })).toHaveCount(0);
  const checkpoint = await (
    await request.get(`/api/investigations/${paused.id}`)
  ).json();
  expect(checkpoint.requests).toBe(4);
  expect(checkpoint.turns).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-paused.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Resume investigation", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Inspect latest retained interpretation" }),
  ).toBeVisible();
  expect(
    (await (await request.get(`/api/investigations/${paused.id}`)).json())
      .requests,
  ).toBe(5);

  const cancelled = await begin(
    "T14 mobile cancellation: retain interrupted usage in an artifact workspace.",
  );
  await page
    .getByRole("button", { name: "Cancel investigation", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`/api/investigations/${cancelled.id}`)
          ).json()
        ).status,
    )
    .toBe("cancelled");
  await page.reload();
  const record = await (
    await request.get(`/api/investigations/${cancelled.id}`)
  ).json();
  expect(record.requests).toBe(4);
  expect(record.usage.partial).toBe(true);
  expect(
    record.ledger.filter(
      (call: { status: string }) => call.status === "unknown",
    ),
  ).toHaveLength(1);
  await expect(
    page.getByRole("region", { name: "Investigation progress" }),
  ).toContainText("unknown usage retains its reservation");
  await expect(
    page.getByRole("button", { name: "Resume investigation", exact: true }),
  ).toHaveCount(0);
  await writeFile(
    testInfo.outputPath("cancelled.json"),
    JSON.stringify(record, null, 2),
  );
});

test("explicit exploratory repair retains the failed attempt and its draft across reload", async ({
  page,
  request,
}, testInfo) => {
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        providers: { openai: true, anthropic: false },
      },
    });
  });
  await page.goto("/agent");
  await page
    .getByLabel("Message Agent", { exact: true })
    .fill(
      "T14 [repair]: describe the retained stop trajectory in an artifact workspace.",
    );
  await page.getByRole("button", { name: "Investigate", exact: true }).click();
  const posted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/investigations") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Investigate · up to $1", exact: true })
    .click();
  const identity = await (await posted).json();
  const instruction = page.getByLabel("Adaptation instruction", {
    exact: true,
  });
  await expect(instruction).toBeVisible();
  const before = await (
    await request.get(`/api/investigations/${identity.id}`)
  ).json();
  expect(before.result.failed).toBe(1);
  expect(before.ledger.at(-1).status).toBe("unknown");
  await instruction.fill(
    "Retain the failed run and use the same authorized artifact protocol.",
  );
  await page.reload();
  await expect(instruction).toHaveValue(
    "Retain the failed run and use the same authorized artifact protocol.",
  );
  await page
    .getByRole("button", {
      name: "Adapt within remaining allowance",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "1 of 2 planned runs completed; 1 failed, 1 missing complete outcomes. Stopped: bounded_work_complete.",
      { exact: true },
    ),
  ).toBeVisible();
  const after = await (
    await request.get(`/api/investigations/${identity.id}`)
  ).json();
  expect(after.attempts[0]).toEqual(before.attempts[0]);
  expect(after.authorization).toEqual(before.authorization);
  expect(
    after.attempts.map((attempt: { revision: number }) => attempt.revision),
  ).toEqual([1, 2]);
  expect(after.requests).toBe(9);
  await writeFile(
    testInfo.outputPath("repair-before.json"),
    JSON.stringify(before, null, 2),
  );
  await writeFile(
    testInfo.outputPath("repair-after.json"),
    JSON.stringify(after, null, 2),
  );
});

test("confirmation is frozen visibly before trials after a retained pilot", async ({
  page,
  request,
}, testInfo) => {
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        providers: { openai: true, anthropic: false },
      },
    });
  });
  await page.goto("/agent");
  await page
    .getByLabel("Message Agent", { exact: true })
    .fill(
      "T14 confirmatory: record an explicit stop in an artifact workspace.",
    );
  await page.getByRole("button", { name: "Investigate", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Investigation intent", exact: true })
    .click();
  await page
    .getByRole("option", {
      name: "Confirmatory · freeze before trials",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Include an exploratory pilot revision",
      exact: true,
    })
    .check();
  const posted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/investigations") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Investigate · up to $1", exact: true })
    .click();
  const identity = await (await posted).json();
  await expect(
    page.getByText("Confirmation frozen before trials · revision 2.", {
      exact: false,
    }),
  ).toBeVisible();
  const during = await (
    await request.get(`/api/investigations/${identity.id}`)
  ).json();
  expect(during.status).toBe("running");
  expect(during.confirmation.revision).toBe(2);
  expect(during.attempts[0].kind).toBe("pilot");
  expect(during.attempts[0].status).toBe("complete");
  expect(during.confirmation.design.hypothesis).toBe(
    "Record whether the actor explicitly stops.",
  );
  await expect(
    page.getByRole("link", { name: "Inspect latest retained interpretation" }),
  ).toBeVisible();
  const after = await (
    await request.get(`/api/investigations/${identity.id}`)
  ).json();
  expect(after.confirmation).toEqual(during.confirmation);
  expect(after.result.complete).toBe(2);
  expect(after.requests).toBe(6);
  await expect(
    page.getByLabel("Adaptation instruction", { exact: true }),
  ).toHaveCount(0);
  await writeFile(
    testInfo.outputPath("frozen-before-trial-completion.json"),
    JSON.stringify(during, null, 2),
  );
  await writeFile(
    testInfo.outputPath("confirmation-complete.json"),
    JSON.stringify(after, null, 2),
  );
});

test("authorization error keeps the draft and late acceptance cannot replace a new chat", async ({
  page,
  request,
}) => {
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        providers: { openai: true, anthropic: false },
      },
    });
  });
  const original = await (
    await request.post("/api/chats", {
      data: { question: "A general development greeting", context: "general" },
    })
  ).json();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/chats/${original.chat_id}`)).json())[0]
          .status,
    )
    .toBe("complete");
  const runsBefore = await (await request.get("/api/runs")).json();
  let reject = true;
  let accepted: { id: string; chat_id: string } | null = null;
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/investigations", async (route) => {
    if (reject)
      return route.fulfill({
        status: 503,
        json: { detail: "Development authorization unavailable" },
      });
    const response = await route.fetch();
    accepted = await response.json();
    await pending;
    await route.fulfill({ response });
  });
  await page.goto(`/agent?chat=${original.chat_id}`);
  const input = page.getByLabel("Message Agent", { exact: true });
  const question =
    "T14 late response: describe a stop in an artifact workspace.";
  await input.fill(question);
  await page.getByRole("button", { name: "Investigate", exact: true }).click();
  const submit = page.getByRole("button", {
    name: "Investigate · up to $1",
    exact: true,
  });
  await submit.click();
  await expect(page.getByRole("dialog")).toContainText(
    "Development authorization unavailable",
  );
  expect(await (await request.get("/api/runs")).json()).toEqual(runsBefore);
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue(question);
  reject = false;
  await page.getByRole("button", { name: "Investigate", exact: true }).click();
  await submit.click();
  await expect.poll(() => accepted).not.toBeNull();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(page).toHaveURL(/\/agent\?new=/);
  await input.fill("Keep this separate new question draft");
  const chosenURL = page.url();
  release();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => sessionStorage.getItem(key),
        `jas:agent-draft:${original.chat_id}`,
      ),
    )
    .toBeNull();
  await expect(page).toHaveURL(chosenURL);
  await expect(input).toHaveValue("Keep this separate new question draft");
  await page.getByRole("link", { name: "Experiments", exact: true }).click();
  const saved = await (
    await request.get(`/api/chats/${original.chat_id}`)
  ).json();
  const investigationId = saved.find(
    (row: { purpose: string }) => row.purpose === "investigation",
  ).id;
  let releaseRead = () => {};
  const readPending = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  await page.route(
    `**/api/investigations/${investigationId}`,
    async (route) => {
      await readPending;
      await route.continue();
    },
  );
  await page.goto(`/agent?chat=${original.chat_id}`);
  await expect(
    page.getByRole("status", { name: "Loading investigation", exact: true }),
  ).toBeVisible();
  releaseRead();
  await expect(
    page.getByRole("link", { name: "Inspect latest retained interpretation" }),
  ).toBeVisible();
  const rows = await (
    await request.get(`/api/chats/${original.chat_id}`)
  ).json();
  expect(
    rows.filter((row: { purpose: string }) => row.purpose === "investigation"),
  ).toHaveLength(1);
});
