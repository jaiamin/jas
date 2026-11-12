import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import type {
  Catalog,
  Design,
  EnvironmentId,
  RunDetail,
  StudyDetail,
} from "../src/lib/types.js";

export function expandEvidence<
  T = {
    version: number;
    study: StudyDetail;
    requests: unknown[];
    runs: unknown[];
  },
>(text: string): T {
  const file = JSON.parse(text);
  expect(file.representation).toBe("shared-values-v1");
  expect(file.reading_guide).toContain("plain JSON");
  const shared = file.shared_values;
  const reference = file.reference_key;
  for (const key of [
    "representation",
    "reading_guide",
    "overview",
    "reference_key",
    "shared_values",
  ]) {
    delete file[key];
  }
  function resolve(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(resolve);
    if (value !== null && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (Object.keys(record).length === 1 && reference in record) {
        return resolve(shared[String(record[reference])]);
      }
      return Object.fromEntries(
        Object.entries(record).map(([key, item]) => [key, resolve(item)]),
      );
    }
    return value;
  }
  return resolve(file) as T;
}

export function templateDesign(
  catalog: Catalog,
  environment: EnvironmentId = "commons",
): Design {
  const template = catalog.templates.find(
    (template) => template.id === environment,
  );
  if (!template) throw new Error(`Missing ${environment} test template`);
  return structuredClone(template.design);
}

export async function createStudy(request: APIRequestContext) {
  const catalog: Catalog = await (await request.get("/api/catalog")).json();
  const created = await (
    await request.post("/api/studies", {
      data: { design: templateDesign(catalog) },
    })
  ).json();
  const study: StudyDetail = await (
    await request.get(`/api/studies/${created.id}`)
  ).json();
  const run: RunDetail = await (
    await request.get(`/api/runs/${study.runs[0]?.id}`)
  ).json();
  return { study, run };
}

export async function selectText(page: Page, text: Locator) {
  await text.scrollIntoViewIfNeeded();
  const bounds = await text.evaluate((element) => {
    const node = document
      .createTreeWalker(element, NodeFilter.SHOW_TEXT)
      .nextNode();
    if (!node) throw new Error("Control has no text");
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(12, node.textContent?.length ?? 0));
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y + rect.height / 2, width: rect.width };
  });
  await page.mouse.move(bounds.x + 1, bounds.y);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 1, bounds.y, { steps: 10 });
  await page.mouse.up();
  expect(
    await page.evaluate(() => document.getSelection()?.toString().length),
  ).toBeGreaterThan(0);
}
