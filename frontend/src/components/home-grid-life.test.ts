import { expect, test } from "vitest";
import { createGridLife } from "./home-grid-life";

test("a seeded ecosystem reproduces its evolving paths and encounters", () => {
  const a = createGridLife(60, 18, 42);
  const b = createGridLife(60, 18, 42);
  expect(a.cells()).toEqual(b.cells());
  for (let tick = 0; tick < 100; tick++) expect(a.step()).toEqual(b.step());
  expect(a.cells()).not.toEqual(createGridLife(60, 18, 43).cells());
});

test.each([
  [1, 1],
  [1, 24],
  [144, 1],
  [60, 18],
  [144, 24],
])(
  "an ecosystem stays within %i × %i and keeps its opacity bounded",
  (columns, rows) => {
    const world = createGridLife(columns, rows, 0);
    for (let tick = 0; tick < 300; tick++) {
      const frame = world.step();
      expect(frame.length).toBeLessThanOrEqual(columns * rows);
      expect(new Set(frame.map((cell) => cell.index)).size).toBe(frame.length);
      for (const cell of frame) {
        expect(cell.index).toBeGreaterThanOrEqual(0);
        expect(cell.index).toBeLessThan(columns * rows);
        expect(cell.opacity).toBeGreaterThanOrEqual(0.025);
        expect(cell.opacity).toBeLessThanOrEqual(0.48);
      }
    }
  },
);

test("the world keeps exploring and mixing colors over a long visit", () => {
  const world = createGridLife(60, 18, 19);
  let before = world.cells();
  for (let visit = 0; visit < 20; visit++) {
    for (let tick = 0; tick < 50; tick++) world.step();
    const after = world.cells();
    expect(after).not.toEqual(before);
    expect(new Set(after.map((cell) => cell.color))).toEqual(
      new Set(["red", "blue", "purple"]),
    );
    before = after;
  }
});
