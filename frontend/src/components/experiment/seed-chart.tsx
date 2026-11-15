import { label, metric } from "@/lib/format";
import { conditionIdentity } from "@/lib/identity";
import type { Comparison, Design } from "@/lib/types";

export function seedPoints(cells: Comparison["cells"], key: string) {
  const groups = new Map<number, number[]>();
  for (const cell of cells) {
    const value = cell.metrics[key];
    if (cell.status !== "complete" || value == null) continue;
    groups.set(cell.seed, [...(groups.get(cell.seed) ?? []), value]);
  }
  return [...groups].map(([seed, values]) => ({
    seed,
    value: values.reduce((a, b) => a + b, 0) / values.length,
    repetitions: values.length,
  }));
}

export function SeedChart({
  design,
  cells,
  metricKey,
  compact = false,
  conditionKey,
  domain,
}: {
  design: Design;
  cells: Comparison["cells"];
  metricKey: string;
  compact?: boolean;
  conditionKey?: string;
  domain?: [number, number];
}) {
  const groups = design.conditions
    .filter((condition) => !conditionKey || condition.key === conditionKey)
    .map((condition) => ({
      condition,
      points: seedPoints(
        cells.filter((cell) => cell.condition_key === condition.key),
        metricKey,
      ),
    }));
  const values = groups.flatMap((group) =>
    group.points.map((point) => point.value),
  );
  if (!values.length)
    return (
      <p className="text-sm text-muted-foreground">No eligible values yet.</p>
    );
  const minimum = domain?.[0] ?? Math.min(...values);
  const maximum = domain?.[1] ?? Math.max(...values);
  const padding =
    maximum === minimum
      ? Math.max(Math.abs(maximum) * 0.1, 0.1)
      : (maximum - minimum) * 0.1;
  const low = minimum - padding;
  const high = maximum + padding;
  const y = (value: number) => 120 - ((value - low) / (high - low)) * 100;
  const width = Math.max(compact ? 150 : 380, groups.length * 100);
  return (
    <svg
      viewBox={`0 0 ${width} 152`}
      role="img"
      aria-label={`${label(metricKey)} by condition, one dot per eligible seed`}
      className={compact ? "h-28 w-full" : "h-56 w-full"}
    >
      <title>
        {label(metricKey)}. Repetitions are averaged within each seed; missing
        values are excluded.
      </title>
      {[minimum, maximum]
        .filter((value, index, array) => array.indexOf(value) === index)
        .map((value) => (
          <g key={value}>
            <line
              x1={50}
              x2={width - 12}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--border)"
            />
            <text
              x={44}
              y={y(value) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {metric(metricKey, value)}
            </text>
          </g>
        ))}
      {groups.map(({ condition, points }, index) => {
        const x = 70 + ((width - 100) * (index + 0.5)) / groups.length;
        const identity = conditionIdentity(design, condition.key);
        return (
          <g key={condition.key}>
            {points.map((point, pointIndex) => (
              <circle
                key={point.seed}
                cx={x + ((pointIndex % 5) - 2) * 7}
                cy={y(point.value)}
                r={3.5}
                fill={identity.color}
                stroke="var(--background)"
                strokeWidth={1}
              >
                <title>
                  {condition.name} · seed {point.seed}:{" "}
                  {metric(metricKey, point.value)} · {point.repetitions}{" "}
                  eligible repetitions
                </title>
              </circle>
            ))}
            {!compact && (
              <text
                x={x}
                y={145}
                textAnchor="middle"
                fontSize={11}
                fill="var(--foreground)"
              >
                {condition.name.length > 18
                  ? `${condition.name.slice(0, 17)}…`
                  : condition.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
