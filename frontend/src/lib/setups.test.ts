import { beforeEach, expect, test, vi } from "vitest";
import { design } from "@/test/fixtures";
import { listSetups, removeSetup, saveSetup } from "./setups";

beforeEach(() => localStorage.clear());
test("reusable setups update independently of saved experiments", () => {
  const id = saveSetup(design, "4.0.0");
  const renamed = { ...design, title: "Updated world" };
  saveSetup(renamed, "4.0.0", id);
  expect(listSetups()).toHaveLength(1);
  expect(listSetups()[0]?.title).toBe("Updated world");
  expect(design.title).not.toBe("Updated world");
  removeSetup(id);
  expect(listSetups()).toEqual([]);
});
test("storage corruption and write failures are explicit", () => {
  localStorage.setItem("jas:environment-setups", "{}");
  expect(listSetups).toThrow("Saved setups could not be read");
  localStorage.clear();
  const failure = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("Storage full");
    });
  expect(() => saveSetup(design, "4.0.0")).toThrow("Storage full");
  failure.mockRestore();
});
