import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

test("a corrupt draft leaves valid drafts available with targeted recovery", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  await page.addInitScript((design) => {
    localStorage.setItem(
      "ass:draft:/new?template=commons",
      JSON.stringify({
        path: "/new?template=commons",
        title: "Preserved draft",
        updated: new Date().toISOString(),
        design,
        mode: "visual",
        json: "",
      }),
    );
    localStorage.setItem("ass:draft:/new?template=broken", "{unfinished");
  }, templateDesign(catalog));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Some drafts could not be read",
  );
  await page.getByText(/^Drafts ·/).click();
  await expect(
    page.getByRole("link", { name: "Preserved draft", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Discard unreadable draft · /new?template=broken",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Preserved draft", exact: true }),
  ).toBeVisible();
});

for (const unreadable of [true, false]) {
  test(`draft discard storage failure stays recoverable · ${unreadable ? "unreadable" : "invalid"}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((unreadable) => {
      localStorage.setItem(
        "ass:draft:/new",
        unreadable
          ? "{unfinished"
          : JSON.stringify({
              path: "/new",
              title: "Invalid",
              updated: new Date().toISOString(),
              design: {},
              mode: "visual",
              json: "{}",
            }),
      );
      Storage.prototype.removeItem = () => {
        throw new Error("Storage temporarily unavailable");
      };
    }, unreadable);
    await page.goto("/new");
    const discard = page.getByRole("button", {
      name: unreadable ? "Discard unreadable draft" : "Discard draft",
      exact: true,
    });
    await discard.click();
    await expect(
      page.getByText("Storage temporarily unavailable", { exact: true }),
    ).toBeVisible();
    await expect(discard).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test("agent context errors retain loaded experiment choices and retry locally", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/studies", (route) =>
    route.fulfill({
      json: [
        {
          id: "context-study",
          title: "Loaded experiment",
          status: "ready",
          environment: "commons",
          run_count: 0,
          completed_runs: 0,
          cost_usd: 0,
          created: "2026-11-07",
        },
      ],
    }),
  );
  await page.route("**/api/runs", (route) =>
    route.fulfill(
      failed
        ? { status: 503, json: { detail: "Run choices unavailable" } }
        : { json: [] },
    ),
  );
  await page.goto("/?assistant");
  await expect(page.getByRole("alert")).toContainText(
    "Run choices unavailable",
  );
  await page.getByRole("combobox", { name: "Agent context" }).click();
  await expect(
    page.getByRole("option", { name: "Experiment · Loaded experiment" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("assistant visibility preserves the current editor and its single draft", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  const name = page.getByLabel("Experiment name", { exact: true });
  await name.fill("Preserved while asking AI");
  await page.getByRole("tab", { name: "Execution", exact: true }).click();
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Execution", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("tab", { name: "Question", exact: true }).click();
  await expect(name).toHaveValue("Preserved while asking AI");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("ass:draft:")),
    ),
  ).toEqual(["ass:draft:/new?template=commons"]);
});

test("pending validation locks the submitted specification until its response", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  await page.getByRole("tab", { name: "Specification", exact: true }).click();
  const text = page.getByLabel("Complete JSON specification");
  const design = JSON.parse(await text.inputValue());
  design.title = "Validated snapshot";
  await text.fill(JSON.stringify(design));
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/design/validate", async (route) => {
    await pending;
    await route.fulfill({ json: design });
  });
  await page.getByRole("tab", { name: "Question", exact: true }).click();
  await expect(text).toBeDisabled();
  await expect(
    page.getByRole("tab", { name: "Execution", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Create experiment", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    "Validated snapshot",
  );
});

test("Home exposes independent template and AI-history failures with retry", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/api/catalog", async (route) =>
    failing
      ? route.fulfill({
          status: 503,
          json: { detail: "Templates temporarily unavailable" },
        })
      : route.continue(),
  );
  await page.route("**/api/analyses", (route) =>
    route.fulfill(
      failing
        ? {
            status: 503,
            json: { detail: "AI history temporarily unavailable" },
          }
        : { json: [] },
    ),
  );
  await page.goto("/");
  const templatesError = page
    .getByRole("alert")
    .filter({ hasText: "Templates temporarily unavailable" });
  const historyError = page
    .getByRole("alert")
    .filter({ hasText: "AI history temporarily unavailable" });
  await expect(templatesError).toBeVisible();
  await expect(historyError).toBeVisible();
  failing = false;
  await templatesError
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await historyError
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toHaveCount(0);
});

test("transient draft validation failures retry without classifying the draft as corrupt", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  await page.addInitScript(
    (design) =>
      localStorage.setItem(
        "ass:draft:/new",
        JSON.stringify({
          path: "/new",
          title: "Valid saved draft",
          design: { ...design, title: "Valid saved draft" },
          json: "",
          mode: "visual",
          updated: new Date().toISOString(),
        }),
      ),
    templateDesign(catalog),
  );
  let failing = true;
  await page.route("**/api/design/validate", (route) =>
    failing
      ? route.fulfill({
          status: 503,
          json: { detail: "Validation temporarily unavailable" },
        })
      : route.continue(),
  );
  await page.goto("/new");
  await expect(page.getByRole("alert")).toContainText(
    "Validation temporarily unavailable",
  );
  await expect(page.getByRole("button", { name: /Discard/ })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Recover your draft" }),
  ).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    "Valid saved draft",
  );
});
