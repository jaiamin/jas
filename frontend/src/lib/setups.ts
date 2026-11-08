import type { Design } from "@/lib/types";

const key = "jas:environment-setups";
export interface Setup {
  id: string;
  title: string;
  environment: string;
  rules: string;
  updated: string;
  design: unknown;
}

export function listSetups(): Setup[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  const items: unknown = JSON.parse(raw);
  if (
    !Array.isArray(items) ||
    items.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        typeof item.title !== "string" ||
        typeof item.environment !== "string" ||
        typeof item.rules !== "string" ||
        typeof item.updated !== "string" ||
        !("design" in item),
    )
  ) {
    throw new Error(
      "Saved setups could not be read. Export or clear this browser's storage to recover.",
    );
  }
  return items;
}

export function saveSetup(design: Design, rules: string, id?: string) {
  const items = listSetups();
  const record: Setup = {
    id: id ?? crypto.randomUUID(),
    title: design.title,
    environment: design.environment,
    rules,
    updated: new Date().toISOString(),
    design,
  };
  localStorage.setItem(
    key,
    JSON.stringify([record, ...items.filter((item) => item.id !== record.id)]),
  );
  return record.id;
}

export function removeSetup(id: string) {
  localStorage.setItem(
    key,
    JSON.stringify(listSetups().filter((item) => item.id !== id)),
  );
}
