import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

for (const { theme, width } of [
  { theme: "light", width: 1440 },
  { theme: "dark", width: 390 },
]) {
  for (const invented of [false, true]) {
    test(`recorded claim support and frozen reanalysis · ${invented ? "adversarial" : "accurate"} · ${theme}`, async ({
      page,
      request,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const design = templateDesign(
        await (await request.get("/api/catalog")).json(),
      );
      design.title = `T19 ${theme} ${invented ? "invented" : "accurate"}`;
      design.profiles = design.profiles.slice(0, 2);
      design.rounds = 2;
      design.seeds = [7];
      design.conditions = design.conditions.slice(0, 1);
      design.conditions[0].parameters.endowment = 10;
      design.conditions[0].parameters.multiplier = 1.5;
      const saved = await request.post("/api/studies", { data: { design } });
      expect(saved.status()).toBe(201);
      const sid = (await saved.json()).id;
      const rid = (await (await request.get(`/api/studies/${sid}`)).json())
        .runs[0].id;
      await request.post(`/api/runs/${rid}/control`, {
        data: { action: "start" },
      });
      await expect
        .poll(
          async () =>
            (await (await request.get(`/api/runs/${rid}`)).json()).summary
              .status,
        )
        .toBe("complete");
      const before = await (
        await request.get(`/api/studies/${sid}/export`)
      ).json();
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      // Only provider availability is simulated in the browser; the real HTTP analysis runs.
      await page.route("**/api/settings", async (route) => {
        const settings = await (await route.fetch()).json();
        await route.fulfill({
          json: { ...settings, providers: { openai: true } },
        });
      });
      await page.goto(`/agent?context=run:${rid}`);
      const composer = page.getByLabel("Message Agent", { exact: true });
      await composer.fill(
        invented
          ? "Inspect this invented total with valid citations."
          : "Describe the recorded utility accurately.",
      );
      await page
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      const evidence = page
        .getByRole("region", { name: "Finding evidence" })
        .first();
      await expect(
        evidence.getByText("4 recorded decisions; cumulative utility 44."),
      ).toBeVisible();
      await expect(evidence.getByText("Wording unassessed")).toBeVisible();
      const disclosure = evidence.getByRole("button", {
        name: "Evidence & claim status",
        exact: true,
      });
      await disclosure.focus();
      await disclosure.press("Enter");
      await expect(
        evidence.getByText(invented ? "Contradicted" : "Value checked", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        evidence.getByText(`Claimed ${invented ? 440 : 44} · computed 44`, {
          exact: true,
        }),
      ).toBeVisible();
      await evidence
        .getByRole("button", { name: /Calculation inputs/ })
        .click();
      await expect(evidence.getByText(/"balances":/)).toBeVisible();
      await evidence
        .getByRole("button", {
          name: "Coverage & missing evidence",
          exact: true,
        })
        .click();
      await expect(
        evidence.getByText(/1 planned cells · 0 failed/),
      ).toBeVisible();
      await composer.fill("Keep this unfinished follow-up");
      const oldRows = await (
        await request.get(
          `/api/chats/${new URL(page.url()).searchParams.get("chat")}`,
        )
      ).json();
      const old = oldRows[0];
      const reanalyze = evidence.getByRole("button", {
        name: "Reanalyze communication",
        exact: true,
      });
      await reanalyze.focus();
      await reanalyze.press("Enter");
      await expect(
        page.getByRole("region", { name: "Finding evidence" }),
      ).toHaveCount(2);
      const second = page
        .getByRole("region", { name: "Finding evidence" })
        .last();
      await expect(
        second.getByText(
          /0 recorded messages; 0 factual reports; 0 feasible breaches/,
        ),
      ).toBeVisible();
      await expect(composer).toHaveValue("Keep this unfinished follow-up");
      const chatId = new URL(page.url()).searchParams.get("chat");
      const rows = await (await request.get(`/api/chats/${chatId}`)).json();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(old);
      expect(rows[1].output.source_analysis_id).toBe(old.id);
      expect(rows[1].output.lens.inputs_sha256).toBe(
        old.output.lens.inputs_sha256,
      );
      expect(rows[1].cutoffs).toEqual(old.cutoffs);
      await page.reload();
      await expect(composer).toHaveValue("Keep this unfinished follow-up");
      await expect(page.getByText("Wording unassessed")).toHaveCount(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath("claim-support.png"),
        fullPage: true,
      });
      const after = await (
        await request.get(`/api/studies/${sid}/export`)
      ).json();
      expect(
        after.runs.map((run: { evidence: unknown }) => run.evidence),
      ).toEqual(before.runs.map((run: { evidence: unknown }) => run.evidence));
      expect(after.activations).toEqual(before.activations);
      expect(
        after.requests.filter(
          (call: { analysis_id: string | null }) => !call.analysis_id,
        ),
      ).toEqual(before.requests);
      expect(after.analyses).toHaveLength(2);
      for (const row of rows) {
        expect(
          after.requests.filter(
            (call: { analysis_id: string }) => call.analysis_id === row.id,
          ),
        ).toHaveLength(2);
        expect(row.usage.requests).toBe(2);
      }
      await writeFile(
        testInfo.outputPath("before.json"),
        JSON.stringify(before, null, 2),
      );
      await writeFile(
        testInfo.outputPath("after.json"),
        JSON.stringify(after, null, 2),
      );
      await writeFile(
        testInfo.outputPath("analyses.json"),
        JSON.stringify(rows, null, 2),
      );
      expect(errors).toEqual([]);
    });
  }
}
