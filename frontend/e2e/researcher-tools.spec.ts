import { expect, test } from "@playwright/test";
import type { Analysis } from "../src/lib/types.js";

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`Researcher operation results survive completion and reload · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/api/settings", (route) =>
        route.fulfill({
          json: {
            providers: { openai: true },
            planner_model: "openai:gpt-6.1-sol",
            assistant_model: "openai:gpt-6.1-sol",
          },
        }),
      );
      let posts = 0;
      const row: Analysis = {
        id: "probe-answer",
        chat_id: "probe-chat",
        question: "Inspect binding acceptance without running participants",
        purpose: "general",
        status: "pending",
        cutoffs: {},
        created: "2026-11-10T00:00:00Z",
        error: null,
        study_id: null,
        run_id: null,
        output: {
          stage: "probing",
          activity: ["answering", "probing"],
          research: {
            version: 2,
            scope: {
              chat_id: "probe-chat",
              before: "2026-11-10T00:00:00Z",
              cutoffs: {},
              context_limit: 50,
            },
            stop_reason: null,
            operations: [
              {
                id: "probe-artifact",
                request: {
                  kind: "probe",
                  source: { kind: "template", environment: "bargaining" },
                },
                status: "pending",
                summary: "Operation started.",
                sources: [],
                data: null,
              },
            ],
          },
        },
      };
      let release = () => {};
      const ready = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/chats", (route) => {
        if (route.request().method() === "POST") {
          posts += 1;
          return route.fulfill({
            status: 202,
            json: { id: row.id, chat_id: row.chat_id },
          });
        }
        return route.fulfill({ json: [] });
      });
      await page.route("**/api/chats/probe-chat", (route) =>
        route.fulfill({ json: [row] }),
      );
      await page.route("**/api/chats/probe-chat/events", async (route) => {
        await ready;
        const operation = row.output?.research?.operations[0];
        if (!operation || !row.output?.research)
          throw new Error("Missing test operation");
        operation.status = "complete";
        operation.summary =
          "The copied bargaining world settled five and nine credits. No participant requests.";
        operation.sources = [
          {
            kind: "builtin",
            id: "bargaining",
            hash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
          },
        ];
        operation.data = {
          hypothetical: true,
          participant_calls: 0,
          outcome: { balances: { a: 5, b: 9 } },
        };
        row.output.research.stop_reason = "request_limit";
        row.output.answer =
          "The hypothetical offer binds on acceptance. This is a mechanic check, not participant behavior.";
        row.output.activity?.push("writing");
        row.status = "complete";
        await route.fulfill({
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify(row)}\n\n`,
        });
      });
      await page.goto("/agent");
      const composer = page.getByLabel("Message Agent", { exact: true });
      await composer.fill(row.question);
      await page
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Probing a copied world" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Probing a copied world" })
        .click();
      await expect(page.getByLabel("Research operations")).toContainText(
        "World probe",
      );
      await expect(
        page.getByRole("button", { name: "Send message", exact: true }),
      ).toBeDisabled();
      release();
      await expect(page.getByText("Request limit reached")).toBeVisible();
      await page
        .getByRole("button", { name: "World probe", exact: true })
        .click();
      await expect(
        page.getByText(
          "The copied bargaining world settled five and nine credits. No participant requests.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Source environment: bargaining/ }),
      ).toHaveAttribute("href", "/environments?environment=bargaining");
      await expect(page.getByText(/"hypothetical": true/)).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator('[data-slot="trace-collapsible-content"]')
            .evaluateAll(
              (elements) =>
                elements
                  .flatMap((element) => element.getAnimations())
                  .filter((animation) => animation.playState === "running")
                  .length,
            ),
        )
        .toBe(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("researcher-activity.png"),
        fullPage: true,
      });
      await composer.fill("Keep this unfinished follow-up");
      await page.reload();
      await expect(composer).toHaveValue("Keep this unfinished follow-up");
      await page.getByRole("button", { name: "Activity", exact: true }).click();
      await page
        .getByRole("button", { name: "World probe", exact: true })
        .click();
      await expect(page.getByText(/"participant_calls": 0/)).toBeVisible();
      expect(posts).toBe(1);
    });
  }
}
