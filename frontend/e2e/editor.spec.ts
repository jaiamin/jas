import { expect, test } from "@playwright/test";
import { selectEditorSection, setDeveloper } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await setDeveloper(request, true);
});

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`experiment editor sections stay aligned and usable · ${theme} · ${width}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(
        (value) => localStorage.setItem("jas-theme", value),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/new?template=commons&mode=advanced");
      await selectEditorSection(page, "Question");
      await expect(
        page.getByLabel("Experiment name", { exact: true }),
      ).toBeVisible();
      const environment = page.getByRole("combobox", {
        name: "Environment",
        exact: true,
      });
      const environmentBox = await environment.boundingBox();
      const nameBox = await page
        .getByLabel("Experiment name", { exact: true })
        .boundingBox();
      expect(environmentBox?.x).toBe(nameBox?.x);
      expect(environmentBox?.width).toBe(nameBox?.width);
      const valueBox = await environment
        .locator('[data-slot="select-value"]')
        .boundingBox();
      await environment.click();
      await expect(
        page.getByRole("option").first(),
      ).toHaveAccessibleDescription(/\S/);
      await expect
        .poll(async () => {
          const menuBox = await page.getByRole("listbox").boundingBox();
          return Math.abs((menuBox?.x ?? 0) - (environmentBox?.x ?? 0));
        })
        .toBeLessThanOrEqual(1);
      await expect
        .poll(async () => {
          const menuText = await page
            .getByRole("option")
            .first()
            .locator("span")
            .last()
            .boundingBox();
          const menuBox = await page.getByRole("listbox").boundingBox();
          return Math.abs(
            (menuText?.x ?? 0) -
              (menuBox?.x ?? 0) -
              ((valueBox?.x ?? 0) - (environmentBox?.x ?? 0)),
          );
        })
        .toBeLessThanOrEqual(1);
      await expect(page.getByRole("option").first()).toHaveCSS(
        "padding-left",
        "8px",
      );
      await page.screenshot({
        path: testInfo.outputPath(`environment-picker-${theme}-${width}.png`),
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(environment).toHaveText("Shared commons");
      await expect(
        page.getByRole("button", { name: "Create experiment", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Experiment options", exact: true })
        .click();
      const saveSetup = page.getByRole("menuitem", {
        name: "Save custom environment",
        exact: true,
      });
      await expect(saveSetup).toBeVisible();
      await saveSetup.hover();
      await expect(saveSetup).toHaveCSS("padding-left", "10px");
      await expect(saveSetup).toHaveCSS("padding-right", "10px");
      await expect(saveSetup).toHaveCSS("text-decoration-line", "none");
      expect(
        await saveSetup.evaluate(
          (element) =>
            element.getBoundingClientRect().height <=
            parseFloat(getComputedStyle(element).lineHeight) + 10,
        ),
      ).toBe(true);
      await page.keyboard.press("Escape");
      const sections = page.getByRole("tablist", {
        name: "Experiment sections",
      });
      const selectedColor = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent-foreground)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      for (const name of ["General", "Advanced", "Review"]) {
        await sections.getByRole("tab", { name, exact: true }).click();
        await sections.getByRole("tab", { name, exact: true }).hover();
        await expect(
          sections.getByRole("tab", { name, exact: true }),
        ).toHaveCSS("color", selectedColor);
        if (name === "Advanced") {
          const research = page.getByRole("button", {
            name: "Research plan",
            exact: true,
          });
          await research.hover();
          await expect(research).toHaveCSS("text-decoration-line", "none");
          await expect(
            page.getByRole("textbox", { name: "Experiment name", exact: true }),
          ).toHaveCount(0);
          await expect(
            page.getByRole("combobox", { name: "Environment", exact: true }),
          ).toHaveCount(0);
        }
        await expect(
          page.getByRole("tabpanel", { name, exact: true }),
        ).toBeVisible();
        await expect(
          sections.getByRole("tab", { name, exact: true }),
        ).toHaveAttribute("aria-selected", "true");
        const geometry = await page
          .locator('[data-slot="editor-section-navigation"]')
          .evaluate((element) => {
            const active = element.querySelector('[aria-selected="true"]');
            const line = element.querySelector('[data-slot="separator"]');
            if (!active || !line)
              throw new Error("Missing selected tab or baseline");
            const pseudo = getComputedStyle(active, "::after");
            const box = active.getBoundingClientRect();
            return {
              indicatorBottom: box.bottom - parseFloat(pseudo.bottom),
              lineBottom: line.getBoundingClientRect().bottom,
              height: box.height,
              textColor: getComputedStyle(active).color,
              indicatorColor: pseudo.backgroundColor,
              opacity: pseudo.opacity,
            };
          });
        expect(
          Math.abs(geometry.indicatorBottom - geometry.lineBottom),
        ).toBeLessThan(1);
        await expect
          .poll(() =>
            sections
              .getByRole("tab", { name, exact: true })
              .evaluate(
                (element) => getComputedStyle(element, "::after").opacity,
              ),
          )
          .toBe("1");
        expect(geometry.height).toBe(36);
        expect(geometry.indicatorColor).toBe(geometry.textColor);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page
          .locator('[data-slot="workspace-content"]')
          .evaluate((element) => {
            element.scrollTop = 0;
          });
        await page.screenshot({
          path: testInfo.outputPath(
            `${name.toLowerCase().replaceAll(" ", "-")}-${theme}-${width}.png`,
          ),
          animations: "disabled",
        });
      }
      await selectEditorSection(page, "Question");
      await expect(
        page.getByLabel("Experiment name", { exact: true }),
      ).toHaveValue("Cooperation under scarcity");
      await sections.getByRole("tab", { name: "Review", exact: true }).click();
      await page
        .getByRole("button", { name: "Edit run plan", exact: true })
        .click();
      const seeds = page.getByLabel("Matched seeds", { exact: true });
      await seeds.fill("bad seed");
      await seeds.blur();
      await expect(seeds).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByRole("alert")).toContainText(
        "Seeds must be nonnegative integers",
      );
      await sections.getByRole("tab", { name: "General", exact: true }).click();
      const generalSeeds = page.getByLabel("Seeds", { exact: true });
      await expect(generalSeeds).toBeVisible();
      await expect(generalSeeds).toHaveAttribute("aria-invalid", "true");
      await generalSeeds.fill("7, 11");
      await selectEditorSection(page, "Run plan");
      await expect(seeds).toHaveValue("7, 11");
      await page.getByLabel("Repetitions per seed").fill("2");
      await sections.getByRole("tab", { name: "Review", exact: true }).click();
      const review = page.getByRole("region", { name: "Experiment review" });
      await expect(
        review
          .locator("div")
          .filter({ has: page.locator("dt", { hasText: "Planned runs" }) })
          .last()
          .locator("dd"),
      ).toHaveText("8");
      await expect(review).toContainText("7, 11");
      await expect(
        page.getByRole("button", { name: "Create experiment", exact: true }),
      ).toBeEnabled();
      expect(errors).toEqual([]);
    });
  }
}

test("editor preserves input DOM across sections and applies validated JSON to the run plan", async ({
  page,
}) => {
  await page.goto("/new?template=coordination&mode=advanced");
  await selectEditorSection(page, "Question");
  await page.getByLabel("Experiment name").fill("Preserved experiment");
  await selectEditorSection(page, "Agents");
  await page.getByRole("button", { name: "Add agent", exact: true }).click();
  const agent = page.getByLabel("Name", { exact: true }).last();
  await expect(agent).toBeVisible();
  await expect(agent).toBeFocused();
  await agent.fill("New researcher");
  await selectEditorSection(page, "Run plan");
  await page.getByLabel("Matched seeds").fill("3, 5");
  await page.getByLabel("Matched seeds").blur();
  await selectEditorSection(page, "Question");
  await expect(page.getByLabel("Experiment name")).toHaveValue(
    "Preserved experiment",
  );
  await selectEditorSection(page, "Agents");
  await expect(agent).toHaveValue("New researcher");
  await selectEditorSection(page, "Specification");
  const specification = page.getByLabel("Complete JSON specification");
  const design = JSON.parse(await specification.inputValue());
  expect(design.profiles.at(-1).name).toBe("New researcher");
  expect(design.seeds).toEqual([3, 5]);
  await specification.fill('{"unfinished":');
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The specification is not valid JSON",
  );
  await expect(specification).toHaveValue('{"unfinished":');
  design.seeds = [13, 17];
  await specification.fill(JSON.stringify(design));
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await page.getByRole("button", { name: "Seeds and repetitions" }).click();
  await expect(page.getByLabel("Seeds", { exact: true })).toHaveValue("13, 17");
  await selectEditorSection(page, "Run plan");
  await expect(page.getByLabel("Matched seeds")).toHaveValue("13, 17");
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\//);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.startsWith("jas:draft:")),
    ),
  ).toBe(false);
});

for (const width of [390, 1440]) {
  test(`only remote configuration uses skeletons while editor controls stay stable · ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/catalog", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/new?mode=advanced");
    await expect(
      page.getByRole("heading", { name: "New experiment", exact: true }),
    ).toBeVisible();
    const nav = page.getByRole("tablist", { name: "Experiment sections" });
    const before = await nav.boundingBox();
    await expect(
      page.getByRole("status", { name: "Loading experiment", exact: true }),
    ).toBeVisible();
    await expect(
      nav.getByRole("tab", { name: "General", exact: true }),
    ).toBeDisabled();
    release();
    await expect(
      nav.getByRole("tab", { name: "General", exact: true }),
    ).toBeEnabled();
    await selectEditorSection(page, "Question");
    await expect(
      page.getByLabel("Experiment name", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Loading experiment", exact: true }),
    ).toHaveCount(0);
    const after = await nav.boundingBox();
    expect(after?.x).toBe(before?.x);
    expect(after?.y).toBe(before?.y);
    expect(after?.height).toBe(before?.height);
  });
}

for (const [theme, width] of [
  ["light", 1440],
  ["dark", 390],
] as const) {
  test(`all environment configurations remain usable · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = await (await request.get("/api/catalog")).json();
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize({ width, height: 900 });
    for (const template of catalog.templates) {
      await page.goto(
        `/new?template=${template.id}&step=conditions&mode=advanced`,
      );
      const panel = page.getByRole("region", {
        name: "Conditions",
        exact: true,
      });
      await expect(panel).toBeVisible();
      const condition = panel.locator('[data-slot="accordion-item"]').first();
      await expect(
        condition.getByRole("textbox", {
          name: "Condition 1 name",
          exact: true,
        }),
      ).toBeVisible();
      const environment = catalog.environments.find(
        (item: { key: string }) => item.key === template.design.environment,
      );
      await expect(
        condition.getByLabel("Private signals", { exact: true }),
      ).toHaveCount(environment.parameters.includes("private_signal") ? 1 : 0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      // Sticky local navigation remains directly below the fixed global header.
      await panel.evaluate((element) =>
        element
          .closest('[data-slot="workspace-content"]')
          ?.scrollTo({ top: 500 }),
      );
      const global = await page
        .locator('[data-slot="workspace-header"]')
        .boundingBox();
      const local = await page
        .locator('[data-slot="editor-section-navigation"]')
        .boundingBox();
      expect(local?.y).toBe((global?.y ?? 0) + (global?.height ?? 0));
      await page.screenshot({
        path: testInfo.outputPath(`${template.id}-${theme}.png`),
        animations: "disabled",
      });
    }
  });
}

for (const width of [320, 1440]) {
  test(`blank creation preserves an unfinished draft and saves without running · ${width}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const starts: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/control")) starts.push(request.url());
    });
    await page.goto("/new");
    await expect(
      page.getByRole("tab", { name: "General", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const name = page.getByLabel("Experiment name", { exact: true });
    const question = page.getByRole("textbox", {
      name: "Question",
      exact: true,
    });
    await expect(name).toHaveValue("");
    await expect(question).toHaveValue("");
    await expect(
      page.getByLabel("Name for condition 1", { exact: true }),
    ).toHaveValue("Baseline");
    await expect(
      page.getByRole("button", { name: "Create", exact: true }),
    ).toBeDisabled();
    await expect(page.getByText("Nothing runs until you choose.")).toHaveCount(
      0,
    );
    await page.screenshot({
      path: testInfo.outputPath(`blank-editor-${width}.png`),
      animations: "disabled",
    });
    await name.fill("A new comparison");
    await page.reload();
    await expect(name).toHaveValue("A new comparison");
    await expect(question).toHaveValue("");
    await expect(
      page.getByText("Recover your draft", { exact: true }),
    ).toHaveCount(0);
    await question.fill("How do agents use a shared pool?");
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/experiments\/[a-f0-9]+$/);
    const id = page.url().split("/").at(-1);
    const saved = await (await request.get(`/api/studies/${id}`)).json();
    expect(saved.design.title).toBe("A new comparison");
    expect(saved.design.conditions).toHaveLength(1);
    expect(saved.design.profiles).toHaveLength(4);
    expect(
      saved.runs.every((run: { status: string }) => run.status === "ready"),
    ).toBe(true);
    expect(starts).toEqual([]);
    expect(
      (await (await request.get("/api/settings")).json()).usage.requests,
    ).toBe(0);
  });
}

for (const mode of ["General", "Advanced"]) {
  test(`keyboard environment changes require confirmation in ${mode}`, async ({
    page,
  }) => {
    await page.goto("/new");
    if (mode === "Advanced") await selectEditorSection(page, "Question");
    const environment = page.getByRole("combobox", {
      name: "Environment",
      exact: true,
    });
    await expect(environment).toHaveText("Shared commons");
    await environment.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Home");
    await expect(page.getByRole("option").first()).toBeFocused();
    await page.keyboard.press("Enter");
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toBeVisible();
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(confirmation).toHaveCount(0);
    await expect(environment).toHaveText("Shared commons");
  });
}
