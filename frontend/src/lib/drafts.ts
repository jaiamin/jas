import type { Design } from "@/lib/types";

const prefix = "jas:draft:";
const legacyPrefix = "ass:draft:";
export interface Draft {
  path: string;
  title: string;
  updated: string;
  design: unknown;
  json: string;
  mode: "visual" | "json";
}

export function readDraft(path: string): Draft | null {
  const raw =
    localStorage.getItem(prefix + path) ??
    localStorage.getItem(legacyPrefix + path);
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
  const paths = new Set(
    Object.keys(localStorage).flatMap((key) => {
      const matched = [prefix, legacyPrefix].find((value) =>
        key.startsWith(value),
      );
      return matched ? [key.slice(matched.length)] : [];
    }),
  );
  return [...paths]
    .map(readDraft)
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
  localStorage.removeItem(legacyPrefix + path);
}

export function removeDraft(path: string) {
  localStorage.removeItem(prefix + path);
  localStorage.removeItem(legacyPrefix + path);
}

export function editorDraftPath(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  params.delete("assistant");
  if (params.get("tab") === "research") params.delete("tab");
  const query = params.toString();
  return pathname + (query ? `?${query}` : "");
}
