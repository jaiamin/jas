import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { AgentMarkdown } from "@/components/agent/agent-markdown";
import { ExperimentCheckDetails } from "@/components/experiment-check";
import {
  type AppIcon,
  BookOpen,
  Check,
  CircleAlert,
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
  calculating: { label: "Calculating payoffs", icon: ScanLine },
  scoping: { label: "Scoping the question", icon: LoaderCircle },
  researching: { label: "Researching methods", icon: FileSearch },
  drafting: { label: "Drafting the protocol", icon: PenLine },
  checking: { label: "Checking mechanics", icon: ScanLine },
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

function ActivityDetail({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: AppIcon;
  description?: string;
  children: ReactNode;
}) {
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger aria-label={title}>
        <TraceLine>
          <TraceIcon>
            <Icon />
          </TraceIcon>
          <TraceTitle>{title}</TraceTitle>
          {description && <TraceDescription>{description}</TraceDescription>}
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>{children}</TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

/** Show recorded work and public outputs, never private model reasoning. */
export function ReplyActivity({ row }: { row: Analysis }) {
  const [expanded, setExpanded] = useState<boolean>();
  const planning = row.output?.planning;
  const activity = row.output?.activity ?? [];
  const sources = planning?.sources ?? [];
  const draftNotes =
    row.purpose === "design"
      ? (row.output?.explanation ?? planning?.draft_notes)
      : undefined;
  const limitations = row.output?.design?.limitations ?? [];
  const corrections = (planning?.reviews ?? []).filter(
    (review) => review.issues.length > 0,
  );
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
    !!planning?.preflight ||
    !!draftNotes ||
    limitations.length > 0 ||
    corrections.length > 0 ||
    activity.length > 0;
  const pending = row.status === "pending";
  const stage =
    row.purpose === "design"
      ? (row.output?.stage ?? "scoping")
      : row.output?.partial
        ? "writing"
        : (row.output?.stage ??
          (row.purpose === "general" ? "answering" : "investigating"));
  const title =
    row.status === "failed"
      ? "Request stopped"
      : row.purpose === "design"
        ? row.output?.supported
          ? "Protocol reviewed"
          : "Request reviewed"
        : examined.length
          ? `Inspected ${examined.length} evidence range${examined.length === 1 ? "" : "s"}`
          : "Activity";
  const summary = pending ? (
    <AgentActivity stage={stage} />
  ) : (
    <TraceLine status={row.status === "failed" ? "error" : undefined}>
      <TraceIcon>
        {row.status === "failed" ? <CircleAlert /> : <Check />}
      </TraceIcon>
      <TraceTitle>{title}</TraceTitle>
    </TraceLine>
  );
  // Open once when live work arrives; completion must not hide what the user is reading.
  if (
    expanded === undefined &&
    pending &&
    (activity.length > 1 ||
      !!planning?.brief ||
      !!planning?.preflight ||
      sources.length > 0 ||
      examined.length > 0 ||
      !!draftNotes)
  ) {
    setExpanded(true);
  }
  if (!hasDetails) return pending ? <Trace>{summary}</Trace> : null;
  return (
    <Trace>
      <TraceCollapsible open={expanded ?? false} onOpenChange={setExpanded}>
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
          <Trace>
            {activity.length > 0 && (
              <Trace aria-label="Recorded activity">
                {activity.map((recordedStage, index) => {
                  const info = stages[recordedStage as keyof typeof stages];
                  if (!info) return null;
                  const last = index === activity.length - 1;
                  const stopped = row.status === "failed" && last;
                  const running = pending && last;
                  return (
                    <TraceLine
                      // biome-ignore lint/suspicious/noArrayIndexKey: Recorded stages are append-only and can repeat during revisions.
                      key={index}
                      status={
                        stopped ? "error" : running ? "running" : undefined
                      }
                    >
                      <TraceIcon>
                        {stopped ? (
                          <CircleAlert />
                        ) : running ? (
                          <Spinner
                            role="presentation"
                            className="motion-reduce:animate-none"
                          />
                        ) : (
                          <Check />
                        )}
                      </TraceIcon>
                      <TraceTitle>{info.label}</TraceTitle>
                    </TraceLine>
                  );
                })}
              </Trace>
            )}
            {planning?.brief && (
              <ActivityDetail title="Study scope" icon={Layers2}>
                <div className="flex flex-col gap-2">
                  <p>{planning.brief.operationalization}</p>
                  <p>{planning.brief.size_rationale}</p>
                </div>
              </ActivityDetail>
            )}
            {!!sources.length && (
              <ActivityDetail
                title="Research sources"
                icon={FileSearch}
                description={String(sources.length)}
              >
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
                        <TraceTitle title={source.title}>
                          {source.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </TraceTitle>
                      </TraceLine>
                    </a>
                  ))}
                </Trace>
              </ActivityDetail>
            )}
            {!!examined.length && (
              <ActivityDetail
                title="Inspected evidence"
                icon={BookOpen}
                description={String(examined.length)}
              >
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
              </ActivityDetail>
            )}
            {planning?.preflight && (
              <ActivityDetail
                title="Mechanical checks"
                icon={ScanLine}
                description={
                  planning.preflight.status === "blocked"
                    ? "Blocked"
                    : planning.preflight.issues.length
                      ? `${planning.preflight.issues.length} findings`
                      : `${planning.preflight.probe_turns} probes`
                }
              >
                <div className="flex flex-col gap-3">
                  <p>
                    {planning.preflight.probe_turns.toLocaleString()} scripted
                    decisions · No model calls
                  </p>
                  <ExperimentCheckDetails
                    report={{
                      ...planning.preflight,
                      question_mapping: planning.brief?.requirements,
                    }}
                  />
                </div>
              </ActivityDetail>
            )}
            {corrections.length > 0 && (
              <ActivityDetail title="Review feedback" icon={ScanLine}>
                <ol className="flex list-decimal flex-col gap-2 pl-4">
                  {corrections.map((review, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Review attempts are append-only and can contain repeated findings.
                    <li key={index}>{review.issues.join(" ")}</li>
                  ))}
                </ol>
              </ActivityDetail>
            )}
            {draftNotes && (
              <ActivityDetail
                title="Draft notes (before checks)"
                icon={PenLine}
              >
                <AgentMarkdown text={draftNotes} />
              </ActivityDetail>
            )}
            {limitations.length > 0 && (
              <ActivityDetail title="Protocol limitations" icon={CircleAlert}>
                <ul className="flex list-disc flex-col gap-2 pl-4">
                  {limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </ActivityDetail>
            )}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
