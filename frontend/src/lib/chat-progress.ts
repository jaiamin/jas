interface ChatProgress {
  status: "pending" | "complete" | "failed";
  partial?: string;
  stage?: string;
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
    const output = row.output;
    const partial = "partial" in output ? output.partial : undefined;
    const stage = "stage" in output ? output.stage : undefined;
    if (partial !== undefined && typeof partial !== "string") return null;
    if (stage !== undefined && typeof stage !== "string") return null;
    return { status: row.status, partial, stage };
  } catch {
    return null;
  }
}
