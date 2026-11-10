import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import type { Catalog, StudyDetail } from "../src/lib/types.js";
import { templateDesign } from "./helpers.js";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`planned comparison and export stay inspectable · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const catalog: Catalog = await (await request.get("/api/catalog")).json();
      const design = templateDesign(catalog);
      design.title = `T06 planned sample ${theme} ${width}`;
      design.seeds = [7, 11];
      design.rounds = 1;
      const saved = await request.post("/api/studies", { data: { design } });
      expect(saved.status()).toBe(201);
      const { id } = await saved.json();
      const before: StudyDetail = await (
        await request.get(`/api/studies/${id}`)
      ).json();
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/studies/${id}`);
      await expect(
        page.getByRole("heading", { name: design.title }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Complete / planned" }),
      ).toBeVisible();
      await expect(
        page.getByRole("cell", { name: "0 / 2", exact: true }),
      ).toHaveCount(2);
      const detail = page.getByRole("button", {
        name: "Sample & uncertainty",
        exact: true,
      });
      await detail.focus();
      await detail.press("Enter");
      await expect(
        page.getByText(/Independent support: not established/),
      ).toBeVisible();
      await expect(
        page.getByText(/Confidence intervals withheld: the protocol/),
      ).toBeVisible();
      await expect(
        page.getByRole("cell", { name: "Not attempted", exact: true }),
      ).toHaveCount(4);
      const effects = page.getByRole("button", {
        name: "Matched-seed effects",
        exact: true,
      });
      await effects.click();
      await expect(
        page.getByRole("cell", {
          name: "0 / 2 pairs · 0 seed clusters",
          exact: true,
        }),
      ).toHaveCount(design.measures.length);
      await page
        .getByRole("button", {
          name: /Fewer resources − More resources · Contribution rate · sensitivity/,
        })
        .click();
      await expect(
        page.getByText(/Planned-sample bounds: -100% to 100%/),
      ).toBeVisible();
      await expect(
        page.getByText(/Seed 7, repetition 1: More resources: Not attempted/),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`sample-${theme}-${width}.png`),
        fullPage: true,
      });
      const downloaded = page.waitForEvent("download");
      await page.getByRole("link", { name: "Export experiment" }).click();
      const download = await downloaded;
      const path = testInfo.outputPath("experiment.json");
      await download.saveAs(path);
      const exported = JSON.parse(await readFile(path, "utf8"));
      expect(exported.version).toBe(12);
      expect(exported.study.comparison).toEqual(before.comparison);
      expect(exported.study.effects).toEqual(before.effects);
      expect(exported.requests).toEqual([]);
      expect(exported.runs).toHaveLength(4);
      expect(exported.study.sha256).toBe(before.sha256);
      expect(exported.study.comparison.design_sha256).toBe(before.sha256);
      const revised = await request.post(`/api/studies/${id}/revisions`, {
        data: { design: { ...design, title: `${design.title} revised` } },
      });
      expect(revised.status()).toBe(201);
      await page.goto(`/studies/${id}?revision=1`);
      await expect(
        page.getByRole("heading", { name: design.title }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Sample & uncertainty", exact: true })
        .click();
      await expect(
        page.getByText(before.sha256, { exact: true }),
      ).toBeVisible();
      const preserved = await (
        await request.get(`/api/studies/${id}?revision=1`)
      ).json();
      expect(preserved.comparison).toEqual(before.comparison);
      expect(preserved.usage).toEqual(before.usage);
      expect(errors).toEqual([]);
    });
  }
}
