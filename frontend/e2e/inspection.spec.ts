import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

for (const theme of ["light", "dark"]) {
  test(`mobile decision inspection focuses evidence and returns to journal · ${theme}`, async ({
    page,
    request,
  }) => {
    const catalog = await (await request.get("/api/catalog")).json();
    const design = templateDesign(catalog);
    const created = await (
      await request.post("/api/studies", { data: { design } })
    ).json();
    const study = await (
      await request.get(`/api/studies/${created.id}`)
    ).json();
    const id = study.runs[0].id;
    const run = await (await request.get(`/api/runs/${id}`)).json();
    const action = {
      kind: "contribute",
      amount: 3,
      target: "",
      message: "",
      report: null,
      promise: null,
    };
    run.summary = { ...run.summary, turn: 20, round: 4, status: "paused" };
    run.turns = Array.from({ length: 20 }, (_, i) => ({
      number: i + 1,
      round: Math.ceil((i + 1) / design.profiles.length),
      actor: design.profiles[i % design.profiles.length].key,
      action,
      rationale: "A recorded test decision with an inspectable consequence.",
      latency_ms: 1000,
    }));
    await page.route(`**/api/runs/${id}`, (route) =>
      route.fulfill({ json: run }),
    );
    await page.route(`**/api/runs/${id}/turns/*`, (route) => {
      const number = Number(
        new URL(route.request().url()).pathname.split("/").at(-1),
      );
      return route.fulfill({
        json: {
          number,
          actor: design.profiles[0].key,
          observation: {},
          decision: {
            action,
            rationale: "Selected evidence",
            memory: "",
            forecast: null,
          },
          checkpoint: run.state,
          events: [],
          state_hash: "test",
        },
      });
    });
    await page.addInitScript(
      (value) => localStorage.setItem("ass-theme", value),
      theme,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const notes: { id: string; turn: number; label: string; note: string }[] =
      [];
    let failSave = true;
    await page.route(`**/api/runs/${id}/annotations`, (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: notes });
      const body = route.request().postDataJSON();
      if (failSave)
        return route.fulfill({
          status: 503,
          json: { detail: "Observation unavailable" },
        });
      expect(body).toEqual({
        turn: 19,
        label: "Observation",
        note: "A preserved historical observation",
      });
      notes.push({ id: "note-19", ...body });
      return route.fulfill({ status: 201, json: { id: "note-19" } });
    });
    await page.goto(`/runs/${id}?turn=19.5&tab=decisions`);
    const scrubber = page.getByRole("slider", { name: "Recorded turn" });
    await expect(scrubber).toHaveAttribute("aria-valuenow", "19");
    await scrubber.focus();
    await scrubber.press("ArrowRight");
    await expect(scrubber).toHaveAttribute("aria-valuenow", "20");
    await scrubber.press("ArrowLeft");
    await expect(scrubber).toHaveAttribute("aria-valuenow", "19");
    await expect(page).toHaveURL(/turn=19/);
    await page.getByRole("button", { name: "19", exact: true }).click();
    const evidence = page.getByRole("heading", {
      name: "Turn 19 evidence",
      exact: true,
    });
    await expect(evidence).toBeFocused();
    expect((await evidence.boundingBox())?.y).toBeLessThan(200);
    await page.getByRole("button", { name: "Back to decisions" }).click();
    const journal = page.getByRole("heading", {
      name: "Decision journal",
      exact: true,
    });
    await expect(journal).toBeFocused();
    expect((await journal.boundingBox())?.y).toBeLessThan(200);
    await page.getByText("Researcher observations", { exact: true }).click();
    const input = page.getByLabel("Add an observation at turn 19");
    await input.fill("A preserved historical observation");
    await page
      .getByRole("button", { name: "Save observation", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Observation unavailable",
    );
    await expect(input).toHaveValue("A preserved historical observation");
    failSave = false;
    await page
      .getByRole("button", { name: "Save observation", exact: true })
      .click();
    await expect(input).toHaveValue("");
    await expect(page.locator(".annotation")).toContainText(
      "A preserved historical observation",
    );
    await page.getByRole("button", { name: "Previous recorded turn" }).click();
    await page.getByText("Researcher observations", { exact: true }).click();
    await expect(page.locator(".annotation")).toHaveCount(0);
    await page.getByRole("button", { name: "Next recorded turn" }).click();
    await page.getByText("Researcher observations", { exact: true }).click();
    await expect(page.locator(".annotation")).toContainText(
      "A preserved historical observation",
    );
  });
}
