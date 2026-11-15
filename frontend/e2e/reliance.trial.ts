import { expect, test } from "@playwright/test";
import { selectEditorSection } from "./helpers.js";

test("switching a solo draft binds four participants and preserves its investigator", async ({
  page,
  request,
}) => {
  await page.goto("/new?template=artifact_workspace");
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Reliance and commitments", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change environment", exact: true })
    .click();
  await selectEditorSection(page, "Agents");
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
  expect(study.design.profiles.map((p: { key: string }) => p.key)).toEqual([
    "investigator",
    "agent-2",
    "agent-3",
    "agent-4",
  ]);
  expect(
    study.design.conditions[0].parameters.commitments.opportunities,
  ).toHaveLength(4);
  expect(study.usage.requests).toBe(0);
});

for (const variant of [
  { width: 1280, theme: "light" },
  { width: 390, theme: "dark" },
]) {
  test(`public four-participant review/run/evidence path ${variant.width} ${variant.theme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("jas-theme", theme),
      variant.theme,
    );
    await page.setViewportSize({ width: variant.width, height: 900 });
    await page.goto("/new?template=reliance_commitments");
    await selectEditorSection(page, "Conditions");
    await page.getByLabel("promise_1 deadline", { exact: true }).fill("4");
    await page
      .getByLabel("promise_1 fulfilled effect", { exact: true })
      .fill("13");
    await page
      .getByLabel("promise_3 unfulfilled effect", { exact: true })
      .fill("-11");
    await page
      .getByLabel("promise_3 unfulfilled effect", { exact: true })
      .press("Tab");
    await page.reload();
    await selectEditorSection(page, "Conditions");
    await expect(
      page.getByLabel("promise_1 deadline", { exact: true }),
    ).toHaveValue("4");
    await page
      .getByRole("combobox", { name: "Activation order", exact: true })
      .click();
    await expect(page.getByRole("option")).toHaveCount(24);
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Experiment review")).toContainText(
      "opening 2, deadline 4",
    );
    await expect(page.getByLabel("Experiment review")).toContainText(
      "fulfilled 13, otherwise -5",
    );
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/experiments\//);
    const sid = page.url().split("/").at(-1);
    const study = await (await request.get(`/api/studies/${sid}`)).json();
    expect(study.usage.requests).toBe(0);
    const rid = study.runs[0].id;
    await page.goto(`/runs/${rid}?tab=live`);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${rid}`)).json()).summary.status,
      )
      .toBe("complete");
    const trajectory = page.getByLabel("Commitment trajectory");
    await expect(
      trajectory.getByRole("row", { name: /promise_1/ }),
    ).toContainText("Recipient effect: 13");
    await expect(
      trajectory.getByRole("row", { name: /promise_3/ }),
    ).toContainText("Recipient effect: -11");
    await expect(page.getByLabel("Coordination choices")).toContainText("22");
    await expect(
      page.getByLabel("Addressed delivery history").getByRole("cell", {
        name: "t11-private-after-consequence",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("reliance-trajectory.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const run = await (await request.get(`/api/runs/${rid}`)).json();
    expect(run.state.outcome.payoffs).toEqual({
      iris: 10,
      moss: 19,
      vale: 0,
      nova: -7,
    });
    expect(run.state.read_grants).toEqual({
      sealed_moss: ["iris"],
      sealed_vale: ["moss"],
      sealed_nova: ["vale"],
      sealed_iris: ["nova"],
    });
    expect(run.turns).toHaveLength(28);
    expect(run.requests).toHaveLength(28);
    await trajectory
      .getByRole("row", { name: /promise_1/ })
      .getByRole("link", {
        name: "Turn 16 · Reliance consequence",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/tab=decisions&turn=16/);
    await expect(
      page.getByRole("heading", { name: "Turn 16 evidence", exact: true }),
    ).toBeVisible();
    const requestsBefore = (await (await request.get("/api/settings")).json())
      .usage.requests;
    await page.getByRole("tab", { name: "Record", exact: true }).click();
    await page
      .getByRole("button", { name: "Verify exact replay", exact: true })
      .click();
    await expect(
      page.getByText("28 turns verified locally. No model calls."),
    ).toBeVisible();
    expect(
      (await (await request.get("/api/settings")).json()).usage.requests,
    ).toBe(requestsBefore);
    const exported = await (
      await request.get(`/api/studies/${sid}/export`)
    ).json();
    expect(exported.version).toBe(20);
    expect(exported.runs[0].record.state.outcome.payoffs).toEqual({
      iris: 10,
      moss: 19,
      vale: 0,
      nova: -7,
    });
    await testInfo.attach("public-reliance-record", {
      body: JSON.stringify({ study, run, exported }),
      contentType: "application/json",
    });
  });
}

for (const mode of ["unresolved", "disabled"] as const) {
  test(`null trajectory remains inspectable: ${mode}`, async ({
    page,
    request,
  }) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = catalog.templates.find(
      (t: { id: string }) => t.id === "reliance_commitments",
    ).design;
    design.rounds = 2;
    if (mode === "disabled")
      design.conditions[0].parameters.communication_channels = [
        "messages",
        "reports",
      ];
    const created = await (
      await request.post("/api/studies", { data: { design } })
    ).json();
    const study = await (
      await request.get(`/api/studies/${created.id}`)
    ).json();
    const rid = study.runs[0].id;
    await page.goto(`/runs/${rid}?tab=live`);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/runs/${rid}`)).json()).summary.status,
      )
      .toBe("complete");
    await expect(
      page
        .getByLabel("Commitment trajectory")
        .getByRole("row", { name: /promise_1/ }),
    ).toContainText(mode === "unresolved" ? "Unresolved" : "No promise");
    const run = await (await request.get(`/api/runs/${rid}`)).json();
    expect(run.measurements).toContainEqual(
      expect.objectContaining({
        key: "reliance_fulfillment",
        value: null,
        denominator: 0,
      }),
    );
    expect(run.state.reliance_effects).toEqual({
      iris: 0,
      moss: 0,
      vale: 0,
      nova: 0,
    });
    if (mode === "disabled") {
      expect(run.state.commitments).toEqual({});
      expect(run.state.read_grants).toEqual({});
    }
  });
}
