import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  Radio,
  SkipForward,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { RunRecord } from "@/components/run-record";
import {
  ErrorState,
  Json,
  Loading,
  PageHeading,
  Status,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Empty, Table } from "@/components/ui/data";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  RelationshipGraph,
  RelationshipTable,
  WorldView,
} from "@/components/world-view";
import { api, useApi } from "@/lib/api";
import type { Annotation, Evidence, RunDetail, State } from "@/lib/types";
import { label, money, runModelLabel } from "@/lib/utils";

export default function Run() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [selectedMetric, setSelectedMetric] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [jumpToEvidence, setJumpToEvidence] = useState(false);
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const journalHeading = useRef<HTMLHeadingElement>(null);
  const evidenceReturn = useRef<HTMLButtonElement>(null);
  const [annotationDrafts, setAnnotationDrafts] = useState<
    Record<string, string>
  >({});
  const query = useApi<RunDetail>(`/runs/${id}`, true);
  const notes = useApi<Annotation[]>(`/runs/${id}/annotations`);
  const client = useQueryClient();
  const tab =
    ["live", "decisions", "relationships", "settings"].find(
      (value) => value === params.get("tab"),
    ) ?? "decisions";
  useEffect(() => {
    if (jumpToEvidence && tab === "decisions") {
      if (evidenceReturn.current?.getClientRects().length) {
        inspectorHeading.current?.focus({ preventScroll: true });
        inspector.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      }
      setJumpToEvidence(false);
    }
  }, [jumpToEvidence, tab]);
  const requested = params.get("turn");
  const maxTurn = query.data?.summary.turn ?? 0;
  const turn =
    requested !== null
      ? Math.max(0, Math.min(maxTurn, Number(requested) || 0))
      : maxTurn;
  const pinned = requested !== null;
  const annotationKey = `${id}:${turn}`;
  const annotation = annotationDrafts[annotationKey] ?? "";
  const evidence = useQuery({
    queryKey: ["evidence", id, turn],
    queryFn: () => api<Evidence>(`/runs/${id}/turns/${turn}`),
    enabled: !!query.data && (pinned || tab === "decisions"),
  });
  const control = useMutation({
    mutationFn: (action: string) => api(`/runs/${id}/control`, { action }),
    onSuccess: () => client.invalidateQueries(),
  });
  const note = useMutation({
    mutationFn: (draft: { runId: string; turn: number; note: string }) =>
      api(`/runs/${draft.runId}/annotations`, {
        turn: draft.turn,
        label: "Observation",
        note: draft.note,
      }),
    onSuccess: (_, draft) => {
      setAnnotationDrafts((current) => {
        const key = `${draft.runId}:${draft.turn}`;
        if (current[key] !== draft.note) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
      client.invalidateQueries({
        queryKey: [`/runs/${draft.runId}/annotations`],
      });
    },
  });
  if (query.error) return <ErrorState error={query.error} />;
  if (!query.data) return <Loading />;
  const run = query.data;
  const summary = run.summary;
  const active = ["running", "queued", "pausing"].includes(summary.status);
  const state: State =
    pinned && evidence.data ? evidence.data.checkpoint : run.state;
  const events = run.events.filter((e) => e.turn <= turn);
  const visibleTurns = run.turns
    .filter((t) => actorFilter === "all" || t.actor === actorFilter)
    .toReversed();
  const pages = Math.max(1, Math.ceil(visibleTurns.length / 15));
  const current = Math.min(page, pages - 1);
  const metricKeys = [...new Set(run.measurements.map((m) => m.key))].filter(
    (key) => run.measurements.some((m) => m.key === key && m.value !== null),
  );
  const chosenMetric = metricKeys.includes(selectedMetric)
    ? selectedMetric
    : (metricKeys[0] ?? "contribution_rate");
  function selectTurn(value: number, decision = false) {
    if (decision) setJumpToEvidence(true);
    setParams(
      {
        ...Object.fromEntries(params),
        turn: String(value),
        ...(decision ? { tab: "decisions" } : {}),
      },
      { replace: true },
    );
  }
  function selectAgent(key: string) {
    setActorFilter(key);
    setPage(0);
    const last = run.turns.findLast((t) => t.actor === key && t.number <= turn);
    if (last) selectTurn(last.number, true);
    else
      setParams({
        ...Object.fromEntries(params),
        tab: "decisions",
        turn: String(turn),
      });
  }
  function live() {
    const next = new URLSearchParams(params);
    next.delete("turn");
    setParams(next, { replace: true });
  }
  return (
    <>
      <PageHeading
        title={summary.condition}
        description={`${runModelLabel(summary)} · Rev ${summary.revision} · Seed ${summary.seed} · Repetition ${summary.repetition}`}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Export experiment evidence"
          asChild
        >
          <a href={`/api/studies/${summary.study_id}/export`}>
            <Download />
          </a>
        </Button>
        {summary.status !== "complete" && (
          <>
            <Button
              variant="outline"
              disabled={active || control.isPending}
              onClick={() => control.mutate("step")}
            >
              <SkipForward data-icon="inline-start" />
              Step
            </Button>
            <Button
              disabled={control.isPending || summary.status === "pausing"}
              onClick={() => {
                control.mutate(active ? "pause" : "start");
                if (!active) live();
              }}
            >
              {active ? (
                <Pause data-icon="inline-start" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              {summary.status === "pausing"
                ? "Finishing turn…"
                : active
                  ? "Pause"
                  : "Run"}
            </Button>
          </>
        )}
      </PageHeading>
      <div className="run-facts">
        <Status value={summary.status} />
        <span>
          Round{" "}
          <strong>
            {summary.round} / {summary.total_rounds}
          </strong>
        </span>
        <span>
          Turns{" "}
          <strong>
            {summary.turn} / {summary.total_turns}
          </strong>
        </span>
        <span>
          Requests <strong>{summary.usage.requests}</strong>
        </span>
        <span>
          Cost{" "}
          <strong>
            {money(summary.usage.cost_usd)}
            {summary.usage.partial && "*"}
          </strong>
        </span>
        {active && run.next_actor && (
          <span className="deciding-agent">
            <span className="live-dot" />
            {run.design.profiles.find((p) => p.key === run.next_actor)?.name} is
            deciding
          </span>
        )}
      </div>
      {(summary.error || control.error) && (
        <Alert variant="error" title="Execution stopped safely">
          {control.error?.message ?? summary.error} Saved through turn{" "}
          {summary.turn}.{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams({ tab: "settings" })}
          >
            Inspect requests
          </Button>
        </Alert>
      )}
      <div className="turn-rail">
        <div className="turn-label">
          <span className={pinned ? "recorded-dot" : "live-dot"} />
          {pinned ? `Viewing turn ${turn}` : `Latest · turn ${turn}`}
        </div>
        <div className="turn-scrubber">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous recorded turn"
            disabled={turn === 0}
            onClick={() => selectTurn(turn - 1)}
          >
            <ChevronLeft />
          </Button>
          <Slider
            aria-label="Recorded turn"
            min={0}
            max={Math.max(maxTurn, 1)}
            disabled={!maxTurn}
            value={[turn]}
            step={1}
            onValueChange={([value]) => selectTurn(value)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next recorded turn"
            disabled={turn >= maxTurn}
            onClick={() => selectTurn(turn + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        {pinned ? (
          <Button variant="outline" size="sm" onClick={live}>
            <Radio data-icon="inline-start" />
            {active ? `Live · ${maxTurn}` : "Latest"}
          </Button>
        ) : (
          <span className="turn-rail-note">
            {active ? "Following execution" : "Recorded evidence"}
          </span>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setParams(
            { ...Object.fromEntries(params), tab: v },
            { replace: true },
          )
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="live">Environment</TabsTrigger>
          <TabsTrigger value="relationships">Interactions</TabsTrigger>
          <TabsTrigger value="settings">Record</TabsTrigger>
        </TabsList>
        <TabsContent value="live">
          {pinned && evidence.error ? (
            <ErrorState error={evidence.error} />
          ) : pinned && !evidence.data ? (
            <Loading />
          ) : (
            <div className="run-live-layout">
              <WorldView
                run={run}
                state={state}
                events={events}
                onAgent={selectAgent}
              />
              <section className="outcome-history">
                <div className="section-heading">
                  <h2>Outcome history</h2>
                  {metricKeys.length > 0 && (
                    <Select
                      label="History measurement"
                      value={chosenMetric}
                      onValueChange={setSelectedMetric}
                      options={metricKeys.map((key) => ({
                        value: key,
                        label: label(key),
                      }))}
                    />
                  )}
                </div>
                <MetricChart
                  series={[
                    {
                      id: summary.id,
                      name: summary.condition,
                      measurements: run.measurements.filter(
                        (m) => m.turn <= turn,
                      ),
                    },
                  ]}
                  metricKey={chosenMetric}
                />
                <p className="table-note">
                  Through turn {turn} · one point per round
                </p>
              </section>
            </div>
          )}
          <section className="section-space">
            <div className="section-heading">
              <h2>Recent events</h2>
            </div>
            {!events.length ? (
              <Empty title="No events yet" />
            ) : (
              <div className="event-feed">
                {events
                  .slice(-12)
                  .toReversed()
                  .map((event) => (
                    <div className="event-row" key={event.id}>
                      <Button
                        variant="link"
                        size="sm"
                        type="button"
                        className="turn-link"
                        onClick={() => selectTurn(event.turn, true)}
                      >
                        Turn {event.turn}
                      </Button>
                      <span className="event-agent">
                        {run.design.profiles.find((p) => p.key === event.actor)
                          ?.name ?? "Environment"}
                      </span>
                      <span>{event.text}</span>
                      <Badge>{label(event.kind)}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </TabsContent>
        <TabsContent value="decisions">
          <div className="decision-layout">
            <section>
              <div className="section-heading">
                <h2
                  ref={journalHeading}
                  tabIndex={-1}
                  className="inspection-anchor"
                >
                  Decision journal
                </h2>
                <Select
                  label="Filter actor"
                  value={actorFilter}
                  onValueChange={(v) => {
                    setActorFilter(v);
                    setPage(0);
                    if (!pinned) selectTurn(turn);
                  }}
                  options={[
                    { value: "all", label: "All agents" },
                    ...run.design.profiles.map((p) => ({
                      value: p.key,
                      label: p.name,
                    })),
                  ]}
                />
              </div>
              <div className="table-frame">
                <Table className="table">
                  <thead>
                    <tr>
                      <th>Turn</th>
                      <th>Agent</th>
                      <th>Decision</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTurns
                      .slice(current * 15, (current + 1) * 15)
                      .map((t) => (
                        <tr key={t.number} data-selected={t.number === turn}>
                          <td>
                            <Button
                              variant="link"
                              size="sm"
                              className="turn-link"
                              type="button"
                              onClick={() => selectTurn(t.number, true)}
                            >
                              {t.number}
                            </Button>
                          </td>
                          <td>
                            {run.design.profiles.find((p) => p.key === t.actor)
                              ?.name ?? t.actor}
                          </td>
                          <td>
                            <strong className="action-label">
                              {label(t.action.kind)}
                              {["contribute", "send", "return"].includes(
                                t.action.kind,
                              ) && ` ${t.action.amount}`}
                              {t.action.target && ` → ${t.action.target}`}
                            </strong>
                            <span className="table-secondary rationale-preview">
                              {t.rationale}
                            </span>
                          </td>
                          <td className="numeric muted">
                            {(t.latency_ms / 1000).toFixed(1)}s
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
                {!visibleTurns.length && (
                  <p className="table-no-results">
                    No decisions recorded for this selection.
                  </p>
                )}
                <div className="table-footer">
                  <span>{visibleTurns.length} decisions</span>
                  <div className="actions">
                    <span>
                      {current + 1} / {pages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!current}
                      aria-label="Previous decisions page"
                      onClick={() => {
                        setPage(current - 1);
                        if (!pinned) selectTurn(turn);
                      }}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={current + 1 >= pages}
                      aria-label="Next decisions page"
                      onClick={() => {
                        setPage(current + 1);
                        if (!pinned) selectTurn(turn);
                      }}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
            <aside ref={inspector} className="evidence-inspector">
              <Button
                variant="outline"
                size="sm"
                ref={evidenceReturn}
                className="evidence-return"
                onClick={() => {
                  journalHeading.current?.focus({ preventScroll: true });
                  journalHeading.current?.scrollIntoView({ block: "start" });
                }}
              >
                <ArrowLeft data-icon="inline-start" />
                Back to decisions
              </Button>
              <div className="section-heading">
                <h2
                  ref={inspectorHeading}
                  tabIndex={-1}
                  className="inspection-anchor"
                >
                  Turn {turn} evidence
                </h2>
                <Badge>Saved input & output</Badge>
              </div>
              {evidence.error ? (
                <ErrorState error={evidence.error} />
              ) : !evidence.data ? (
                <Loading />
              ) : evidence.data.number === 0 ? (
                <Empty
                  title="Initial state"
                  description="Turn zero is the starting checkpoint, before any model decision."
                />
              ) : (
                <>
                  <h3 className="inspector-actor">
                    {
                      run.design.profiles.find(
                        (p) => p.key === evidence.data?.actor,
                      )?.name
                    }
                  </h3>
                  <p className="decision-rationale">
                    {evidence.data.decision.rationale}
                  </p>
                  <dl className="key-values">
                    <div>
                      <dt>Action</dt>
                      <dd>
                        {label(evidence.data.decision.action?.kind ?? "")}
                        {evidence.data.decision.action?.target &&
                          ` → ${evidence.data.decision.action.target}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Private note</dt>
                      <dd>{evidence.data.decision.memory || "No note"}</dd>
                    </div>
                    {evidence.data.decision.action?.message && (
                      <div>
                        <dt>Message</dt>
                        <dd>{evidence.data.decision.action.message}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="evidence-disclaimer">
                    Rationale and memory are model self-reports.
                  </p>
                  <Disclosure
                    className="disclosure"
                    onOpenChange={(open) => {
                      if (open && !pinned) selectTurn(turn, true);
                    }}
                  >
                    <DisclosureTrigger>
                      Exact observation before the decision
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={evidence.data.observation} />
                    </DisclosureContent>
                  </Disclosure>
                  <Disclosure
                    className="disclosure"
                    onOpenChange={(open) => {
                      if (open && !pinned) selectTurn(turn, true);
                    }}
                  >
                    <DisclosureTrigger>Typed decision</DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={evidence.data.decision} />
                    </DisclosureContent>
                  </Disclosure>
                  <Disclosure
                    className="disclosure"
                    onOpenChange={(open) => {
                      if (open && !pinned) selectTurn(turn, true);
                    }}
                  >
                    <DisclosureTrigger>
                      Consequences & verified facts
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={evidence.data.events} />
                    </DisclosureContent>
                  </Disclosure>
                  <Disclosure
                    className="disclosure"
                    onOpenChange={(open) => {
                      if (open && !pinned) selectTurn(turn, true);
                    }}
                  >
                    <DisclosureTrigger>
                      Complete state after turn {turn}
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={evidence.data.checkpoint} />
                    </DisclosureContent>
                  </Disclosure>
                </>
              )}
              <Disclosure
                className="disclosure"
                onOpenChange={(open) => {
                  if (open && !pinned) selectTurn(turn);
                }}
              >
                <DisclosureTrigger>Researcher observations</DisclosureTrigger>
                <DisclosureContent>
                  {notes.data
                    ?.filter((n) => n.turn === turn)
                    .map((n) => (
                      <div className="annotation" key={n.id}>
                        <Badge>{n.label}</Badge>
                        <p>{n.note}</p>
                      </div>
                    ))}
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="annotation">
                        Add an observation at turn {turn}
                      </FieldLabel>
                      <Textarea
                        id="annotation"
                        rows={3}
                        value={annotation}
                        onChange={(e) => {
                          if (!pinned) selectTurn(turn);
                          setAnnotationDrafts({
                            ...annotationDrafts,
                            [annotationKey]: e.target.value,
                          });
                        }}
                        maxLength={4000}
                      />
                    </Field>
                  </FieldGroup>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!annotation.trim() || note.isPending}
                    onClick={() =>
                      note.mutate({ runId: summary.id, turn, note: annotation })
                    }
                  >
                    Save observation
                  </Button>
                  {note.error && (
                    <Alert variant="error">{note.error.message}</Alert>
                  )}
                </DisclosureContent>
              </Disclosure>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="relationships">
          <div className="section-heading">
            <div>
              <h2>Interactions through turn {turn}</h2>
            </div>
          </div>
          <div className="interactions-layout">
            <RelationshipGraph
              profiles={run.design.profiles}
              events={events}
              onAgent={selectAgent}
            />
            <div>
              <h2>Exchanges</h2>
              <RelationshipTable
                profiles={run.design.profiles}
                events={events}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <RunRecord key={id} run={run} />
        </TabsContent>
      </Tabs>
    </>
  );
}
