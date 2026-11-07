import type { Design } from "@/lib/types";

const prefix = "ass:draft:";
export interface Draft {
  path: string;
  title: string;
  updated: string;
  design: unknown;
  json: string;
  mode: "visual" | "json";
}

export function readDraft(path: string): Draft | null {
  const raw = localStorage.getItem(prefix + path);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("path" in value) ||
    value.path !== path ||
    !/^\/new(?:\?|$)/.test(path) ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    !("updated" in value) ||
    typeof value.updated !== "string" ||
    !("json" in value) ||
    typeof value.json !== "string" ||
    !("mode" in value) ||
    !["visual", "json"].includes(String(value.mode)) ||
    !("design" in value)
  )
    throw new Error("This draft could not be read.");
  return value as Draft;
}

export function listDrafts(): Draft[] {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .map((key) => readDraft(key.slice(prefix.length)))
    .filter((draft): draft is Draft => draft !== null)
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

export function writeDraft(
  path: string,
  design: Design,
  json: string,
  mode: "visual" | "json",
) {
  localStorage.setItem(
    prefix + path,
    JSON.stringify({
      path,
      title: design.title,
      design,
      json,
      mode,
      updated: new Date().toISOString(),
    } satisfies Draft),
  );
}

export function removeDraft(path: string) {
  localStorage.removeItem(prefix + path);
}
