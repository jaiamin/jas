import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`contextual investigation, evidence and retry · ${theme}`, async ({
    page,
    request,
  }) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const { id } = await (
      await request.post("/api/studies", {
        data: {
          design: {
            ...catalog.templates[0].design,
            title:
              "Cooperation, incentives and communication across changing resource constraints",
          },
        },
      })
    ).json();
    await request.post(`/api/studies/${id}/revisions`, {
      data: { design: catalog.templates[0].design },
    });
    const study = await (await request.get(`/api/studies/${id}`)).json();
    const run = study.runs[0];
    let history: object[] = [];
    let submitted: { run_id?: string; study_id?: string; question?: string } =
      {};
    await page.route("**/api/analyses?**", (route) =>
      route.fulfill({ json: history }),
    );
    await page.route("**/api/analyses", async (route) => {
      if (route.request().method() !== "POST")
        return route.fulfill({ json: [] });
      submitted = route.request().postDataJSON();
      history = [
        {
          id: "qa-analysis",
          question: submitted.question,
          status: "pending",
          output: {
            stage: "reading",
            examined: [{ run_id: run.id, start: 1, end: 3, full_turn: false }],
          },
          cutoffs: { [run.id]: 3 },
          created: "2026-11-07T12:00:00Z",
          error: null,
        },
      ];
      return route.fulfill({ json: { id: "qa-analysis" } });
    });
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize(
      theme === "dark"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    );
    await page.goto(`/studies/${id}`);
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    if (theme === "light") {
      await expect
        .poll(async () => {
          const workspace = await page.getByRole("main").boundingBox();
          const panel = await page.getByRole("dialog").boundingBox();
          return workspace && panel
            ? workspace.x + workspace.width - panel.x
            : Number.POSITIVE_INFINITY;
        })
        .toBeLessThanOrEqual(0);
    }
    const context = page.getByRole("combobox", { name: "Agent context" });
    await expect(context).toContainText(study.design.title);
    await context.click();
    const menu = await page.getByRole("listbox").boundingBox();
    expect(menu?.x).toBeGreaterThanOrEqual(0);
    expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
    await page
      .getByRole("option", {
        name: `Rev ${run.revision} · ${run.condition} · seed ${run.seed} · rep ${run.repetition} · ${run.id.slice(0, 6)}`,
        exact: true,
      })
      .click();
    await page
      .getByRole("textbox", { name: "Your question", exact: true })
      .fill("What changed after the first round?");
    await page
      .getByRole("button", { name: "Send question", exact: true })
      .click();
    await expect(
      page.getByText("Reading recorded turns", { exact: true }),
    ).toBeVisible();
    expect(submitted.run_id).toBe(run.id);
    expect(submitted.study_id).toBeNull();
    await expect(
      page.getByRole("button", { name: "Send question" }),
    ).toBeDisabled();
    history = [
      {
        ...history[0],
        status: "complete",
        output: {
          answer: "The group contributed more.",
          citations: [{ run_id: run.id, turn: 3 }],
          examined: [{ run_id: run.id, start: 1, end: 3, full_turn: false }],
          caveats: ["One run is descriptive."],
        },
      },
    ];
    await expect(
      page.getByText("The group contributed more.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Turn 3", exact: true }),
    ).toHaveAttribute("href", `/runs/${run.id}?turn=3&tab=decisions`);
    await page.getByText("Limitations & uncertainty", { exact: true }).click();
    await expect(page.getByText("One run is descriptive.")).toBeVisible();
    history = [
      { ...history[0], status: "failed", error: "Provider request timed out" },
    ];
    await expect(page.getByRole("alert")).toContainText(
      "Provider request timed out",
    );
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByText("Reading recorded turns", { exact: true }),
    ).toBeVisible();
    expect(submitted.question).toBe("What changed after the first round?");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("desktop navigation collapses, persists, and restores via keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Toggle sidebar", exact: true })
    .click();
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  await page.keyboard.press("Control+b");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="expanded"]'),
  ).toBeVisible();
});
