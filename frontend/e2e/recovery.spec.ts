import { expect, test } from "@playwright/test";

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
  }, catalog.templates[0].design);
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
