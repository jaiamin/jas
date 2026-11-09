import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useRecordFavorites } from "./use-record-favorites";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test("bulk favorites set an explicit state without toggling existing favorites", () => {
  localStorage.setItem("jas:favorite:studies:first", "true");
  localStorage.setItem("jas:favorite:runs:first", "true");
  const { result } = renderHook(() => useRecordFavorites("studies"));
  act(() => result.current.setMany(["first", "second"], true));
  act(() => result.current.setMany(["first", "second"], true));
  expect(result.current.ids).toEqual(new Set(["first", "second"]));
  act(() => result.current.setMany(["first", "second"], false));
  expect(result.current.ids.size).toBe(0);
  expect(localStorage.getItem("jas:favorite:runs:first")).toBe("true");
});

test("a partially saved batch reflects persisted changes and can be retried", () => {
  const { result } = renderHook(() => useRecordFavorites("studies"));
  const original = Storage.prototype.setItem;
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key, value) {
      if (key.endsWith(":second")) throw new Error("Storage unavailable");
      original.call(this, key, value);
    });
  act(() => result.current.setMany(["first", "second"], true));
  expect(result.current.ids).toEqual(new Set(["first"]));
  expect(result.current.error).toContain("could not be saved");
  write.mockRestore();
  act(() => result.current.setMany(["first", "second"], true));
  expect(result.current.ids).toEqual(new Set(["first", "second"]));
  expect(result.current.error).toBe("");
});
