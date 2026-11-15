import { expect, test } from "@playwright/test";
import type { Design, StudyDetail } from "../src/lib/types.js";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`detail pages keep controls, evidence and context clear · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      const starters: { id: string; design: Design }[] = await (
        await request.get("/api/starters")
      ).json();
      const design = structuredClone(
        starters.find((starter) => starter.id === "commons-messages")?.design,
      );
      if (!design) throw new Error("Missing commons starter");
      design.rounds = 2;
      design.seeds = [7, 19];
      for (const [index, condition] of design.conditions.entries()) {
        condition.harness = {
          kind: "scripted",
          version: "1.0.0",
          policy: index ? "commons_half_v1" : "commons_keep_v1",
          max_requests: 0,
          max_tool_operations: 0,
          tools: [],
        };
      }
      const response = await request.post("/api/studies", { data: { design } });
      expect(response.ok()).toBe(true);
      const { id } = await response.json();
      const study: StudyDetail = await (
        await request.get(`/api/studies/${id}`)
      ).json();
      const runId = study.runs[0].id;
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(`/experiments/${id}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        design.title,
      );
      await expect(
        page.getByRole("link", { name: "Tune", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Run experiment", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("No eligible values yet.", { exact: true }),
      ).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath("experiment-ready.png"),
        fullPage: true,
        animations: "disabled",
      });
      await page.goto(`/runs/${runId}`);
      await expect(
        page.getByRole("button", { name: "Run", exact: true }),
      ).toBeVisible();
      const recording = page.getByRole("region", {
        name: "Run recording",
        exact: true,
      });
      const viewer = page.locator('[data-slot="run-viewer"]');
      const recordingBox = await recording.boundingBox();
      const viewerBox = await viewer.boundingBox();
      expect(
        recordingBox &&
          viewerBox &&
          recordingBox.y + recordingBox.height <= viewerBox.y,
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("run-ready.png"),
        fullPage: true,
        animations: "disabled",
      });
      expect(
        (
          await request.post(`/api/studies/${id}/control`, {
            data: { action: "start" },
          })
        ).ok(),
      ).toBe(true);
      await expect
        .poll(async () => {
          const result: StudyDetail = await (
            await request.get(`/api/studies/${id}`)
          ).json();
          return result.runs.every((run) => run.status === "complete");
        })
        .toBe(true);
      await page.goto(`/experiments/${id}`);
      const tabs = page.getByRole("tablist", { name: "Experiment sections" });
      for (const section of [
        "Overview",
        "Results",
        "Runs",
        "Design",
        "Publish",
      ]) {
        await tabs.getByRole("tab", { name: section, exact: true }).click();
        await expect(
          page.getByRole("tabpanel", { name: section, exact: true }),
        ).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`experiment-${section.toLowerCase()}.png`),
          fullPage: true,
          animations: "disabled",
        });
        if (section === "Design") {
          await page
            .getByRole("button", { name: "Version history", exact: true })
            .click();
          await expect(
            page.getByText("This experiment has one frozen version.", {
              exact: false,
            }),
          ).toBeVisible();
          await page
            .getByRole("button", {
              name: "Immutable specification",
              exact: true,
            })
            .click();
          await expect(page.getByText(/Version 1 · SHA-256/)).toBeVisible();
        }
      }
      await page.goto(`/runs/${runId}`);
      await expect(
        page.getByRole("button", { name: "Run", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("region", { name: "Turn story" }),
      ).toContainText("Consequence");
      await expect(
        page.getByRole("button", { name: "Researcher view", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      const agent = viewer.getByRole("button", {
        name: new RegExp(`^${design.profiles[0].name}`),
      });
      await agent.click();
      await expect(agent).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("complementary", { name: "Agent-visible world" }),
      ).toBeVisible();
      await expect(
        page.getByRole("complementary", { name: "World and metrics" }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Researcher view", exact: true })
        .click();
      await page.screenshot({
        path: testInfo.outputPath("run-recorded.png"),
        fullPage: true,
        animations: "disabled",
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (width === 1440) {
        await page
          .getByRole("button", { name: "Assistant", exact: true })
          .click();
        const assistant = page.getByRole("complementary", {
          name: "Assistant",
          exact: true,
        });
        await expect(
          assistant.getByRole("combobox", { name: "Message context" }),
        ).toContainText(study.runs[0].condition);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await expect
          .poll(() =>
            viewer
              .getByRole("region", { name: "Turn story" })
              .evaluate((element) => getComputedStyle(element).overflowY),
          )
          .toBe("visible");
        await page.screenshot({
          path: testInfo.outputPath("run-with-assistant.png"),
          animations: "disabled",
        });
      }
      expect(
        (await (await request.get("/api/settings")).json()).usage.requests,
      ).toBe(0);
      expect(pageErrors).toEqual([]);
    });
  }
}
