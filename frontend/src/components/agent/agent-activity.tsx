import {
  BookOpen,
  FileSearch,
  Layers2,
  LoaderCircle,
  PenLine,
  ScanLine,
} from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import { TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

const stages = {
  answering: { label: "Thinking", icon: LoaderCircle },
  writing: { label: "Writing", icon: PenLine },
  indexing: { label: "Indexing the experiment", icon: Layers2 },
  investigating: { label: "Investigating the evidence", icon: FileSearch },
  reading: { label: "Reading recorded turns", icon: BookOpen },
  scoping: { label: "Scoping the question", icon: LoaderCircle },
  researching: { label: "Researching methods", icon: FileSearch },
  drafting: { label: "Drafting the protocol", icon: PenLine },
  reviewing: { label: "Reviewing the design", icon: ScanLine },
  revising: { label: "Refining the protocol", icon: PenLine },
};

export function AgentActivity({ stage }: { stage?: string }) {
  const { label, icon: Icon } =
    stages[stage as keyof typeof stages] ?? stages.answering;
  return (
    <TraceLine className="mb-3" status="running" role="status">
      <TraceIcon>
        {Icon === LoaderCircle ? (
          <Spinner
            role="presentation"
            aria-hidden="true"
            className="motion-reduce:animate-none"
          />
        ) : (
          <Icon aria-hidden="true" />
        )}
      </TraceIcon>
      <TraceTitle>{label}</TraceTitle>
    </TraceLine>
  );
}
