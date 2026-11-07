import { beforeEach, expect, test } from "vitest";
import {
  editorDraftPath,
  listDrafts,
  readDraft,
  removeDraft,
  writeDraft,
} from "@/lib/drafts";
import type { Design } from "@/lib/types";

beforeEach(() => localStorage.clear());

test("drafts preserve incomplete edits and invalid JSON without affecting other storage", () => {
  const design = { title: "", profiles: [] } as unknown as Design;
  localStorage.setItem("ass-theme", "dark");
  writeDraft("/new?template=commons", design, '{"unfinished":', "json");
  expect(readDraft("/new?template=commons")).toMatchObject({
    design,
    json: '{"unfinished":',
    mode: "json",
  });
  expect(listDrafts().items).toHaveLength(1);
  removeDraft("/new?template=commons");
  expect(listDrafts()).toEqual({ items: [], unreadable: [] });
  expect(localStorage.getItem("ass-theme")).toBe("dark");
});

test("listing isolates corrupt drafts and preserves their contents for recovery", () => {
  writeDraft(
    "/new?template=commons",
    { title: "Valid" } as Design,
    "{}",
    "visual",
  );
  localStorage.setItem("jas:draft:/new?template=broken", "{unfinished");
  expect(listDrafts()).toMatchObject({
    items: [{ title: "Valid" }],
    unreadable: ["/new?template=broken"],
  });
  expect(localStorage.getItem("jas:draft:/new?template=broken")).toBe(
    "{unfinished",
  );
});

test("mode accepts only the declared string literals", () => {
  writeDraft("/new", { title: "Valid" } as Design, "{}", "visual");
  const stored = JSON.parse(localStorage.getItem("jas:draft:/new") ?? "{}");
  localStorage.setItem(
    "jas:draft:/new",
    JSON.stringify({ ...stored, mode: ["visual"] }),
  );
  expect(() => readDraft("/new")).toThrow("could not be read");
});

test("corrupt or misplaced drafts are rejected without deleting data", () => {
  localStorage.setItem(
    "jas:draft:/new",
    JSON.stringify({ path: "https://example.com" }),
  );
  expect(() => readDraft("/new")).toThrow("could not be read");
  expect(localStorage.getItem("jas:draft:/new")).not.toBeNull();
});

test("editor identity follows source parameters and ignores presentation and ordering", () => {
  expect(
    editorDraftPath(new URLSearchParams("assistant&template=commons")),
  ).toBe(editorDraftPath(new URLSearchParams("template=commons")));
  expect(
    editorDraftPath(new URLSearchParams("revision=2&study=one&assistant")),
  ).toBe("/new?study=one&revision=2");
  expect(editorDraftPath(new URLSearchParams("template=trust"))).not.toBe(
    editorDraftPath(new URLSearchParams("template=commons")),
  );
});

test("legacy drafts survive the JAS rename, deduplicate, and can be saved or discarded", () => {
  const path = "/new?template=commons";
  const design = {
    title: "Existing experiment",
    profiles: [],
  } as unknown as Design;
  const legacy = JSON.stringify({
    path,
    title: design.title,
    design,
    json: "{}",
    mode: "visual",
    updated: "2026-01-01",
  });
  localStorage.setItem(`ass:draft:${path}`, legacy);
  expect(readDraft(path)?.title).toBe(design.title);
  expect(listDrafts().items).toHaveLength(1);
  writeDraft(path, { ...design, title: "Updated experiment" }, "{}", "visual");
  expect(localStorage.getItem(`ass:draft:${path}`)).toBeNull();
  expect(readDraft(path)?.title).toBe("Updated experiment");
  localStorage.setItem(`ass:draft:${path}`, legacy);
  expect(listDrafts().items).toHaveLength(1);
  removeDraft(path);
  expect(listDrafts()).toEqual({ items: [], unreadable: [] });
});
