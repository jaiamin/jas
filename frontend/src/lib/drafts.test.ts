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
  localStorage.setItem("ass:draft:/new?template=broken", "{unfinished");
  expect(listDrafts()).toMatchObject({
    items: [{ title: "Valid" }],
    unreadable: ["/new?template=broken"],
  });
  expect(localStorage.getItem("ass:draft:/new?template=broken")).toBe(
    "{unfinished",
  );
});

test("mode accepts only the declared string literals", () => {
  writeDraft("/new", { title: "Valid" } as Design, "{}", "visual");
  const stored = JSON.parse(localStorage.getItem("ass:draft:/new") ?? "{}");
  localStorage.setItem(
    "ass:draft:/new",
    JSON.stringify({ ...stored, mode: ["visual"] }),
  );
  expect(() => readDraft("/new")).toThrow("could not be read");
});

test("corrupt or misplaced drafts are rejected without deleting data", () => {
  localStorage.setItem(
    "ass:draft:/new",
    JSON.stringify({ path: "https://example.com" }),
  );
  expect(() => readDraft("/new")).toThrow("could not be read");
  expect(localStorage.getItem("ass:draft:/new")).not.toBeNull();
});
