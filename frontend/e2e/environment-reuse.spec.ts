import { expect, test } from "@playwright/test";

for (const origin of ["library", "newly-saved"]) {
  test(`environment editing survives a world change and draft reload · ${origin}`, async ({
    page,
    request,
  }) => {
    await page.goto("/new?template=trust_exchange");
    await page
      .getByLabel("Experiment name", { exact: true })
      .fill(`World change ${origin}`);
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/environments") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("menuitem", { name: "Save custom environment", exact: true })
      .click();
    const source = await (await saved).json();
    await expect(
      page.getByText("Custom environment saved.", { exact: false }),
    ).toBeVisible();
    if (origin === "library") await page.goto(`/new?setup=${source.id}`);
    await page
      .getByLabel("Research question", { exact: true })
      .fill(`Keep this question ${origin}`);
    await page
      .getByRole("combobox", { name: "Environment", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Shared commons", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Change environment", exact: true })
      .click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Environment", exact: true }),
    ).toHaveText("Shared commons");
    await expect(
      page.getByLabel("Research question", { exact: true }),
    ).toHaveValue(`Keep this question ${origin}`);
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    const update = page.getByRole("menuitem", {
      name: "Update custom environment",
      exact: true,
    });
    await expect(update).toBeVisible();
    const updated = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/environments/${source.id}`) &&
        response.request().method() === "PUT",
    );
    await update.click();
    expect((await updated).status()).toBe(200);
    const current = await (
      await request.get(`/api/environments/${source.id}`)
    ).json();
    expect(current.revision).toBe(2);
    expect(current.definition.environment).toBe("commons");
  });
}

for (const theme of ["light", "dark"]) {
  test(`reuse mechanics preserves independent experiments and stale drafts · ${theme}`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      (value) => localStorage.setItem("jas-theme", value),
      theme,
    );
    await page.setViewportSize(
      theme === "dark"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
    );
    const name = `Reusable stock ${theme}`;
    const originalQuestion = `Private original question ${theme}`;
    await page.goto("/new?template=composed");
    await page.getByLabel("Experiment name", { exact: true }).fill(name);
    await page
      .getByLabel("Research question", { exact: true })
      .fill(originalQuestion);
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    const savedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/environments") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("menuitem", { name: "Save custom environment", exact: true })
      .click();
    const response = await savedResponse;
    expect(response.status()).toBe(201);
    const source = await response.json();
    expect(source.format).toBe("jas-environment-v10");
    expect(JSON.stringify(source)).not.toContain(originalQuestion);
    await testInfo.attach("source-v1.json", {
      body: JSON.stringify(source, null, 2),
      contentType: "application/json",
    });
    await expect(
      page.getByText("Custom environment saved.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Environment source" }),
    ).toContainText("Revision 1");
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/studies\//);
    const firstId = new URL(page.url()).pathname.split("/").at(-1);
    const first = await (await request.get(`/api/studies/${firstId}`)).json();

    await page.goto("/environments?view=custom");
    await page.getByRole("link", { name, exact: true }).click();
    await page.getByRole("tab", { name: "Question", exact: true }).click();
    await expect(
      page.getByLabel("Research question", { exact: true }),
    ).not.toHaveValue(originalQuestion);
    const secondQuestion = `Different question for three participants ${theme}`;
    await page
      .getByLabel("Research question", { exact: true })
      .fill(secondQuestion);
    await page
      .getByLabel("Experiment name", { exact: true })
      .fill(`Second population ${theme}`);
    await page.getByRole("tab", { name: "Agents", exact: true }).click();
    await page.getByRole("button", { name: "Add agent", exact: true }).click();
    await page.getByRole("tab", { name: "Conditions", exact: true }).click();
    await page
      .getByRole("button", { name: "Configuration examples", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Configuration example", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Configuration 2", exact: true })
      .click();
    await page.getByRole("combobox", { name: /Participant for/ }).click();
    await page.getByRole("option", { name: "Agent 3", exact: true }).click();
    const appliedResponse = page.waitForResponse(
      (result) =>
        result.url().endsWith("/api/design/use-environment") &&
        result.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Apply configuration", exact: true })
      .click();
    expect((await appliedResponse).status()).toBe(200);
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(
      page.getByText("3 agents per run", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`reuse-${theme}.png`),
      animations: "disabled",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Create experiment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/studies\//);
    const secondId = new URL(page.url()).pathname.split("/").at(-1);
    const second = await (await request.get(`/api/studies/${secondId}`)).json();
    expect(first.design.question).toBe(originalQuestion);
    expect(second.design.question).toBe(secondQuestion);
    expect(first.design.profiles).toHaveLength(4);
    expect(second.design.profiles).toHaveLength(3);
    expect(second.design.conditions).toHaveLength(1);
    expect(second.design.hypothesis).toBe("");
    expect(second.design.environment_source).toEqual(source);
    expect(
      second.design.conditions[0].parameters.composition.resources[0]
        .controllers,
    ).toEqual(["agent-3"]);
    expect(
      second.design.conditions[0].parameters.composition.resources[0]
        .allocation_visibility,
    ).toBe("parties");

    const draftURL = `/new?setup=${source.id}`;
    await page.goto(draftURL);
    await page
      .getByLabel("Research question", { exact: true })
      .fill(`Retained draft ${theme}`);
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await page.goto("/environments?view=custom");
    const changed = structuredClone(source.definition);
    changed.examples[0].parameters.composition.resources[0].initial_stock = 9;
    const updated = await request.put(`/api/environments/${source.id}`, {
      data: { definition: changed, revision: 1 },
    });
    expect(updated.status()).toBe(200);
    await page.goto(draftURL);
    await expect(
      page.getByLabel("Research question", { exact: true }),
    ).toHaveValue(`Retained draft ${theme}`);
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .click();
    const conflictResponse = page.waitForResponse(
      (result) =>
        result.url().endsWith(`/api/environments/${source.id}`) &&
        result.request().method() === "PUT",
    );
    await page
      .getByRole("menuitem", { name: "Update custom environment", exact: true })
      .click();
    expect((await conflictResponse).status()).toBe(409);
    await expect(page.getByRole("alert")).toContainText(
      "changed since opening",
    );
    expect(
      (
        await request.delete(`/api/environments/${source.id}?revision=2`)
      ).status(),
    ).toBe(200);
    await page.reload();
    await expect(
      page.getByLabel("Research question", { exact: true }),
    ).toHaveValue(`Retained draft ${theme}`);
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Environment source" }),
    ).toContainText("Revision 1");
    for (const study of [first, second]) {
      const exported = await (
        await request.get(`/api/studies/${study.id}/export`)
      ).json();
      expect(exported.version).toBe(17);
      expect(exported.study.design).toEqual(study.design);
      expect(exported.revisions[0].design.environment_source).toEqual(source);
      await testInfo.attach(`${study.id}-export.json`, {
        body: JSON.stringify(exported, null, 2),
        contentType: "application/json",
      });
    }
    expect(
      (await (await request.get("/api/settings")).json()).usage.requests,
    ).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
