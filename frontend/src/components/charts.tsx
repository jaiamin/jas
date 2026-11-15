import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Empty } from "@/components/feedback";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { label, metric } from "@/lib/format";
import type { Measurement } from "@/lib/types";

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
  className,
}: {
  series: {
    id: string;
    name: string;
    measurements: Measurement[];
    color?: string;
    dash?: string;
  }[];
  metricKey: string;
  className?: string;
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
    <ChartContainer
      config={Object.fromEntries(
        series.map((s, index) => [
          `series${index}`,
          {
            label: s.name,
            color: s.color ?? `var(--chart-${(index % 6) + 1})`,
          },
        ]),
      )}
      className={className ?? "h-64 w-full"}
      role="img"
      aria-label={`${label(metricKey)} by round`}
    >
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
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                `Round ${payload[0]?.payload.round}`
              }
              formatter={(value, name) => (
                <>
                  <span className="text-muted-foreground">{String(name)}</span>
                  <span className="ml-auto tabular-nums">
                    {metric(metricKey, Number(value))}
                  </span>
                </>
              )}
            />
          }
        />
        {series.length > 1 && (
          <ChartLegend
            verticalAlign="top"
            align="left"
            iconType="plainline"
            formatter={(value) => (
              <span className="text-foreground">{value}</span>
            )}
          />
        )}
        {series.map((s, index) => (
          <Line
            key={s.id}
            name={s.name}
            dataKey={`series${index}`}
            stroke={`var(--color-series${index})`}
            strokeWidth={2}
            strokeDasharray={
              s.dash ??
              ["0", "7 4", "2 4", "8 3 2 3", "12 4", "6 3 2 3 2 3"][index % 6]
            }
            dot={data.length < 12 ? { r: 3, strokeWidth: 0 } : false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
