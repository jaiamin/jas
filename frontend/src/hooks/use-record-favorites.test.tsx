import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useRecordFavorites } from "@/hooks/use-record-favorites";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("favorites follow external storage changes and stay separate for experiments and runs", () => {
  const studies = renderHook(() => useRecordFavorites("studies"));
  const runs = renderHook(() => useRecordFavorites("runs"));
  act(() => {
    localStorage.setItem("jas:favorite:studies:one", "true");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "jas:favorite:studies:one" }),
    );
  });
  expect(studies.result.current.ids.has("one")).toBe(true);
  expect(runs.result.current.ids.size).toBe(0);
  act(() => {
    localStorage.removeItem("jas:favorite:studies:one");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "jas:favorite:studies:one" }),
    );
  });
  expect(studies.result.current.ids.size).toBe(0);
});

test("a failed removal preserves the saved favorite and can be retried", () => {
  localStorage.setItem("jas:favorite:runs:one", "true");
  const favorites = renderHook(() => useRecordFavorites("runs"));
  const remove = vi
    .spyOn(Storage.prototype, "removeItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  act(() => favorites.result.current.toggle("one"));
  expect(favorites.result.current.ids.has("one")).toBe(true);
  expect(favorites.result.current.error).toContain("could not be saved");
  remove.mockRestore();
  act(() => favorites.result.current.toggle("one"));
  expect(favorites.result.current.ids.size).toBe(0);
  expect(favorites.result.current.error).toBe("");
  expect(localStorage.getItem("jas:favorite:runs:one")).toBeNull();
});
