import type { RunRecording } from "@/lib/types";

export async function loadRecording(id: string): Promise<RunRecording> {
  if (!/^[a-z0-9-]{1,60}$/.test(id)) throw new Error("Unknown recorded run.");
  const response = await fetch(`/recordings/${id}.json`);
  if (!response.ok)
    throw new Error("The recorded run could not load. Try again.");
  const value: RunRecording = await response.json();
  if (
    value.version !== 1 ||
    value.provenance !== "scripted" ||
    !Array.isArray(value.evidence)
  )
    throw new Error("This recording needs a newer JAS viewer.");
  return value;
}

export function markWatched() {
  try {
    localStorage.setItem("jas:onboarding:watched", "true");
  } catch {
    /* Playback works without browser storage. */
  }
}
