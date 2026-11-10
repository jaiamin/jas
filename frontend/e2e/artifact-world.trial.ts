import { expect, test } from "@playwright/test";

test("solo artifact configuration preserves its draft and immutable saved rules", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/new?template=artifact_workspace");
  await page.getByRole("tab", { name: "Conditions", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Communication channels", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Maximum artifact writes", { exact: true }),
  ).toHaveValue("3");
  await page.getByLabel("Maximum artifact writes", { exact: true }).fill("2");
  await page.getByLabel("Measurement · reading", { exact: true }).fill("23");
  await page.reload();
  await page.getByRole("tab", { name: "Conditions", exact: true }).click();
  await expect(
    page.getByLabel("Maximum artifact writes", { exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByLabel("Measurement · reading", { exact: true }),
  ).toHaveValue("23");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await expect(page.getByLabel("Experiment review")).toContainText("2 writes");
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/studies\//);
  const id = page.url().split("/").at(-1);
  const study = await (await request.get(`/api/studies/${id}`)).json();
  expect(study.design.profiles).toHaveLength(1);
  expect(study.design.conditions[0].parameters.artifacts.write_limit).toBe(2);
  expect(
    study.design.conditions[0].parameters.artifacts.objects[0].content.reading,
  ).toBe(23);
  expect(study.usage.requests).toBe(0);
  await testInfo.attach("saved-solo-study", {
    body: JSON.stringify(study, null, 2),
    contentType: "application/json",
  });
});

test("solo work exposes versions, source-linked success and call-free playback/replay", async ({
  page,
  request,
}, testInfo) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const design = catalog.templates.find(
    (item: { id: string }) => item.id === "artifact_workspace",
  ).design;
  const created = await (
    await request.post("/api/studies", { data: { design } })
  ).json();
  const study = await (await request.get(`/api/studies/${created.id}`)).json();
  const runId = study.runs[0].id;
  await page.goto(`/runs/${runId}?tab=live`);
  await expect(
    page.getByRole("heading", { name: "Artifact workspace", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/runs/${runId}`)).json()).state.outcome
          ?.status,
    )
    .toBe("success");
  await expect(
    page.getByText("Submission passed", { exact: true }),
  ).toBeVisible();
  const report = page.getByRole("region", { name: "Report versions" });
  await expect(report).toContainText("Version 2");
  await expect(report).toContainText("measurement v1");
  await report
    .getByRole("link", { name: "Inspect turn 2", exact: true })
    .click();
  await expect(page).toHaveURL(/tab=decisions.*turn=2/);
  await expect(
    page.getByRole("heading", { name: "Turn 2 evidence", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Environment", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Artifact workspace", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("artifact-workspace-success.png"),
    fullPage: true,
  });
  const before = (await (await request.get(`/api/runs/${runId}`)).json())
    .summary.usage;
  await page
    .getByRole("slider", { name: "Recorded turn", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await expect(page).toHaveURL(/turn=0/);
  await page.getByRole("tab", { name: "Environment", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Report versions" }),
  ).not.toContainText("Version 2");
  await page.getByRole("tab", { name: "Record", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify exact replay", exact: true })
    .click();
  await expect(
    page.getByText("4 turns verified locally. No model calls."),
  ).toBeVisible();
  const run = await (await request.get(`/api/runs/${runId}`)).json();
  expect(run.summary.usage).toEqual(before);
  await testInfo.attach("solo-success-record", {
    body: JSON.stringify(run, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({
    path: testInfo.outputPath("artifact-success.png"),
    fullPage: true,
  });
});

for (const scenario of ["failure", "recover"] as const) {
  for (const harness of ["direct_action", "tool_using"] as const) {
    test(`artifact ${scenario} remains inspectable with explicit recovery · ${harness}`, async ({
      page,
      request,
    }, testInfo) => {
      const catalog = await (await request.get("/api/catalog")).json();
      const design = catalog.templates.find(
        (item: { id: string }) => item.id === "artifact_workspace",
      ).design;
      design.profiles[0].goal = `[t09-browser-${scenario}-${harness}] Inspect evidence before submitting work.`;
      design.conditions[0].harness =
        harness === "direct_action"
          ? { kind: harness }
          : {
              kind: harness,
              tools: ["observe", "read_artifact"],
              max_requests: 3,
              max_tool_operations: 2,
            };
      await page.addInitScript(
        (theme) => localStorage.setItem("jas-theme", theme),
        harness === "tool_using" ? "dark" : "light",
      );
      await page.setViewportSize({
        width: harness === "tool_using" ? 390 : 1440,
        height: 900,
      });
      const created = await (
        await request.post("/api/studies", { data: { design } })
      ).json();
      const study = await (
        await request.get(`/api/studies/${created.id}`)
      ).json();
      const runId = study.runs[0].id;
      await page.goto(`/runs/${runId}?tab=live`);
      await page.getByRole("button", { name: "Run", exact: true }).click();
      if (scenario === "recover") {
        await expect(
          page.getByText("Execution stopped safely", { exact: true }),
        ).toBeVisible();
        const rejected = await (await request.get(`/api/runs/${runId}`)).json();
        expect(rejected.summary.status).toBe("failed");
        expect(rejected.summary.turn).toBe(1);
        expect(rejected.state.writes_remaining).toBe(3);
        expect(rejected.state.artifacts.report.versions).toHaveLength(1);
        await page.reload();
        expect(
          (await (await request.get(`/api/runs/${runId}`)).json()).summary
            .usage,
        ).toEqual(rejected.summary.usage);
        await page
          .getByRole("button", { name: "Inspect requests", exact: true })
          .click();
        await expect(
          page.getByText("world_rejected", { exact: true }),
        ).toBeVisible();
        await page.getByRole("button", { name: /Activation 2/ }).click();
        await expect(page.getByText("reject", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Run", exact: true }).click();
        await expect
          .poll(
            async () =>
              (await (await request.get(`/api/runs/${runId}`)).json()).state
                .outcome?.status,
          )
          .toBe("success");
        await page
          .getByRole("tab", { name: "Environment", exact: true })
          .click();
        await expect(
          page.getByText("Submission passed", { exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByText("Submission failed", { exact: true }),
        ).toBeVisible();
      }
      const completed = await (await request.get(`/api/runs/${runId}`)).json();
      expect(completed.metrics.artifact_success).toBe(
        scenario === "failure" ? 0 : 1,
      );
      expect(completed.state.writes_remaining).toBe(2);
      await expect(
        page.getByRole("region", { name: "Report versions" }),
      ).toContainText("measurement v1");
      await page.getByRole("tab", { name: "Record", exact: true }).click();
      await page
        .getByRole("button", { name: "Verify exact replay", exact: true })
        .click();
      await expect(
        page.getByText("4 turns verified locally. No model calls."),
      ).toBeVisible();
      if (harness === "tool_using") {
        expect(
          completed.activations.some(
            (activation: { operations: { kind: string; status: string }[] }) =>
              activation.operations.some(
                (operation) =>
                  operation.kind === "read_artifact" &&
                  operation.status === "complete",
              ),
          ),
        ).toBe(true);
      }
      expect(
        (await (await request.get(`/api/runs/${runId}`)).json()).summary.usage,
      ).toEqual(completed.summary.usage);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await testInfo.attach("artifact-terminal-record", {
        body: JSON.stringify(completed, null, 2),
        contentType: "application/json",
      });
      await page.getByRole("tab", { name: "Environment", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Artifact workspace", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${scenario}-${harness}.png`),
        fullPage: true,
      });
    });
  }
}
