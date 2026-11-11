import { Link } from "react-router-dom";
import { ArtifactView } from "@/components/artifact-view";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Empty } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowAssumptions } from "@/components/workflow-fields";
import { label } from "@/lib/format";
import type { Event, RunDetail, State } from "@/lib/types";

export function WorkflowView({
  run,
  state,
  events,
  onAgent,
}: {
  run: RunDetail;
  state: State;
  events: Event[];
  onAgent: (key: string) => void;
}) {
  const rules = run.parameters.workflow;
  const work = state.work;
  if (
    !rules ||
    !work ||
    state.resource_stock === undefined ||
    state.logical_time === undefined
  )
    throw new Error("Workflow checkpoint or rules are missing");
  const names = new Map(run.design.profiles.map((p) => [p.key, p.name]));
  const messages = [
    ...Object.values(state.inboxes ?? {}).flat(),
    ...(state.pending_deliveries ?? []),
  ];
  const outcome =
    state.outcome && "unfinished" in state.outcome ? state.outcome : null;
  const accepted = Object.values(work).filter(
    (w) => w.status === "accepted",
  ).length;
  const statuses = {
    unclaimed: "Unclaimed",
    claimed: "Claimed",
    in_progress: "In progress",
    ready: "Ready for handoff",
    handed_off: "Awaiting acceptance",
    accepted: "Accepted",
  };
  return (
    <section
      aria-label="Institutional work"
      className="flex min-w-0 flex-col gap-5 xl:col-span-2"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Institutional workflow</h2>
        <p className="text-sm tabular-nums">
          {state.resource_stock} materials remaining · {state.resource_spent}{" "}
          spent
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          Logical time {state.logical_time} · {accepted} of{" "}
          {rules.work_items.length} handoffs accepted
        </p>
        {outcome && (
          <p className="text-sm font-medium">
            {
              {
                all_accepted: "All handoffs accepted",
                withdrawn: "All participants withdrew",
                horizon: "Round limit reached",
              }[outcome.status]
            }{" "}
            · {outcome.unfinished.length} unfinished
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Researcher view includes private work. Participants see only their
          permitted work and evidence.
        </p>
      </div>
      {rules.work_items.map((item) => {
        const row = work[item.key];
        const owner = row.owner;
        const waiting = item.dependencies.filter(
          (key) => work[key].status !== "accepted",
        );
        return (
          <section
            key={item.key}
            aria-label={`${label(item.key)} work`}
            className="flex min-w-0 flex-col gap-2 border-b pb-4 last:border-b-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium break-words">
                {label(item.key)}
              </h3>
              <Badge variant="outline">{statuses[row.status]}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="text-muted-foreground">Owner:</span>
              {owner ? (
                <Button variant="link" size="sm" onClick={() => onAgent(owner)}>
                  {names.get(owner)}
                </Button>
              ) : (
                <span>Unclaimed</span>
              )}
            </div>
            {waiting.length > 0 && (
              <p className="text-sm">
                Waiting for {waiting.join(", ")} acceptance
              </p>
            )}
            {row.status === "in_progress" && (
              <p className="text-sm">Ready at logical time {row.due_at}</p>
            )}
            {row.handoff && (
              <p className="text-sm">
                {row.handoff.accepted_at === null
                  ? `Awaiting acceptance from ${names.get(row.handoff.recipient)} · Version ${row.handoff.version}`
                  : `Accepted by ${names.get(row.handoff.recipient)} at logical time ${row.handoff.accepted_at} · Version ${row.handoff.version}`}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {item.resource_cost} materials per start · {item.duration} logical
              ticks of work
            </p>
          </section>
        );
      })}
      <Disclosure>
        <DisclosureTrigger>
          Dependencies, permissions and timing
        </DisclosureTrigger>
        <DisclosureContent className="pt-3">
          <WorkflowAssumptions rules={rules} />
        </DisclosureContent>
      </Disclosure>
      <Disclosure>
        <DisclosureTrigger>Artifact versions and access</DisclosureTrigger>
        <DisclosureContent className="pt-3">
          <ArtifactView run={run} state={state} />
        </DisclosureContent>
      </Disclosure>
      <Disclosure>
        <DisclosureTrigger>Addressed messages</DisclosureTrigger>
        <DisclosureContent className="flex min-w-0 flex-col gap-4 pt-3">
          <p className="text-sm text-muted-foreground">
            Private researcher inspection. Mailbox arrival alone does not
            confirm participant input.
          </p>
          {messages.length ? (
            messages.map((message) => (
              <div
                key={message.id}
                className="flex min-w-0 flex-col gap-1 text-sm"
              >
                <p className="text-muted-foreground">
                  {names.get(message.sender)} → {names.get(message.recipient)} ·
                  Sent {message.sent_at} ·{" "}
                  {message.delivered_at === null
                    ? `Due ${message.due_at}`
                    : `Delivered ${message.delivered_at}`}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              </div>
            ))
          ) : (
            <Empty title="No addressed messages recorded" />
          )}
        </DisclosureContent>
      </Disclosure>
      <Disclosure>
        <DisclosureTrigger>Settlements and conflicts</DisclosureTrigger>
        <DisclosureContent className="flex flex-col gap-4 pt-3">
          {events
            .filter(
              (e) => e.kind !== "proposal_sealed" && e.kind !== "wait_workflow",
            )
            .map((e) => (
              <div key={e.id} className="flex min-w-0 flex-col gap-1 text-sm">
                <Link
                  className="underline underline-offset-4"
                  to={`/runs/${run.summary.id}?tab=decisions&turn=${e.turn}`}
                >
                  Turn {e.turn} · {e.actor ? names.get(e.actor) : "World"} ·{" "}
                  {label(e.kind)}
                </Link>
                <p className="text-muted-foreground break-words">
                  {typeof e.data.reason === "string" ? e.data.reason : e.text}
                </p>
              </div>
            ))}
          {events.length === 0 && <Empty title="No work history recorded" />}
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}
