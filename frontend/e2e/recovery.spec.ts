import { expect, test } from "@playwright/test";
import { templateDesign } from "./helpers.js";

test("a corrupt draft leaves valid drafts available with targeted recovery", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  await page.addInitScript((design) => {
    localStorage.setItem(
      "jas:draft:/new?template=commons",
      JSON.stringify({
        path: "/new?template=commons",
        title: "Preserved draft",
        updated: new Date().toISOString(),
        design,
        mode: "visual",
        json: "",
      }),
    );
    localStorage.setItem("jas:draft:/new?template=broken", "{unfinished");
  }, templateDesign(catalog));
  await page.goto("/studies");
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
        "jas:draft:/new",
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
  await page.goto("/agent");
  await expect(page.getByRole("alert")).toContainText(
    "Run choices unavailable",
  );
  await page.getByRole("combobox", { name: "Message context" }).click();
  await expect(
    page.getByRole("option", { name: "Loaded experiment" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("visiting Agent preserves the editor's single recoverable draft", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  await page
    .getByLabel("Experiment name", { exact: true })
    .fill("Preserved while asking AI");
  await page
    .getByRole("link", { name: "Generate with Agent", exact: true })
    .click();
  await expect(page).toHaveURL(/agent\?context=new/);
  await page.goBack();
  await expect(page.getByLabel("Experiment name", { exact: true })).toHaveValue(
    "Preserved while asking AI",
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("jas:draft:")),
    ),
  ).toEqual(["jas:draft:/new?template=commons"]);
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

test("a delayed save locks editing and a failed save keeps the draft editable", async ({
  page,
}) => {
  await page.goto("/new?template=commons");
  const name = page.getByLabel("Experiment name", { exact: true });
  await name.fill("Save recovery snapshot");
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/studies", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await pending;
    await route.fulfill({
      status: 503,
      json: { detail: "Save temporarily unavailable" },
    });
  });
  const save = page.getByRole("button", {
    name: "Create experiment",
    exact: true,
  });
  await save.click();
  await expect(name).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Environment", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("tab", { name: "Specification", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText(
    "Save temporarily unavailable",
  );
  await expect(name).toBeEnabled();
  await expect(name).toHaveValue("Save recovery snapshot");
  await name.fill("Recovered after failed save");
  await page.reload();
  await expect(name).toHaveValue("Recovered after failed save");
  await page.unroute("**/api/studies");
  await save.click();
  await expect(page).toHaveURL(/\/studies\//);
  await expect(
    page.getByRole("heading", {
      name: "Recovered after failed save",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("jas:draft:/new?template=commons"),
    ),
  ).toBeNull();
});

test("chat history failures have a local retry", async ({ page }) => {
  let failing = true;
  await page.route("**/api/chats", (route) =>
    route.fulfill(
      failing
        ? { status: 503, json: { detail: "History temporarily unavailable" } }
        : { json: [] },
    ),
  );
  await page.goto("/agent");
  const history = page.getByRole("complementary", { name: "Chat history" });
  await expect(history.getByRole("alert")).toContainText(
    "Could not load chats",
  );
  failing = false;
  await history.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    history.getByText("No chats yet", { exact: true }),
  ).toBeVisible();
});

test("transient draft validation failures retry without classifying the draft as corrupt", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  await page.addInitScript(
    (design) =>
      localStorage.setItem(
        "jas:draft:/new",
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
