import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createStudy } from "./helpers.js";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`selection actions download and safely delete · ${theme} · ${width}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      const { study } = await createStudy(request);
      const other = (await createStudy(request)).study;
      await page.goto("/experiments");
      await expect(
        page.getByRole("button", { name: "Download selected evidence" }),
      ).toHaveCount(0);
      for (const id of [study.id, other.id]) {
        const row = page
          .getByRole("row")
          .filter({ has: page.locator(`a[href="/experiments/${id}"]`) });
        await row.getByRole("checkbox").check();
      }
      await expect(
        page.getByRole("group", { name: "Selection", exact: true }),
      ).toContainText("2 selected");
      let failDownload = true;
      await page.route("**/api/exports/studies", (route) =>
        failDownload
          ? route.fulfill({
              status: 503,
              json: { detail: "Download unavailable. Try again." },
            })
          : route.continue(),
      );
      await page
        .getByRole("button", { name: "Download selected evidence" })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "Download unavailable",
      );
      failDownload = false;
      const downloadEvent = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download selected evidence" })
        .click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe("jas-experiments.zip");
      const downloadPath = await download.path();
      if (!downloadPath) throw new Error("Download did not produce a file");
      expect((await readFile(downloadPath)).subarray(0, 2).toString()).toBe(
        "PK",
      );
      await expect(page.getByRole("alert")).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath("experiments-selected.png"),
      });
      await page
        .getByRole("button", { name: "Delete selected experiments" })
        .click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toContainText("versions, runs, evidence");
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      expect((await request.get(`/api/studies/${study.id}`)).ok()).toBe(true);
      let failDelete = true;
      await page.route(`**/api/studies/${other.id}`, (route) =>
        route.request().method() === "DELETE" && failDelete
          ? route.fulfill({
              status: 422,
              json: {
                detail: "Wait for related chats to finish before deleting.",
              },
            })
          : route.continue(),
      );
      await page
        .getByRole("button", { name: "Delete selected experiments" })
        .click();
      await dialog
        .getByRole("button", { name: "Delete experiments", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toContainText(
        "1 deleted. 1 not deleted.",
      );
      await expect(
        page.locator('[data-slot="button-group"][aria-label="Selection"]'),
      ).toContainText("1 selected");
      expect((await request.get(`/api/studies/${study.id}`)).status()).toBe(
        404,
      );
      expect((await request.get(`/api/studies/${other.id}`)).status()).toBe(
        200,
      );
      failDelete = false;
      await dialog
        .getByRole("button", { name: "Delete experiments", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      expect((await request.get(`/api/studies/${other.id}`)).status()).toBe(
        404,
      );
      await expect(
        page.getByRole("group", { name: "Selection", exact: true }),
      ).toHaveCount(0);
      const remaining = (await createStudy(request)).study;
      await page.goto("/runs");
      const rows = page.getByRole("table").locator("tbody").getByRole("row");
      for (const run of remaining.runs.slice(0, 2)) {
        await rows
          .filter({ has: page.locator(`a[href="/runs/${run.id}"]`) })
          .getByRole("checkbox")
          .check();
      }
      await expect(
        page.getByRole("link", { name: "Compare", exact: true }),
      ).toHaveAttribute(
        "href",
        `/compare?runs=${remaining.runs
          .slice(0, 2)
          .map((r) => r.id)
          .join(",")}`,
      );
      await expect(
        page.getByRole("button", { name: /Delete selected/ }),
      ).toHaveCount(0);
      const exportRequest = page.waitForRequest("**/api/exports/studies");
      const runDownloadEvent = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download selected evidence" })
        .click();
      expect((await exportRequest).postDataJSON()).toEqual({
        ids: [remaining.id],
      });
      await runDownloadEvent;
      await page.screenshot({ path: testInfo.outputPath("runs-selected.png") });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (await (await request.get("/api/settings")).json()).usage.requests,
      ).toBe(0);
    });
  }
}

test("active experiment selections allow download but prevent deletion", async ({
  page,
  request,
}) => {
  const { study } = await createStudy(request);
  const records = await (await request.get("/api/studies")).json();
  await page.route("**/api/studies", (route) =>
    route.fulfill({
      json: records.map((record: { id: string }) =>
        record.id === study.id ? { ...record, status: "running" } : record,
      ),
    }),
  );
  await page.goto("/experiments");
  await page
    .getByRole("row")
    .filter({ has: page.locator(`a[href="/experiments/${study.id}"]`) })
    .getByRole("checkbox")
    .check();
  await expect(
    page.getByRole("button", { name: "Delete selected experiments" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Download selected evidence" }),
  ).toBeEnabled();
});
