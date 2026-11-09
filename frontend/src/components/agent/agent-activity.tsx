import { useState } from "react";
import { Link } from "react-router-dom";
import { ExperimentCheck } from "@/components/experiment-check";
import {
  BookOpen,
  Check,
  FileSearch,
  Layers2,
  LoaderCircle,
  PenLine,
  ScanLine,
} from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import type { Analysis } from "@/lib/types";

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
    <TraceLine status="running" role="status">
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

/** Show recorded work, never an invented stage history or private model reasoning. */
export function ReplyActivity({ row }: { row: Analysis }) {
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const planning = row.output?.planning;
  const sources = planning?.sources ?? [];
  const examined = [
    ...new Map(
      (row.output?.examined ?? []).map((range) => [
        JSON.stringify(range),
        range,
      ]),
    ).values(),
  ];
  const hasDetails =
    !!planning?.brief ||
    sources.length > 0 ||
    examined.length > 0 ||
    !!planning?.preflight;
  const pending = row.status === "pending";
  const stage =
    row.purpose === "design"
      ? (row.output?.stage ?? "scoping")
      : row.output?.partial
        ? "writing"
        : (row.output?.stage ??
          (row.purpose === "general" ? "answering" : "investigating"));
  const title =
    row.purpose === "design"
      ? "Protocol reviewed"
      : `Inspected ${examined.length} evidence range${examined.length === 1 ? "" : "s"}`;
  const summary = pending ? (
    <AgentActivity stage={stage} />
  ) : (
    <TraceLine>
      <TraceIcon>
        <Check />
      </TraceIcon>
      <TraceTitle>{title}</TraceTitle>
    </TraceLine>
  );
  if (!hasDetails) return pending ? <Trace>{summary}</Trace> : null;
  return (
    <Trace className="text-sm font-normal">
      <TraceCollapsible
        open={expandedStatus === row.status}
        onOpenChange={(open) => setExpandedStatus(open ? row.status : null)}
      >
        <TraceCollapsibleTrigger
          aria-label={
            pending
              ? (stages[stage as keyof typeof stages] ?? stages.answering).label
              : title
          }
        >
          {summary}
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <div className="flex min-w-0 flex-col gap-4">
            {planning?.brief && (
              <section className="flex flex-col gap-2" aria-label="Study scope">
                <p className="font-medium text-foreground">Study scope</p>
                <p>{planning.brief.operationalization}</p>
                <p>{planning.brief.size_rationale}</p>
              </section>
            )}
            {!!sources.length && (
              <section
                className="flex flex-col gap-2"
                aria-label="Research sources"
              >
                <p className="font-medium text-foreground">Research sources</p>
                <Trace>
                  {sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <TraceLine>
                        <TraceIcon>
                          <BookOpen />
                        </TraceIcon>
                        <TraceTitle>
                          {source.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </TraceTitle>
                      </TraceLine>
                    </a>
                  ))}
                </Trace>
              </section>
            )}
            {!!examined.length && (
              <Trace>
                {examined.map((range) => (
                  <Link
                    key={JSON.stringify(range)}
                    to={`/runs/${range.run_id}?turn=${range.start}&tab=decisions`}
                  >
                    <TraceLine>
                      <TraceIcon>
                        <BookOpen />
                      </TraceIcon>
                      <TraceTitle>
                        Turns {range.start}–{range.end}
                      </TraceTitle>
                      <TraceDescription>
                        {range.run_id.slice(0, 6)}
                      </TraceDescription>
                    </TraceLine>
                  </Link>
                ))}
              </Trace>
            )}
            {planning?.preflight && (
              <ExperimentCheck
                report={{
                  ...planning.preflight,
                  original_question: row.question,
                  question_mapping: planning.brief?.requirements,
                }}
              />
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
