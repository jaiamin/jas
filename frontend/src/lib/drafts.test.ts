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
  expect(listDrafts()).toHaveLength(1);
  removeDraft("/new?template=commons");
  expect(listDrafts()).toEqual([]);
  expect(localStorage.getItem("ass-theme")).toBe("dark");
});

test("corrupt or misplaced drafts are rejected without deleting data", () => {
  localStorage.setItem(
    "ass:draft:/new",
    JSON.stringify({ path: "https://example.com" }),
  );
  expect(() => readDraft("/new")).toThrow("could not be read");
  expect(localStorage.getItem("ass:draft:/new")).not.toBeNull();
});

test("assistant visibility does not change the editor draft identity", () => {
  expect(editorDraftPath("/new", "?template=commons&assistant=1")).toBe(
    "/new?template=commons",
  );
  expect(
    editorDraftPath("/new", "?study=study-1&revision=2&tab=research"),
  ).toBe("/new?study=study-1&revision=2");
  expect(editorDraftPath("/new", "?assistant=1")).toBe("/new");
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
  expect(listDrafts()).toHaveLength(1);
  writeDraft(path, { ...design, title: "Updated experiment" }, "{}", "visual");
  expect(localStorage.getItem(`ass:draft:${path}`)).toBeNull();
  expect(readDraft(path)?.title).toBe("Updated experiment");
  localStorage.setItem(`ass:draft:${path}`, legacy);
  expect(listDrafts()).toHaveLength(1);
  removeDraft(path);
  expect(listDrafts()).toEqual([]);
});
