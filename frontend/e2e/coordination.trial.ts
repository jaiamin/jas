import { expect, test } from "@playwright/test";

test("switching a solo draft creates three bound participants without losing the investigator", async ({
  page,
  request,
}) => {
  await page.goto("/new?template=artifact_workspace");
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Distributed information", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change environment", exact: true })
    .click();
  await page.getByRole("tab", { name: "Agents", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add agent", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\//);
  const study = await (
    await request.get(`/api/studies/${page.url().split("/").at(-1)}`)
  ).json();
  expect(study.design.profiles).toHaveLength(3);
  expect(study.design.profiles[0].key).toBe("investigator");
  expect(study.design.conditions[0].parameters.coordination.turn_order).toEqual(
    ["investigator", "agent-2", "agent-3"],
  );
  expect(study.usage.requests).toBe(0);
});

test("settled personal abstention stays distinct from pending choices", async ({
  page,
  request,
}, testInfo) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = catalog.templates.find(
    (t: { id: string }) => t.id === "distributed_coordination",
  ).design;
  design.conditions = design.conditions.slice(0, 1);
  design.conditions[0].parameters.coordination.timing = "sequential";
  design.profiles[0].goal = "[t10-browser-abstain] Abstain personally.";
  const created = await (
    await request.post("/api/studies", { data: { design } })
  ).json();
  const study = await (await request.get(`/api/studies/${created.id}`)).json();
  const runId = study.runs[0].id;
  await page.goto(`/runs/${runId}?tab=live`);
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/runs/${runId}`)).json()).summary.turn,
    )
    .toBe(1);
  const run = await (await request.get(`/api/runs/${runId}`)).json();
  expect(run.state.choices).toEqual({ iris: null });
  expect(run.state.done).toBe(false);
  expect(run.state.outcome).toBeNull();
  const choices = page.getByLabel("Coordination choices");
  await expect(
    choices.getByRole("row").filter({ hasText: "Iris" }),
  ).toContainText("Abstained");
  await expect(
    choices.getByRole("row").filter({ hasText: "Moss" }),
  ).toContainText("Pending");
  await testInfo.attach("partial-abstention-record", {
    body: JSON.stringify(run),
    contentType: "application/json",
  });
});

test("coordination timing and topology edits survive reload and review", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/new?template=distributed_coordination");
  await page.getByRole("tab", { name: "Conditions", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Logical timing" }).first(),
  ).toContainText("Phased simultaneous");
  await page.getByLabel("Message delay in logical ticks").first().fill("3");
  await page.reload();
  await page.getByRole("tab", { name: "Conditions", exact: true }).click();
  await expect(
    page.getByLabel("Message delay in logical ticks").first(),
  ).toHaveValue("3");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await expect(page.getByLabel("Experiment review")).toContainText(
    "3 logical ticks",
  );
  await expect(page.getByLabel("Experiment review")).toContainText(
    "moss → vale → iris",
  );
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\//);
  const study = await (
    await request.get(`/api/studies/${page.url().split("/").at(-1)}`)
  ).json();
  expect(
    study.design.conditions[0].parameters.coordination.delivery_delay,
  ).toBe(3);
  expect(study.usage.requests).toBe(0);
  await testInfo.attach("saved-coordination-study", {
    body: JSON.stringify(study),
    contentType: "application/json",
  });
});

for (const variant of [
  { width: 1440, theme: "light" },
  { width: 390, theme: "dark" },
]) {
  test(`coordination trajectory, mail and replay · ${variant.theme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("jas-theme", theme),
      variant.theme,
    );
    await page.setViewportSize({ width: variant.width, height: 900 });
    const catalog = await (await request.get("/api/catalog")).json();
    const design = catalog.templates.find(
      (t: { id: string }) => t.id === "distributed_coordination",
    ).design;
    design.conditions = design.conditions.slice(0, 1);
    const created = await (
      await request.post("/api/studies", { data: { design } })
    ).json();
    const study = await (
      await request.get(`/api/studies/${created.id}`)
    ).json();
    const runId = study.runs[0].id;
    await page.goto(`/runs/${runId}?tab=live`);
    await expect(
      page.getByRole("heading", {
        name: "Coordination trajectory",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${runId}`)).json()).summary
            .status,
      )
      .toBe("complete");
    await expect(
      page.getByText("Choices differ or include abstention", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Coordination choices")).toContainText("24");
    await page.screenshot({
      path: testInfo.outputPath("coordination-trajectory.png"),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Record", exact: true }).click();
    await page
      .getByRole("button", { name: "Verify exact replay", exact: true })
      .click();
    await expect(
      page.getByText("9 turns verified locally. No model calls."),
    ).toBeVisible();
    const run = await (await request.get(`/api/runs/${runId}`)).json();
    expect(run.state.outcome.payoffs).toEqual({ iris: 9, moss: 8, vale: 7 });
    expect(run.state.inboxes.moss[0].text).toBe("browser-private-cedar");
    expect(run.state.inboxes.vale).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await testInfo.attach("coordination-record", {
      body: JSON.stringify(run),
      contentType: "application/json",
    });
  });
}
