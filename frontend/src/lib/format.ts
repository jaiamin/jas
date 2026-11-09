export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 0.1 ? 4 : 2,
  }).format(value);
export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
export const modelLabel = (value: string) =>
  value.split(":").at(-1)?.replace("gpt-", "GPT-") ?? value;
export const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

export function relativeTime(value: string, now = Date.now()) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Unknown time";
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000)
    return relativeTimeFormatter.format(
      -Math.floor(elapsed / 60_000),
      "minute",
    );
  if (elapsed < 86_400_000)
    return relativeTimeFormatter.format(
      -Math.floor(elapsed / 3_600_000),
      "hour",
    );
  if (elapsed < 604_800_000)
    return relativeTimeFormatter.format(
      -Math.floor(elapsed / 86_400_000),
      "day",
    );
  const edited = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(edited.getFullYear() !== new Date(now).getFullYear()
      ? { year: "numeric" }
      : {}),
  }).format(edited);
}
export const metric = (key: string, value: number | null | undefined) =>
  value == null
    ? "—"
    : key.includes("rate") || key === "forecast_error"
      ? new Intl.NumberFormat(undefined, {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(value)
      : value.toFixed(1);

export function runModelLabel(run: { models: string[] }) {
  return run.models.length > 1
    ? "Mixed models"
    : run.models.map(modelLabel).join(", ");
}
