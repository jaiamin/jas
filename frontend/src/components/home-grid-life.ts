export type LifeCell = {
  index: number;
  color: "red" | "blue" | "purple";
  opacity: number;
};

export type LifeAgent = {
  id: number;
  x: number;
  y: number;
  color: LifeCell["color"];
};

// A decorative local world: bounded populations, renewable patches, persistent
// paths and brief encounters. It never calls the application or a model.
export function createGridLife(columns: number, rows: number, seed: number) {
  const area = columns * rows;
  const fields = {
    red: new Float32Array(area),
    blue: new Float32Array(area),
    purple: new Float32Array(area),
  };
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (randomState + 0x6d2b79f5) | 0;
    let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const patchCount = Math.min(
    columns,
    Math.max(2, Math.min(8, Math.round(columns / 11))),
  );
  const patches = Array.from({ length: patchCount }, (_, index) => ({
    x: Math.floor(((index + 0.5) * columns) / patchCount),
    y: Math.floor(random() * rows),
    stock: 1,
  }));
  const agents = Array.from(
    {
      length: Math.min(area, Math.max(8, Math.min(48, Math.round(area / 25)))),
    },
    (_, index) => ({
      x: Math.floor(random() * columns),
      y: Math.floor(random() * rows),
      color: index % 2 ? ("red" as const) : ("blue" as const),
      heading: Math.floor(random() * 4),
      target: index % patches.length,
      rest: Math.floor(random() * 3),
    }),
  );
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const blooms: {
    x: number;
    y: number;
    age: number;
    color: LifeCell["color"];
  }[] = [];
  const bloom = (x: number, y: number, color: LifeCell["color"]) => {
    if (blooms.length < 8) blooms.push({ x, y, age: 0, color });
  };
  const paint = (
    x: number,
    y: number,
    opacity: number,
    color: LifeCell["color"] = "purple",
  ) => {
    if (x < 0 || x >= columns || y < 0 || y >= rows) return;
    const index = y * columns + x;
    fields[color][index] = Math.max(fields[color][index], opacity);
  };
  const cells = (): LifeCell[] => {
    const result: LifeCell[] = [];
    for (let index = 0; index < area; index++) {
      const red = fields.red[index];
      const blue = fields.blue[index];
      const purple = Math.max(fields.purple[index], Math.min(red, blue) * 1.6);
      const opacity = Math.min(0.48, Math.max(red, blue, purple));
      if (opacity < 0.025) continue;
      result.push({
        index,
        color:
          purple >= Math.max(red, blue)
            ? "purple"
            : red > blue
              ? "red"
              : "blue",
        opacity: Math.round(opacity * 1000) / 1000,
      });
    }
    return result;
  };
  const step = () => {
    for (let index = 0; index < area; index++) {
      fields.red[index] *= 0.83;
      fields.blue[index] *= 0.83;
      fields.purple[index] *= 0.87;
    }
    for (const patch of patches) {
      patch.stock = Math.min(1, patch.stock + 0.035);
      paint(patch.x, patch.y, 0.05 + patch.stock * 0.06);
      for (const [dx, dy] of directions) {
        paint(patch.x + dx, patch.y + dy, 0.035 + patch.stock * 0.045);
      }
    }
    for (const agent of agents) {
      const field = fields[agent.color];
      if (agent.rest > 0) {
        agent.rest--;
      } else {
        const patch = patches[agent.target];
        const dx = patch.x - agent.x;
        const dy = patch.y - agent.y;
        field[agent.y * columns + agent.x] = Math.min(
          field[agent.y * columns + agent.x],
          0.18,
        );
        if (Math.abs(dx) + Math.abs(dy) <= 1 && patch.stock > 0.25) {
          patch.stock -= 0.25;
          agent.rest = 2 + Math.floor(random() * 3);
          agent.target =
            (agent.target +
              1 +
              Math.floor(random() * Math.max(1, patches.length - 1))) %
            patches.length;
          paint(patch.x, patch.y, 0.22);
          if (random() < 0.35) bloom(patch.x, patch.y, agent.color);
        } else {
          if (Math.abs(dx) + Math.abs(dy) <= 1 && patch.stock <= 0.25) {
            agent.target = (agent.target + 1) % patches.length;
          }
          if (random() < 0.56 && (dx !== 0 || dy !== 0)) {
            agent.heading =
              random() * (Math.abs(dx) + Math.abs(dy)) < Math.abs(dx)
                ? dx > 0
                  ? 0
                  : 2
                : dy > 0
                  ? 1
                  : 3;
          } else if (random() < 0.35) {
            agent.heading = (agent.heading + (random() < 0.5 ? 1 : 3)) % 4;
          }
          let [mx, my] = directions[agent.heading];
          if (
            agent.x + mx < 0 ||
            agent.x + mx >= columns ||
            agent.y + my < 0 ||
            agent.y + my >= rows
          ) {
            agent.heading = (agent.heading + 2) % 4;
            [mx, my] = directions[agent.heading];
          }
          agent.x = Math.max(0, Math.min(columns - 1, agent.x + mx));
          agent.y = Math.max(0, Math.min(rows - 1, agent.y + my));
        }
      }
      field[agent.y * columns + agent.x] = 0.38;
    }
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        if (
          a.color === b.color ||
          Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1 ||
          random() > 0.3
        )
          continue;
        a.rest = Math.max(a.rest, 1);
        b.rest = Math.max(b.rest, 1);
        paint(a.x, a.y, 0.4);
        paint(b.x, b.y, 0.4);
        for (const [dx, dy] of directions) paint(a.x + dx, a.y + dy, 0.13);
        if (random() < 0.2) bloom(a.x, a.y, "purple");
      }
    }
    for (let index = blooms.length - 1; index >= 0; index--) {
      const event = blooms[index];
      const radius = Math.floor(event.age / 2);
      const opacity = 0.23 * (1 - event.age / 10);
      for (let dx = -radius; dx <= radius; dx++) {
        const dy = radius - Math.abs(dx);
        paint(event.x + dx, event.y + dy, opacity, event.color);
        paint(event.x + dx, event.y - dy, opacity, event.color);
      }
      if (++event.age >= 8) blooms.splice(index, 1);
    }
    return cells();
  };
  // Begin with an inhabited world, rather than an empty grid or a second
  // static illustration. Paused/reduced-motion states hold this same world.
  for (let tick = 0; tick < 24; tick++) step();
  return {
    cells,
    step,
    agents: (): LifeAgent[] =>
      agents.map((agent, id) => ({
        id,
        x: agent.x,
        y: agent.y,
        color:
          fields.purple[agent.y * columns + agent.x] >= 0.3
            ? "purple"
            : agent.color,
      })),
  };
}
