import { useMutation } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResearchAssistant } from "@/components/assistant";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Empty } from "@/components/ui/data";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Select } from "@/components/ui/select";
import { api, useApi } from "@/lib/api";
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
      {studies.error && (
        <ErrorState error={studies.error} onRetry={studies.refetch} />
      )}
      {runs.error && <ErrorState error={runs.error} onRetry={runs.refetch} />}
      {kind === "design" ? (
        <DesignAssistant />
      ) : kind === "study" ? (
        <ResearchAssistant key={scope} studyId={id} />
      ) : (
        <ResearchAssistant key={scope} runId={id} />
      )}
    </>
  );
}

function DesignAssistant() {
  const [question, setQuestion] = useState("");
  const navigate = useNavigate();
  const plan = useMutation({
    mutationFn: () => api<{ id: string }>("/plan", { question }),
    onSuccess: (result) => navigate(`/new?plan=${result.id}`),
  });
  return (
    <div className="design-assistant">
      <Empty
        title="Start with a question"
        description="Describe what you want to understand about agents."
      >
        <div className="agent-suggestions">
          {[
            "When does cooperation break down?",
            "Does communication improve teamwork?",
            "How does oversight change decisions?",
          ].map((text) => (
            <Button
              key={text}
              variant="outline"
              onClick={() => setQuestion(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      </Empty>
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) plan.mutate();
        }}
      >
        <InputGroup>
          <InputGroupTextarea
            aria-label="Your research question"
            placeholder="What would you like to explore?"
            rows={3}
            maxLength={4000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
                event.currentTarget.form?.requestSubmit();
            }}
          />
          <InputGroupAddon>
            <span>Review the protocol before running.</span>
            <Button
              type="submit"
              size="icon"
              aria-label="Design experiment"
              disabled={!question.trim() || plan.isPending}
            >
              <ArrowUp />
            </Button>
          </InputGroupAddon>
        </InputGroup>
        {plan.error && <Alert variant="error">{plan.error.message}</Alert>}
      </form>
    </div>
  );
}
