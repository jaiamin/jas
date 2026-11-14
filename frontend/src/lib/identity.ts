import type { Design } from "@/lib/types";

export function conditionIdentity(design: Design, key: string) {
  const index = Math.max(
    0,
    design.conditions.findIndex((condition) => condition.key === key),
  );
  return {
    color: `var(--chart-${(index % 6) + 1})`,
    dash: ["0", "7 4", "2 4", "8 3 2 3", "12 4", "6 3 2 3 2 3"][index % 6],
  };
}

export function agentIdentity(key: string) {
  const hash = Array.from(key).reduce(
    (value, character) =>
      (Math.imul(value, 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  return {
    color: `var(--agent-${(hash % 6) + 1})`,
    glyph: ["●", "◆", "▲", "■", "✚", "✦"][Math.floor(hash / 6) % 6],
  };
}
