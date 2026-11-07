import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  for (const [environment, title, control] of [
    ["institution", "Allocation & authority", "Oversight probability"],
    ["bargaining", "Negotiation", "Surplus retained each round"],
    ["information", "Evidence & decisions", "Private evidence accuracy"],
    ["renewable_resource", "Shared resource", "Carrying capacity"],
  ]) {
    test(`${environment}: configure, save and inspect · ${theme}`, async ({
      page,
      request,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(
        (value) => localStorage.setItem("ass-theme", value),
        theme,
      );
      await page.setViewportSize(
        theme === "dark"
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
      );
      await page.goto(`/new?template=${environment}`);
      await page.locator(".condition-summary").first().click();
      await expect(page.getByLabel(control).first()).toBeVisible();
      await page
        .getByRole("button", { name: "Create experiment", exact: true })
        .click();
      await expect(page).toHaveURL(/\/studies\//);
      const studyID = new URL(page.url()).pathname.split("/").at(-1);
      const study = await (await request.get(`/api/studies/${studyID}`)).json();
      expect(study.design.environment).toBe(environment);
      await page.goto(`/runs/${study.runs[0].id}`);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}
