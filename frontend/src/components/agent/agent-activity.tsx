import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { AgentMarkdown } from "@/components/agent/agent-markdown";
import { ExperimentCheckDetails } from "@/components/experiment-check";
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import type { Analysis, ResearchActivity, ResearchArtifact } from "@/lib/types";

const stages = {
  answering: "Thinking",
  writing: "Writing",
  indexing: "Indexing the experiment",
  investigating: "Investigating the evidence",
  reading: "Reading recorded turns",
  calculating: "Calculating payoffs",
  discovering: "Inspecting available mechanics",
  retrieving: "Retrieving research context",
  probing: "Probing a copied world",
  scoping: "Scoping the question",
  researching: "Researching methods",
  drafting: "Drafting the protocol",
  checking: "Checking mechanics",
  reviewing: "Reviewing the design",
  revising: "Refining the protocol",
};

const operationTitles = {
  capabilities: "Implemented mechanics",
  context: "Research context",
  probe: "World probe",
};
const stopReasons: Record<string, string> = {
  answered: "Answer complete",
  planner_handoff: "Passed to protocol review",
  request_limit: "Request limit reached",
  provider_failure: "Provider request failed",
  interrupted: "Request interrupted",
  server_stopped: "Server stopped",
  failed: "Request failed",
};

function ResearchOperation({
  operation,
  research,
}: {
  operation: ResearchArtifact;
  research: ResearchActivity;
}) {
  const [open, setOpen] = useState(false);
  const title = operationTitles[operation.request.kind];
  const line = (
    <TraceLine
      status={
        operation.status === "pending"
          ? "running"
          : operation.status === "complete"
            ? undefined
            : "error"
      }
    >
      <TraceTitle>{title}</TraceTitle>
      <TraceDescription>{operation.status}</TraceDescription>
    </TraceLine>
  );
  if (operation.status === "pending") return line;
  return (
    <TraceCollapsible open={open} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger aria-label={title}>
        {line}
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        {open && (
          <div className="flex min-w-0 flex-col gap-3">
            <p>{operation.summary}</p>
            {operation.sources.map((source) => (
              <Link
                key={`${source.kind}:${source.id}:${source.turn ?? ""}`}
                title={`SHA-256 ${source.hash}`}
                to={
                  source.kind === "run"
                    ? `/runs/${source.id}?turn=${source.turn}&tab=decisions`
                    : source.kind === "builtin"
                      ? `/environments?environment=${encodeURIComponent(source.id)}`
                      : `/agent?chat=${research.scope.chat_id}#${source.id}`
                }
              >
                <TraceLine>
                  <TraceTitle>
                    {source.kind === "run"
                      ? `Source turn ${source.turn}`
                      : source.kind === "builtin"
                        ? `Source environment: ${source.id}`
                        : "Source research record"}
                  </TraceTitle>
                  <TraceDescription>
                    {source.hash.slice(0, 12)}
                  </TraceDescription>
                </TraceLine>
              </Link>
            ))}
            <CodeBlock size="sm">
              <CodeBlockContent wrap className="max-h-64">
                {JSON.stringify(
                  { scope: research.scope, ...operation },
                  null,
                  2,
                )}
              </CodeBlockContent>
            </CodeBlock>
          </div>
        )}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

export function AgentActivity({ stage }: { stage?: string }) {
  const label = stages[stage as keyof typeof stages] ?? stages.answering;
  return (
    <TraceLine status="running" role="status">
      <TraceTitle>{label}</TraceTitle>
    </TraceLine>
  );
}

function ActivityDetail({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger aria-label={title}>
        <TraceLine>
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
  const [expanded, setExpanded] = useState(false);
  const planning = row.output?.planning;
  const activity = row.output?.activity ?? [];
  const research = row.output?.research;
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
    !!research?.operations.length ||
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
      <TraceTitle>{title}</TraceTitle>
    </TraceLine>
  );
  if (!hasDetails) return pending ? <Trace>{summary}</Trace> : null;
  return (
    <Trace>
      <TraceCollapsible open={expanded} onOpenChange={setExpanded}>
        <TraceCollapsibleTrigger
          aria-label={
            pending
              ? (stages[stage as keyof typeof stages] ?? stages.answering)
              : title
          }
        >
          {summary}
        </TraceCollapsibleTrigger>
        <div className="-ml-7">
          <TraceCollapsibleContent className="ml-2.5">
            <Trace>
              {activity.length > 0 && (
                <Trace aria-label="Recorded activity">
                  {activity.map((recordedStage, index) => {
                    const label = stages[recordedStage as keyof typeof stages];
                    if (!label) return null;
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
                        <TraceTitle>{label}</TraceTitle>
                      </TraceLine>
                    );
                  })}
                </Trace>
              )}
              {planning?.brief && (
                <ActivityDetail title="Study scope">
                  <div className="flex flex-col gap-2">
                    <p>{planning.brief.operationalization}</p>
                    <p>{planning.brief.size_rationale}</p>
                  </div>
                </ActivityDetail>
              )}
              {research && research.operations.length > 0 && (
                <Trace aria-label="Research operations">
                  {research.operations.map((operation) => (
                    <ResearchOperation
                      key={operation.id}
                      operation={operation}
                      research={research}
                    />
                  ))}
                  {research.stop_reason && (
                    <TraceLine>
                      <TraceTitle>
                        {stopReasons[research.stop_reason] ?? "Work stopped"}
                      </TraceTitle>
                    </TraceLine>
                  )}
                </Trace>
              )}
              {!!sources.length && (
                <ActivityDetail
                  title="Research sources"
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
                          <TraceTitle title={source.title}>
                            {source.title}
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
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
                  description={String(examined.length)}
                >
                  <Trace>
                    {examined.map((range) => (
                      <Link
                        key={JSON.stringify(range)}
                        to={`/runs/${range.run_id}?turn=${range.start}&tab=decisions`}
                      >
                        <TraceLine>
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
                <ActivityDetail title="Review feedback">
                  <ol className="flex list-decimal flex-col gap-2 pl-4">
                    {corrections.map((review, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Review attempts are append-only and can contain repeated findings.
                      <li key={index}>{review.issues.join(" ")}</li>
                    ))}
                  </ol>
                </ActivityDetail>
              )}
              {draftNotes && (
                <ActivityDetail title="Draft notes (before checks)">
                  <AgentMarkdown text={draftNotes} />
                </ActivityDetail>
              )}
              {limitations.length > 0 && (
                <ActivityDetail title="Protocol limitations">
                  <ul className="flex list-disc flex-col gap-2 pl-4">
                    {limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </ActivityDetail>
              )}
            </Trace>
          </TraceCollapsibleContent>
        </div>
      </TraceCollapsible>
    </Trace>
  );
}
