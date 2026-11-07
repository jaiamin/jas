import { expect, test } from "@playwright/test";

test("four examples adapt to creation, saved treatments and a run without submitting", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const { id } = await (
    await request.post("/api/studies", {
      data: {
        design: {
          ...catalog.templates[0].design,
          title: "Messages under scarcity",
          question: "Do public messages change contributions?",
        },
      },
    })
  ).json();
  const study = await (await request.get(`/api/studies/${id}`)).json();
  const run = study.runs[0];
  let submitted = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/chats"))
      submitted++;
  });
  await page.goto("/agent");
  const suggestions = page.locator(".agent-suggestions button");
  await expect(suggestions).toHaveCount(4);
  const context = page.getByRole("combobox", { name: "Message context" });
  const draft = page.getByLabel("Message Agent", { exact: true });
  await context.click();
  await page
    .getByRole("option", { name: "New experiment", exact: true })
    .click();
  await expect(suggestions).toHaveCount(4);
  await page
    .getByRole("button", { name: "Oversight & sanctions", exact: true })
    .click();
  await expect(draft).toHaveValue(/Vary only oversight probability/);
  await context.click();
  await page
    .getByRole("option", { name: "Messages under scarcity", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Review the setup", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check the comparison", exact: true })
    .click();
  await expect(draft).toHaveValue(new RegExp(study.design.conditions[0].name));
  await expect(draft).toHaveValue(new RegExp(study.design.conditions[1].name));
  await page
    .getByRole("button", { name: "Review the setup", exact: true })
    .click();
  await expect(draft).toHaveValue(/Do public messages change contributions\?/);
  await context.click();
  await page
    .getByRole("option", {
      name: new RegExp(`Rev ${run.revision} .*${run.id.slice(0, 6)}`),
    })
    .click();
  await expect(suggestions).toHaveCount(4);
  await page
    .getByRole("button", { name: "Review this condition", exact: true })
    .click();
  await expect(draft).toHaveValue(
    new RegExp(
      `condition “${run.condition}”, seed ${run.seed}, repetition ${run.repetition}`,
    ),
  );
  await expect(draft).toBeFocused();
  expect(submitted).toBe(0);
});
