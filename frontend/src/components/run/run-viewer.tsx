import { MetricChart, roundSeries } from "@/components/charts";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Empty } from "@/components/feedback";
import { LockKeyhole } from "@/components/icons";
import { Json } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { label, metric } from "@/lib/format";
import { agentIdentity, conditionIdentity } from "@/lib/identity";
import type { Event, Evidence, RunDetail } from "@/lib/types";

function Privacy({ value }: { value: string }) {
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      {value !== "public" && <LockKeyhole className="size-3" />}
      {label(value)}
    </Badge>
  );
}

function Observation({
  observation,
}: {
  observation: Record<string, unknown>;
}) {
  const fields = Object.entries(observation).filter(
    ([key, value]) =>
      [
        "your_balance",
        "your_private_signal",
        "role",
        "available",
        "stock",
        "resource_stock",
        "writes_remaining",
        "logical_time",
        "your_note",
      ].includes(key) &&
      ["string", "number", "boolean"].includes(typeof value) &&
      value !== "",
  );
  return (
    <div className="flex flex-col gap-3">
      {typeof observation.context === "string" && observation.context && (
        <p className="whitespace-pre-wrap text-sm">{observation.context}</p>
      )}
      <dl className="grid gap-2 text-sm">
        {fields.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label(key)}</dt>
            <dd className="min-w-0 break-words text-right">{String(value)}</dd>
          </div>
        ))}
      </dl>
      <Disclosure>
        <DisclosureTrigger>Full observation</DisclosureTrigger>
        <DisclosureContent>
          <Json value={observation} />
        </DisclosureContent>
      </Disclosure>
    </div>
  );
}

function EventList({ events, empty }: { events: Event[]; empty: string }) {
  return events.length ? (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{label(event.kind)}</span>
            <Privacy value={event.visibility} />
          </div>
          <p className="whitespace-pre-wrap break-words">{event.text}</p>
          {event.target && (
            <span className="text-xs text-muted-foreground">
              {event.actor} → {event.target}
            </span>
          )}
          <Disclosure>
            <DisclosureTrigger>Recorded fields</DisclosureTrigger>
            <DisclosureContent>
              <Json value={event.data} />
            </DisclosureContent>
          </Disclosure>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">{empty}</p>
  );
}

export function RunViewer({
  run,
  turn,
  evidence,
  perspective = "researcher",
  perspectiveEvidence,
  onPerspective,
  compact = false,
}: {
  run: RunDetail;
  turn: number;
  evidence?: Evidence;
  perspective?: string;
  perspectiveEvidence?: Evidence;
  onPerspective: (actor: string) => void;
  compact?: boolean;
}) {
  const agentView = perspective !== "researcher";
  const visible = agentView ? perspectiveEvidence : evidence;
  const state = evidence?.checkpoint;
  const actor = run.design.profiles.find(
    (profile) => profile.key === visible?.actor,
  );
  const decision = visible?.decision;
  const observation = visible?.observation;
  const events = (visible?.events ?? []).filter(
    (event) =>
      !agentView ||
      event.visibility === "public" ||
      event.actor === perspective ||
      event.target === perspective,
  );
  const message = (event: Event) => /message|mail/.test(event.kind);
  const measurements = run.measurements.filter((value) => value.turn <= turn);
  const metrics = run.design.measures.length
    ? run.design.measures
    : Object.keys(run.metrics);
  const condition = run.design.conditions.find(
    (value) => value.key === run.summary.condition_key,
  );
  return (
    <div
      className={`grid min-w-0 items-start gap-6 ${compact ? "" : "xl:grid-cols-[minmax(10rem,0.8fr)_minmax(0,2fr)_minmax(12rem,1fr)]"}`}
      data-slot="run-viewer"
    >
      <aside
        aria-label="Agents"
        className={`flex min-w-0 flex-col gap-3 ${compact ? "" : "xl:max-h-[50dvh] xl:overflow-y-auto xl:overscroll-contain"}`}
      >
        <h2 className="text-sm font-medium">Agents</h2>
        <Button
          variant={agentView ? "ghost" : "secondary"}
          size="sm"
          className="justify-start"
          onClick={() => onPerspective("researcher")}
        >
          Researcher view
        </Button>
        <div
          className={`grid grid-cols-2 gap-1 sm:grid-cols-3 ${compact ? "" : "xl:grid-cols-1"}`}
        >
          {run.design.profiles.map((profile) => {
            const identity = agentIdentity(profile.key);
            const holdings = agentView
              ? profile.key === perspective
                ? observation?.your_balance
                : undefined
              : state?.balances?.[profile.key];
            return (
              <Button
                key={profile.key}
                variant={perspective === profile.key ? "secondary" : "ghost"}
                className="h-auto min-w-0 items-start justify-start gap-2 px-2 py-3 text-left"
                aria-pressed={perspective === profile.key}
                onClick={() => onPerspective(profile.key)}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-base"
                  style={{ color: identity.color }}
                >
                  {identity.glyph}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{profile.name}</span>
                  <span className="break-all whitespace-normal text-xs font-normal text-muted-foreground">
                    {run.harness.kind === "scripted"
                      ? "Scripted demo"
                      : (profile.model ?? condition?.model)}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {label(run.parameters.memory)} memory
                  </span>
                  {holdings != null && (
                    <span className="text-xs tabular-nums">
                      {String(holdings)} credits
                    </span>
                  )}
                </span>
              </Button>
            );
          })}
        </div>
        {agentView && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Agent perspective shows this agent’s recorded observations and
            addressed events. Other private state is hidden.
          </p>
        )}
      </aside>
      <section
        aria-label="Turn story"
        className={`flex min-w-0 flex-col gap-6 ${compact ? "" : "xl:max-h-[50dvh] xl:overflow-y-auto xl:overscroll-contain xl:border-x xl:px-6"}`}
      >
        {!visible ? (
          <Empty
            title={
              agentView
                ? "No observation for this agent yet"
                : "Loading recorded turn"
            }
            description={
              agentView
                ? "Step forward to its first activation."
                : "The saved evidence will appear here."
            }
          />
        ) : visible.number === 0 ? (
          <Empty
            title="Before the first turn"
            description="Play the recording or step forward to see the first observation and action."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">
                {actor?.name ?? visible.actor} · Turn {visible.number}
              </h2>
              <Privacy value="private" />
            </div>
            {visible.number !== turn && (
              <p className="text-xs text-muted-foreground">
                Last observation for this agent, at turn {visible.number}.
                Current playback: turn {turn}.
              </p>
            )}
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">1. Observation</h3>
              <p className="text-xs text-muted-foreground">
                {run.harness.kind === "scripted"
                  ? "Input to the declared scripted policy. No model inference."
                  : "Available to this agent at activation. Input receipts in the evidence drawer show what reached each model request."}
              </p>
              {observation && <Observation observation={observation} />}
            </section>
            <section className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-medium">2. Action</h3>
              {decision?.action && (
                <>
                  <p className="text-base font-medium">
                    {label(decision.action.kind)}
                    {"amount" in decision.action &&
                      ` · ${decision.action.amount}`}
                    {"target" in decision.action &&
                      decision.action.target &&
                      ` → ${decision.action.target}`}
                  </p>
                  <Disclosure>
                    <DisclosureTrigger>Action fields</DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={decision.action} />
                    </DisclosureContent>
                  </Disclosure>
                </>
              )}
            </section>
            <section className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-medium">3. Messages</h3>
              <EventList
                events={events.filter(message)}
                empty="No messages on this turn."
              />
            </section>
            <section className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-medium">4. Consequence</h3>
              <EventList
                events={events.filter((event) => !message(event))}
                empty="No consequence settled on this turn."
              />
            </section>
          </>
        )}
      </section>
      <aside
        aria-label={agentView ? "Agent-visible world" : "World and metrics"}
        className={`flex min-w-0 flex-col gap-4 ${compact ? "" : "xl:max-h-[50dvh] xl:overflow-y-auto xl:overscroll-contain"}`}
      >
        <h2 className="text-sm font-medium">
          {agentView ? "Agent-visible world" : "World"}
        </h2>
        {agentView ? (
          <p className="text-sm text-muted-foreground">
            The observation is the record of what was available. Global metrics
            and private world state belong to researcher view.
          </p>
        ) : (
          <>
            <dl className="grid gap-2 text-sm">
              {state &&
                Object.entries(state)
                  .filter(
                    ([key, value]) =>
                      [
                        "round",
                        "stock",
                        "resource_stock",
                        "resource_spent",
                        "writes_remaining",
                        "logical_time",
                        "done",
                      ].includes(key) &&
                      ["number", "boolean"].includes(typeof value),
                  )
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label(key)}</dt>
                      <dd className="tabular-nums">
                        {typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : String(value)}
                      </dd>
                    </div>
                  ))}
            </dl>
            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-medium">Metrics</h3>
              <dl className="grid gap-3 text-sm">
                {metrics.map((key) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{label(key)}</dt>
                    <dd className="tabular-nums">
                      {metric(
                        key,
                        roundSeries(measurements, key).at(-1)?.value,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            {metrics[0] && (
              <MetricChart
                series={[
                  {
                    id: run.summary.id,
                    name: run.summary.condition,
                    measurements,
                    ...conditionIdentity(run.design, run.summary.condition_key),
                  },
                ]}
                metricKey={metrics[0]}
                className="h-40"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Latest recorded round values through turn {turn}.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
