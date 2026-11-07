import { BookOpen, FileSearch, Layers2, PenLine, ScanLine } from "lucide-react";
import { TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

const stages = {
  answering: { label: "Thinking", icon: null },
  writing: { label: "Writing", icon: PenLine },
  indexing: { label: "Indexing the experiment", icon: Layers2 },
  investigating: { label: "Investigating the evidence", icon: FileSearch },
  reading: { label: "Reading recorded turns", icon: BookOpen },
  scoping: { label: "Scoping the question", icon: null },
  researching: { label: "Researching methods", icon: FileSearch },
  drafting: { label: "Drafting the protocol", icon: PenLine },
  reviewing: { label: "Reviewing the design", icon: ScanLine },
  revising: { label: "Refining the protocol", icon: PenLine },
};

export function AgentActivity({ stage }: { stage?: string }) {
  const { label, icon: Icon } =
    stages[stage as keyof typeof stages] ?? stages.answering;
  return (
    <TraceLine className="agent-activity" status="running" role="status">
      <TraceIcon>
        {Icon ? (
          <Icon />
        ) : (
          <span className="agent-thinking" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </TraceIcon>
      <TraceTitle>{label}</TraceTitle>
    </TraceLine>
  );
}
