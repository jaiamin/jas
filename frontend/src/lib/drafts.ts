import type { Design } from "@/lib/types";

const prefix = "jas:draft:";
export interface Draft {
  path: string;
  title: string;
  updated: string;
  design: unknown;
  json: string;
  mode: "quick" | "visual" | "json";
  jsonDirty?: boolean;
  seedsInput?: string;
  environmentEdit?: { id: string; revision: number };
}

export function editorDraftPath(params: URLSearchParams): string {
  const source = new URLSearchParams();
  for (const key of [
    "plan",
    "study",
    "copy",
    "revision",
    "template",
    "starter",
    "environment",
    "setup",
  ]) {
    const value = params.get(key);
    if (value !== null) source.set(key, value);
  }
  return `/new${source.size ? `?${source}` : ""}`;
}

/** Returns null for a missing record; throws for corrupt records or inaccessible storage. */
export function readDraft(path: string): Draft | null {
  const raw = localStorage.getItem(prefix + path);
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    throw new Error("This draft could not be read.", { cause });
  }
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
    (value.mode !== "quick" &&
      value.mode !== "visual" &&
      value.mode !== "json") ||
    ("jsonDirty" in value && typeof value.jsonDirty !== "boolean") ||
    ("seedsInput" in value && typeof value.seedsInput !== "string") ||
    !("design" in value)
  )
    throw new Error("This draft could not be read.");
  let environmentEdit: Draft["environmentEdit"];
  if ("environmentEdit" in value && value.environmentEdit !== undefined) {
    const target = value.environmentEdit;
    if (
      !target ||
      typeof target !== "object" ||
      !("id" in target) ||
      typeof target.id !== "string" ||
      !/^[a-f0-9]{16}$/.test(target.id) ||
      !("revision" in target) ||
      typeof target.revision !== "number" ||
      !Number.isInteger(target.revision) ||
      target.revision < 1
    )
      throw new Error("This draft could not be read.");
    environmentEdit = { id: target.id, revision: target.revision };
  }
  return {
    path: value.path,
    title: value.title,
    updated: value.updated,
    json: value.json,
    mode: value.mode,
    jsonDirty:
      "jsonDirty" in value
        ? (value.jsonDirty as boolean)
        : value.mode === "json",
    design: value.design,
    seedsInput:
      "seedsInput" in value ? (value.seedsInput as string) : undefined,
    environmentEdit,
  };
}

/** Collects unreadable record paths separately; throws if storage cannot be enumerated. */
export function listDrafts(): { items: Draft[]; unreadable: string[] } {
  const items: Draft[] = [];
  const unreadable: string[] = [];
  const paths = Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
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
  mode: "quick" | "visual" | "json",
  environmentEdit?: Draft["environmentEdit"],
  jsonDirty = mode === "json",
  seedsInput?: string,
) {
  localStorage.setItem(
    prefix + path,
    JSON.stringify({
      path,
      title: design.title,
      design,
      json,
      mode,
      jsonDirty,
      seedsInput,
      environmentEdit,
      updated: new Date().toISOString(),
    } satisfies Draft),
  );
}

export function removeDraft(path: string) {
  localStorage.removeItem(prefix + path);
}
