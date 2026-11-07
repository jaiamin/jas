import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Empty } from "@/components/ui/data";
import type { Measurement } from "@/lib/types";
import { label, metric } from "@/lib/utils";

export function roundSeries(measurements: Measurement[], key: string) {
  const groups = new Map<number, number[]>();
  for (const measurement of measurements) {
    if (measurement.key !== key || measurement.value === null) continue;
    const values =
      key === "completion_rate" ? [] : (groups.get(measurement.round) ?? []);
    values.push(measurement.value);
    groups.set(measurement.round, values);
  }
  return [...groups]
    .sort(([a], [b]) => a - b)
    .map(([round, values]) => ({
      round,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }));
}
export function MetricChart({
  series,
  metricKey,
}: {
  series: { id: string; name: string; measurements: Measurement[] }[];
  metricKey: string;
}) {
  const rows = new Map<number, Record<string, number>>();
  series.forEach((s, index) => {
    for (const point of roundSeries(s.measurements, metricKey))
      rows.set(point.round, {
        ...rows.get(point.round),
        round: point.round,
        [`series${index}`]: point.value,
      });
  });
  const data = [...rows.values()].sort(
    (a, b) => (a.round ?? 0) - (b.round ?? 0),
  );
  if (!data.length)
    return (
      <Empty
        title="No measurements yet"
        description="This chart fills with recorded outcomes as turns settle."
      />
    );
  return (
    <div
      className="metric-chart"
      role="img"
      aria-label={`${label(metricKey)} by round`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 14, right: 12, bottom: 12, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="round"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            label={{
              value: "Round",
              position: "insideBottom",
              offset: -10,
              fill: "var(--muted-foreground)",
              fontSize: 12,
            }}
          />
          <YAxis
            tickFormatter={(value) => metric(metricKey, Number(value))}
            tickLine={false}
            axisLine={false}
            width={54}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            domain={
              metricKey.includes("rate") || metricKey === "forecast_error"
                ? [0, 1]
                : ["auto", "auto"]
            }
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--foreground)",
              fontSize: 12,
            }}
            formatter={(value) => metric(metricKey, Number(value))}
            labelFormatter={(value) => `Round ${value}`}
          />
          {series.length > 1 && (
            <Legend verticalAlign="top" align="right" iconType="plainline" />
          )}
          {series.map((s, index) => (
            <Line
              key={s.id}
              name={s.name}
              dataKey={`series${index}`}
              stroke={`var(--chart-${(index % 6) + 1})`}
              strokeWidth={2}
              dot={data.length < 12 ? { r: 3, strokeWidth: 0 } : false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
