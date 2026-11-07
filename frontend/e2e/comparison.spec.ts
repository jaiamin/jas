import { expect, test } from "@playwright/test";
import { createStudy } from "./helpers.js";

test("comparison aligns outcomes, missing values, metric selection and incompatible protocols", async ({
  page,
  request,
}) => {
  const { run: left } = await createStudy(request);
  const { run: right } = await createStudy(request);
  left.summary.condition = "Low resources";
  right.summary.condition = "High resources";
  right.summary.environment = "trust_exchange";
  left.metrics = { stock: 12, contribution_rate: 0.25 };
  right.metrics = { stock: 34, mean_payoff: 7 };
  left.measurements = [
    {
      turn: 1,
      round: 1,
      key: "stock",
      value: 12,
      denominator: null,
      agent: null,
      version: 1,
    },
  ];
  right.measurements = [
    {
      turn: 1,
      round: 1,
      key: "stock",
      value: 34,
      denominator: null,
      agent: null,
      version: 1,
    },
  ];
  for (const run of [left, right])
    await page.route(`**/api/runs/${run.summary.id}`, (route) =>
      route.fulfill({ json: run }),
    );
  await page.goto(`/compare?runs=${right.summary.id},${left.summary.id}`);
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText([
    "Measurement",
    /High resources/,
    /Low resources/,
  ]);
  await expect(
    table
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: "Stock", exact: true }) })
      .getByRole("cell"),
  ).toHaveText(["Stock", "34.0", "12.0"]);
  await expect(
    table
      .getByRole("row")
      .filter({
        has: page.getByRole("cell", { name: "Contribution rate", exact: true }),
      })
      .getByRole("cell"),
  ).toHaveText(["Contribution rate", "—", "25%"]);
  await expect(page.getByRole("status")).toContainText(
    "different environments",
  );
  await page.getByRole("combobox", { name: "Comparison measurement" }).click();
  await page.getByRole("option", { name: "Mean payoff", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Comparison measurement" }),
  ).toHaveText("Mean payoff");
});
