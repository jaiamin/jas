import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  Radio,
  SkipForward,
} from "lucide-react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import { DecisionBrowser } from "@/components/run/decision-browser";
import { RunRecord } from "@/components/run/run-record";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Empty } from "@/components/ui/data";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RelationshipGraph,
  RelationshipTable,
  WorldView,
} from "@/components/world-view";
import { api, invalidateResources, useApi } from "@/lib/api";
import type { Evidence, RunDetail, State } from "@/lib/types";
import { label, money, runModelLabel } from "@/lib/utils";

export default function Run() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [selectedMetric, setSelectedMetric] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
  const [annotationDrafts, setAnnotationDrafts] = useState<
    Record<string, string>
  >({});
  const query = useApi<RunDetail>(`/runs/${id}`, true);
  const client = useQueryClient();
  const tab =
    ["live", "decisions", "relationships", "settings"].find(
      (value) => value === params.get("tab"),
    ) ?? "decisions";
  const requested = params.get("turn");
  const maxTurn = query.data?.summary.turn ?? 0;
  const turn =
    requested !== null
      ? Math.max(0, Math.min(maxTurn, Math.trunc(Number(requested) || 0)))
      : maxTurn;
  const pinned = requested !== null;
  const evidence = useQuery({
    queryKey: ["evidence", id, turn],
    queryFn: () => api<Evidence>(`/runs/${id}/turns/${turn}`),
    enabled: !!query.data && (pinned || tab === "decisions"),
  });
  const control = useMutation({
    mutationFn: (action: string) => api(`/runs/${id}/control`, { action }),
    onSuccess: () =>
      invalidateResources(client, [
        `/runs/${id}`,
        "/runs",
        "/studies",
        `/studies/${query.data?.summary.study_id}`,
      ]),
  });
  if (query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!query.data) return <Loading />;
  const run = query.data;
  const summary = run.summary;
  const active = ["running", "queued", "pausing"].includes(summary.status);
  const state: State =
    pinned && evidence.data ? evidence.data.checkpoint : run.state;
  const events = run.events.filter((e) => e.turn <= turn);
  const metricKeys = [...new Set(run.measurements.map((m) => m.key))].filter(
    (key) => run.measurements.some((m) => m.key === key && m.value !== null),
  );
  const chosenMetric = metricKeys.includes(selectedMetric)
    ? selectedMetric
    : (metricKeys[0] ?? "contribution_rate");
  function selectTurn(value: number, decision = false) {
    if (decision) setFocusRequest((request) => request + 1);
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
    const last = run.turns.findLast((t) => t.actor === key && t.number <= turn);
    setFocusRequest((request) => request + 1);
    setParams(
      {
        ...Object.fromEntries(params),
        actor: key,
        tab: "decisions",
        turn: String(last?.number ?? turn),
      },
      { replace: true },
    );
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
              disabled={active || control.isPending || !!run.execution_blocked}
              onClick={() => control.mutate("step")}
            >
              <SkipForward data-icon="inline-start" />
              Step
            </Button>
            <Button
              disabled={
                control.isPending ||
                summary.status === "pausing" ||
                (!active && !!run.execution_blocked)
              }
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
      {run.execution_blocked && (
        <Alert title="Recorded rules">{run.execution_blocked}</Alert>
      )}
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
          <TabsTrigger value="live">Environment</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="relationships">Interactions</TabsTrigger>
          <TabsTrigger value="settings">Record</TabsTrigger>
        </TabsList>
        <TabsContent value="live">
          {pinned && evidence.error ? (
            <ErrorState error={evidence.error} onRetry={evidence.refetch} />
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
                  Recorded outcomes through turn {turn}. Each point summarizes
                  one round.
                </p>
              </section>
            </div>
          )}
          <section className="section-space">
            <div className="section-heading">
              <h2>Recent events</h2>
            </div>
            {!events.length ? (
              <Empty
                title="Waiting for the first consequence"
                description="Start the run or step through one agent decision."
              />
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
          <DecisionBrowser
            key={`${summary.id}:${params.get("actor") ?? "all"}`}
            run={run}
            turn={turn}
            pinned={pinned}
            evidence={evidence}
            focusRequest={focusRequest}
            selectTurn={selectTurn}
            annotationDrafts={annotationDrafts}
            setAnnotationDrafts={setAnnotationDrafts}
          />
        </TabsContent>
        <TabsContent value="relationships">
          <div className="section-heading">
            <div>
              <h2>Interaction patterns</h2>
              <p>Directed exchanges and direct messages through turn {turn}.</p>
            </div>
          </div>
          <div className="interactions-layout">
            <RelationshipGraph
              profiles={run.design.profiles}
              events={events}
              onAgent={selectAgent}
            />
            <div>
              <h2>Verifiable behavior</h2>
              <p className="muted">
                Ground truth comes from the rules and the information each actor
                received.
              </p>
              <RelationshipTable
                profiles={run.design.profiles}
                events={events}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <RunRecord key={run.summary.id} run={run} />
        </TabsContent>
      </Tabs>
    </>
  );
}
