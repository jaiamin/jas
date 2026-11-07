import type { APIRequestContext } from "@playwright/test";
import type {
  Catalog,
  Design,
  EnvironmentId,
  RunDetail,
  StudyDetail,
} from "../src/lib/types.js";

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
