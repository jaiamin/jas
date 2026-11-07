import { beforeEach, expect, test } from "vitest";
import { listDrafts, readDraft, removeDraft, writeDraft } from "@/lib/drafts";
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
