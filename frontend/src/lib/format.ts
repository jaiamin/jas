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
