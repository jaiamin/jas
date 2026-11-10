import type { GenerationAuthorization } from "@/lib/types";

type Limits = Omit<GenerationAuthorization, "contract_id">;
type DraftLimits = { [K in keyof Limits]: number | null };

export const mechanicsFields = [
  ["max_candidates", "Candidate attempts", 1, 3, 1],
  ["max_requests", "Model requests", 1, 12, 1],
  ["max_output_tokens", "Output tokens per request", 512, 16384, 1],
  ["max_input_bytes", "Input bytes per request", 4096, 180000, 1],
  ["budget_usd", "Generation ceiling ($)", 0.01, 10, 0.01],
] as const;

export interface MechanicsDraft {
  format: "jas-mechanics-authoring-draft-v2";
  text: string;
  limits: DraftLimits;
  frozen: { id: string; sha256: string; text: string } | null;
}

export function validMechanicsLimits(limits: DraftLimits): limits is Limits {
  return mechanicsFields.every(([field, , min, max, step]) => {
    const value = limits[field];
    return (
      value !== null &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (step !== 1 || Number.isInteger(value))
    );
  });
}

export function newMechanicsDraft(): MechanicsDraft {
  return {
    format: "jas-mechanics-authoring-draft-v2",
    text: "",
    frozen: null,
    limits: {
      max_candidates: 1,
      max_requests: 6,
      max_output_tokens: 1024,
      max_input_bytes: 32000,
      budget_usd: 0.25,
    },
  };
}

/** Drafts may be unfinished; only validMechanicsLimits can turn them into authority. */
export function readMechanicsDraft(key: string): {
  value: MechanicsDraft;
  error: string | null;
} {
  try {
    const text = sessionStorage.getItem(key);
    if (text === null) return { value: newMechanicsDraft(), error: null };
    const value: unknown = JSON.parse(text);
    if (
      !value ||
      typeof value !== "object" ||
      !("format" in value) ||
      value.format !== "jas-mechanics-authoring-draft-v2" ||
      !("text" in value) ||
      typeof value.text !== "string" ||
      !("limits" in value) ||
      !value.limits ||
      typeof value.limits !== "object" ||
      !("frozen" in value)
    )
      throw new Error(
        "Incompatible mechanics draft format. The saved draft is kept.",
      );
    const limits = value.limits as Record<string, unknown>;
    for (const [field] of mechanicsFields) {
      if (
        limits[field] !== null &&
        (typeof limits[field] !== "number" || !Number.isFinite(limits[field]))
      )
        throw new Error(
          "Incompatible mechanics draft limits. The saved draft is kept.",
        );
    }
    if (value.frozen !== null) {
      const frozen = value.frozen;
      if (
        !frozen ||
        typeof frozen !== "object" ||
        !("id" in frozen) ||
        typeof frozen.id !== "string" ||
        !/^[a-f0-9]{16}$/.test(frozen.id) ||
        !("sha256" in frozen) ||
        typeof frozen.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(frozen.sha256) ||
        !("text" in frozen) ||
        frozen.text !== value.text ||
        Object.keys(frozen).length !== 3
      )
        throw new Error(
          "Incompatible frozen draft identity. The saved draft is kept.",
        );
    }
    if (
      Object.keys(value).some(
        (k) => !["format", "text", "limits", "frozen"].includes(k),
      ) ||
      Object.keys(limits).length !== 5
    )
      throw new Error(
        "Incompatible mechanics draft fields. The saved draft is kept.",
      );
    return { value: value as MechanicsDraft, error: null };
  } catch (error) {
    return {
      value: newMechanicsDraft(),
      error:
        error instanceof Error
          ? error.message
          : "Could not read the saved mechanics draft.",
    };
  }
}
