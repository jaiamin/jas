import { expect, test } from "vitest";
import { createHomeMap } from "./home-map";

test("decorative traffic follows closed streets without diagonal shortcuts or teleports", () => {
  for (const seed of [0, 1, 42, 4294967295]) {
    const { buildings, agents } = createHomeMap(seed);
    for (const agent of agents) {
      expect(agent.points.at(-1)).toEqual(agent.points[0]);
      for (let i = 1; i < agent.points.length; i++) {
        const [x, y] = agent.points[i];
        const [previousX, previousY] = agent.points[i - 1];
        expect(x === previousX || y === previousY).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1440);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(360);
      }
      expect(
        buildings.some((building) =>
          agent.points.every(([x, y]) => x === building.x && y === building.y),
        ),
      ).toBe(false);
    }
  }
});

test("traffic dwells only inside buildings and holds a valid native motion timeline", () => {
  const { agents, buildings } = createHomeMap(42);
  for (const agent of agents) {
    const times = agent.keyTimes.split(";").map(Number);
    const positions = agent.keyPoints.split(";").map(Number);
    const lengths = agent.points.slice(1).map(([x, y], index) => {
      const previous = agent.points[index];
      return Math.hypot(x - previous[0], y - previous[1]);
    });
    const distance = lengths.reduce((sum, length) => sum + length, 0);
    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBe(1);
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(1);
    expect(times).toHaveLength(positions.length);
    expect(agent.duration).toBeGreaterThan(0);
    expect(agent.begin).toBeLessThanOrEqual(0);
    expect(agent.begin).toBeGreaterThan(-agent.duration);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
      expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
      if (positions[i] !== positions[i - 1]) continue;
      let traveled = 0;
      const stop =
        agent.points[
          lengths.findIndex((length) => {
            traveled += length;
            return Math.abs(traveled / distance - positions[i]) < 0.000001;
          }) + 1
        ];
      expect(buildings.some(({ x, y }) => x === stop[0] && y === stop[1])).toBe(
        true,
      );
    }
  }
});
