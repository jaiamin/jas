import type { ResearchActivity } from "./types";

interface ChatProgress {
  status: "pending" | "complete" | "failed";
  purpose: "general" | "design" | "analysis";
  partial?: string;
  introduction?: string;
  stage?: string;
  activity?: string[];
  research?: ResearchActivity;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function researchActivity(value: unknown): value is ResearchActivity {
  if (
    !object(value) ||
    value.version !== 1 ||
    !object(value.scope) ||
    typeof value.scope.chat_id !== "string" ||
    typeof value.scope.before !== "string" ||
    typeof value.scope.context_limit !== "number" ||
    !object(value.scope.cutoffs) ||
    Object.values(value.scope.cutoffs).some(
      (cutoff) =>
        typeof cutoff !== "number" || !Number.isInteger(cutoff) || cutoff < 0,
    ) ||
    (value.stop_reason !== null && typeof value.stop_reason !== "string") ||
    !Array.isArray(value.operations) ||
    value.operations.length > 12
  )
    return false;
  return value.operations.every(
    (operation) =>
      object(operation) &&
      typeof operation.id === "string" &&
      typeof operation.summary === "string" &&
      object(operation.request) &&
      ["capabilities", "context", "probe"].includes(
        String(operation.request.kind),
      ) &&
      ["pending", "complete", "rejected", "failed"].includes(
        String(operation.status),
      ) &&
      (operation.data === null || object(operation.data)) &&
      Array.isArray(operation.sources) &&
      operation.sources.every(
        (source: unknown) =>
          object(source) &&
          ["builtin", "analysis", "run"].includes(String(source.kind)) &&
          typeof source.id === "string" &&
          typeof source.hash === "string" &&
          (source.turn === undefined ||
            (typeof source.turn === "number" &&
              Number.isInteger(source.turn) &&
              source.turn >= 0)),
      ),
  );
}

/** Decode live prose/activity only; persisted queries own the complete analysis record. */
export function chatProgress(
  data: string,
  messageId: string,
): ChatProgress | null {
  try {
    const row: unknown = JSON.parse(data);
    if (
      !row ||
      typeof row !== "object" ||
      !("id" in row) ||
      row.id !== messageId ||
      !("status" in row)
    )
      return null;
    if (
      row.status !== "pending" &&
      row.status !== "complete" &&
      row.status !== "failed"
    )
      return null;
    if (
      !("output" in row) ||
      !row.output ||
      typeof row.output !== "object" ||
      Array.isArray(row.output)
    )
      return null;
    const purpose = "purpose" in row ? row.purpose : undefined;
    if (purpose !== "general" && purpose !== "design" && purpose !== "analysis")
      return null;
    const output = row.output;
    const partial = "partial" in output ? output.partial : undefined;
    const introduction =
      "introduction" in output ? output.introduction : undefined;
    const stage = "stage" in output ? output.stage : undefined;
    if (partial !== undefined && typeof partial !== "string") return null;
    if (introduction !== undefined && typeof introduction !== "string")
      return null;
    if (stage !== undefined && typeof stage !== "string") return null;
    const activity = "activity" in output ? output.activity : undefined;
    const research = "research" in output ? output.research : undefined;
    if (research !== undefined && !researchActivity(research)) return null;
    if (
      activity !== undefined &&
      (!Array.isArray(activity) ||
        activity.some((stage) => typeof stage !== "string"))
    )
      return null;
    return {
      ...(activity ? { activity } : {}),
      ...(research ? { research } : {}),
      ...(introduction !== undefined ? { introduction } : {}),
      status: row.status,
      partial,
      stage,
      purpose,
    };
  } catch {
    return null;
  }
}
