import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import { Alert, Empty } from "@/components/feedback";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  Radio,
  SkipForward,
} from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { DecisionBrowser } from "@/components/run/decision-browser";
import { RunRecord } from "@/components/run/run-record";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InteractionTable,
  RelationshipTable,
  WorldView,
} from "@/components/world-view";
import { api, invalidateResources, useApi } from "@/lib/api";
import { label, money, runModelLabel } from "@/lib/format";
import type { Evidence, RunDetail, State } from "@/lib/types";

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
      <section
        aria-label="Run progress"
        className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
      >
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
          <Badge variant="secondary">
            <Spinner />
            {run.design.profiles.find((p) => p.key === run.next_actor)?.name} is
            deciding
          </Badge>
        )}
      </section>
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
      <div className="mb-6 grid grid-cols-[1fr_auto] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="flex items-center gap-2 text-sm whitespace-nowrap">
          <Badge variant="outline">{pinned ? "Recorded" : "Latest"}</Badge>
          {pinned ? `Viewing turn ${turn}` : `Latest · turn ${turn}`}
        </div>
        <div className="col-span-full row-start-2 flex min-w-0 items-center gap-2 lg:col-auto lg:row-auto">
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
          <span className="text-xs text-muted-foreground">
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
        <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
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
            <div className="grid min-w-0 gap-8 xl:grid-cols-2">
              <WorldView
                run={run}
                state={state}
                events={events}
                onAgent={selectAgent}
              />
              <section className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                  <h2 className="text-base font-semibold">Outcome history</h2>
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
                <p className="p-4 text-xs leading-relaxed text-muted-foreground">
                  Recorded outcomes through turn {turn}. Each point summarizes
                  one round.
                </p>
              </section>
            </div>
          )}
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
              <h2 className="text-base font-semibold">Recent events</h2>
            </div>
            {!events.length ? (
              <Empty
                title="Waiting for the first consequence"
                description="Start the run or step through one agent decision."
              />
            ) : (
              <div className="flex flex-col divide-y">
                {events
                  .slice(-12)
                  .toReversed()
                  .map((event) => (
                    <div
                      className="flex flex-wrap items-center gap-3 py-3 text-sm"
                      key={event.id}
                    >
                      <Button
                        variant="link"
                        size="sm"
                        type="button"
                        onClick={() => selectTurn(event.turn, true)}
                      >
                        Turn {event.turn}
                      </Button>
                      <span className="font-medium">
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
            <div>
              <h2 className="text-base font-semibold">Interaction patterns</h2>
              <p>Directed exchanges and direct messages through turn {turn}.</p>
            </div>
          </div>
          <div className="grid min-w-0 items-start gap-8 xl:grid-cols-2">
            <InteractionTable
              profiles={run.design.profiles}
              events={events}
              onAgent={selectAgent}
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Verifiable behavior</h2>
              <p className="text-muted-foreground">
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
