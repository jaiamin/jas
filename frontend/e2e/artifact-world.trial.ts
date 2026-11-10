import { expect, test } from "@playwright/test";

test("solo artifact configuration preserves its draft and immutable saved rules", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/new?template=artifact_workspace");
  await page.getByRole("tab", { name: "Conditions", exact: true }).click();
  await expect(
    page.getByLabel("Maximum artifact writes", { exact: true }),
  ).toHaveValue("3");
  await page.getByLabel("Maximum artifact writes", { exact: true }).fill("2");
  await page.getByLabel("Measurement · reading", { exact: true }).fill("23");
  await page.reload();
  await page.getByRole("tab", { name: "Conditions", exact: true }).click();
  await expect(
    page.getByLabel("Maximum artifact writes", { exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByLabel("Measurement · reading", { exact: true }),
  ).toHaveValue("23");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await expect(page.getByLabel("Experiment review")).toContainText("2 writes");
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/studies\//);
  const id = page.url().split("/").at(-1);
  const study = await (await request.get(`/api/studies/${id}`)).json();
  expect(study.design.profiles).toHaveLength(1);
  expect(study.design.conditions[0].parameters.artifacts.write_limit).toBe(2);
  expect(
    study.design.conditions[0].parameters.artifacts.objects[0].content.reading,
  ).toBe(23);
  expect(study.usage.requests).toBe(0);
  await testInfo.attach("saved-solo-study", {
    body: JSON.stringify(study, null, 2),
    contentType: "application/json",
  });
});
