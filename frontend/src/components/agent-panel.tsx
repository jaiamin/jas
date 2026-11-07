import { useState } from "react";
import { ResearchAssistant } from "@/components/assistant";
import { DesignComposer } from "@/components/design-composer";
import { ErrorState, Loading } from "@/components/shared";
import { Empty } from "@/components/ui/data";
import { Select } from "@/components/ui/select";
import { useApi } from "@/lib/api";
import type { RunSummary, StudySummary } from "@/lib/types";

export default function AgentPanel({
  studyId,
  runId,
}: {
  studyId?: string;
  runId?: string;
}) {
  const studies = useApi<StudySummary[]>("/studies");
  const runs = useApi<RunSummary[]>("/runs");
  const [scope, setScope] = useState(
    runId ? `run:${runId}` : studyId ? `study:${studyId}` : "design",
  );
  const [kind, id] = scope.split(":");
  const selectedStudy =
    kind === "study"
      ? id
      : (runs.data?.find((run) => run.id === id)?.study_id ?? studyId);
  const options = [
    { value: "design", label: "Design an experiment" },
    ...(studies.data ?? []).map((study) => ({
      value: `study:${study.id}`,
      label: `Experiment · ${study.title}`,
    })),
    ...(runs.data ?? [])
      .filter((run) => run.study_id === selectedStudy)
      .map((run) => ({
        value: `run:${run.id}`,
        label: `Rev ${run.revision} · ${run.condition} · seed ${run.seed} · rep ${run.repetition} · ${run.id.slice(0, 6)}`,
      })),
  ];
  if (studies.error || runs.error)
    return <ErrorState error={(studies.error || runs.error) as Error} />;
  if (!studies.data || !runs.data) return <Loading />;
  return (
    <>
      <div className="agent-context">
        <Select
          label="Agent context"
          value={scope}
          onValueChange={setScope}
          options={options}
        />
      </div>
      {kind === "design" ? (
        <div className="design-assistant">
          <Empty
            title="Start with a question"
            description="Build a protocol, then review it before running."
          />
          <DesignComposer suggestions />
        </div>
      ) : (
        <ResearchAssistant
          key={scope}
          studyId={kind === "study" ? id : undefined}
          runId={kind === "run" ? id : undefined}
        />
      )}
    </>
  );
}
