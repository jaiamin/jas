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

export function editorDraftPath(params: URLSearchParams): string {
  const source = new URLSearchParams();
  for (const key of ["plan", "study", "revision", "template"]) {
    const value = params.get(key);
    if (value !== null) source.set(key, value);
  }
  return `/new${source.size ? `?${source}` : ""}`;
}

/** Returns null for a missing record; throws for corrupt records or inaccessible storage. */
export function readDraft(path: string): Draft | null {
  const raw =
    localStorage.getItem(prefix + path) ??
    localStorage.getItem(legacyPrefix + path);
  if (raw === null) return null;
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
    (value.mode !== "visual" && value.mode !== "json") ||
    !("design" in value)
  )
    throw new Error("This draft could not be read.");
  return {
    path: value.path,
    title: value.title,
    updated: value.updated,
    json: value.json,
    mode: value.mode,
    design: value.design,
  };
}

/** Collects unreadable record paths separately; throws if storage cannot be enumerated. */
export function listDrafts(): { items: Draft[]; unreadable: string[] } {
  const items: Draft[] = [];
  const unreadable: string[] = [];
  const paths = new Set(
    Object.keys(localStorage).flatMap((key) => {
      const matched = [prefix, legacyPrefix].find((candidate) =>
        key.startsWith(candidate),
      );
      return matched ? [key.slice(matched.length)] : [];
    }),
  );
  for (const path of paths) {
    try {
      const draft = readDraft(path);
      if (draft) items.push(draft);
    } catch {
      unreadable.push(path);
    }
  }
  return {
    items: items.sort((a, b) => b.updated.localeCompare(a.updated)),
    unreadable,
  };
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
