import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AdjudicationReview } from "@/components/adjudication";
import { useAssistantPageContext } from "@/components/agent/assistant-workspace";
import { MetricChart } from "@/components/charts";
import { Alert, Empty } from "@/components/feedback";
import { Download, Pause, Play, Radio, SkipForward } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { ProtocolEstimate } from "@/components/protocol-estimate";
import { DecisionBrowser } from "@/components/run/decision-browser";
import { PlaybackControls } from "@/components/run/playback-controls";
import { ReplayVerification, RunRecord } from "@/components/run/run-record";
import { RunViewer } from "@/components/run/run-viewer";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InteractionTable,
  RelationshipTable,
  WorldView,
} from "@/components/world-view";
import { api, invalidateResources, useApi } from "@/lib/api";
import { label, money, runModelLabel } from "@/lib/format";
import type { Evidence, RunDetail, State, StudyDetail } from "@/lib/types";

export default function Run() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [selectedMetric, setSelectedMetric] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(() => params.has("tab"));
  const [perspective, setPerspective] = useState("researcher");
  const [focusRequest, setFocusRequest] = useState(0);
  const [annotationDrafts, setAnnotationDrafts] = useState<
    Record<string, string>
  >({});
  const query = useApi<RunDetail>(`/runs/${id}`, (data) =>
    ["running", "queued", "pausing"].includes(data?.summary.status ?? ""),
  );
  const needsDeclaration =
    !!query.data?.parameters.artifacts?.judgment &&
    query.data.summary.status !== "complete";
  const declarationPath = `/studies/${query.data?.summary.study_id}?revision=${query.data?.summary.revision}`;
  const review = useQuery({
    queryKey: [declarationPath],
    queryFn: () => api<Pick<StudyDetail, "preflight">>(declarationPath),
    enabled: needsDeclaration,
  });
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
  useAssistantPageContext(
    query.data && !query.error
      ? {
          context: `run:${query.data.summary.id}`,
          title: query.data.summary.study_title,
          revision: query.data.summary.revision,
          throughTurn: turn,
        }
      : null,
  );
  const pinned = requested !== null;
  const evidence = useQuery({
    queryKey: ["evidence", id, turn],
    queryFn: () => api<Evidence>(`/runs/${id}/turns/${turn}`),
    enabled: !!query.data,
  });
  const perspectiveTurn = query.data?.turns.findLast(
    (item) => item.actor === perspective && item.number <= turn,
  )?.number;
  const perspectiveEvidence = useQuery({
    queryKey: ["evidence", id, perspectiveTurn],
    queryFn: () => api<Evidence>(`/runs/${id}/turns/${perspectiveTurn}`),
    enabled: perspective !== "researcher" && perspectiveTurn !== undefined,
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
  const condition = run.design.conditions.find(
    (c) => c.key === summary.condition_key,
  );
  const declaration = review.data?.preflight.adjudications?.find(
    (item) => item.condition_key === summary.condition_key,
  );
  const declarationMatches =
    !!declaration &&
    review.data?.preflight.status !== "blocked" &&
    JSON.stringify(declaration.adjudicator) ===
      JSON.stringify(condition?.adjudicator) &&
    JSON.stringify(declaration.scope) ===
      JSON.stringify(run.parameters.artifacts?.judgment);
  const adjudicationBlocked = needsDeclaration && !declarationMatches;
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
    if (decision) {
      setFocusRequest((request) => request + 1);
      setInspectorOpen(true);
    }
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
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <Link to="/experiments" className="hover:underline">
          Experiments
        </Link>
        <span>/</span>
        <Link
          to={`/experiments/${summary.study_id}?revision=${summary.revision}`}
          className="hover:underline"
        >
          {summary.study_title}
        </Link>
        <span>/</span>
        <span>{summary.condition}</span>
        <span>/</span>
        <span>
          Seed {summary.seed} · Repetition {summary.repetition}
        </span>
      </nav>
      <PageHeading
        title={summary.condition}
        description={`${runModelLabel(summary)} · Version ${summary.revision} · Seed ${summary.seed} · Repetition ${summary.repetition}`}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Export experiment evidence"
          asChild
        >
          <a href={`/api/studies/${summary.study_id}/export?download=true`}>
            <Download />
          </a>
        </Button>
        {summary.status !== "complete" && (
          <>
            <Button
              variant="outline"
              disabled={
                active ||
                control.isPending ||
                !!run.execution_blocked ||
                adjudicationBlocked
              }
              onClick={() => control.mutate("step")}
            >
              <SkipForward data-icon="inline-start" />
              Step
            </Button>
            <Button
              disabled={
                control.isPending ||
                summary.status === "pausing" ||
                (!active && (!!run.execution_blocked || adjudicationBlocked))
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
      {needsDeclaration &&
        (declarationMatches && declaration ? (
          <div className="mb-6">
            <AdjudicationReview declaration={declaration} design={run.design} />
          </div>
        ) : (
          <Alert title="Review adjudication before execution">
            {review.isPending
              ? "Loading the pinned adjudicator declaration and prices…"
              : review.error
                ? "The pinned adjudicator declaration could not be loaded."
                : "The pinned version is blocked or has no matching explicit adjudicator declaration. Run and Step remain unavailable."}
            <Link
              to={`/experiments/${summary.study_id}?revision=${summary.revision}`}
              className="ml-1 underline underline-offset-4"
            >
              Review experiment
            </Link>
          </Alert>
        ))}
      <section
        aria-label="Run progress"
        className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
      >
        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link to={`/experiments/${summary.study_id}`}>
            {summary.study_title}
          </Link>
        </Button>
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
      {summary.status !== "complete" && !active && (
        <div className="mb-5">
          <ProtocolEstimate design={run.design} value={run.estimate} />
        </div>
      )}
      {summary.completion && summary.status === "complete" && (
        <p className="mb-6 max-w-prose text-sm text-muted-foreground">
          Finished after {summary.turn} turns ·{" "}
          {label(summary.completion.reason)} · maximum {summary.total_turns}{" "}
          turns. {summary.completion.interpretation}
        </p>
      )}
      {run.execution_blocked && (
        <Alert title="Recorded rules">{run.execution_blocked}</Alert>
      )}
      {(summary.error || control.error) && (
        <Alert
          variant="error"
          title="Execution stopped safely"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParams({ tab: "settings" })}
            >
              Inspect requests
            </Button>
          }
        >
          {control.error?.message ?? summary.error} Saved through turn{" "}
          {summary.turn}.{" "}
        </Alert>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{pinned ? `Viewing turn ${turn}` : `Latest · turn ${turn}`}</span>
        {pinned && (
          <Button variant="outline" size="sm" onClick={live}>
            <Radio data-icon="inline-start" />
            {active ? `Live · ${maxTurn}` : "Latest"}
          </Button>
        )}
      </div>
      {evidence.error && (
        <ErrorState error={evidence.error} onRetry={evidence.refetch} />
      )}
      {perspectiveEvidence.error && (
        <ErrorState
          error={perspectiveEvidence.error}
          onRetry={perspectiveEvidence.refetch}
        />
      )}
      <div className="flex min-w-0 flex-col gap-6">
        <RunViewer
          run={run}
          turn={turn}
          evidence={evidence.data}
          perspective={perspective}
          perspectiveEvidence={perspectiveEvidence.data}
          onPerspective={setPerspective}
        />
        <PlaybackControls
          key={id}
          turn={turn}
          maxTurn={maxTurn}
          ready={evidence.data?.number === turn && !evidence.error}
          moments={run.key_moments}
          onTurn={selectTurn}
        />
      </div>
      <div className="mt-5 flex flex-wrap items-start gap-3">
        <ReplayVerification key={id} runId={id ?? ""} />
      </div>
      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="mt-5">
            Rules & evidence
          </Button>
        </SheetTrigger>
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
          <SheetHeader>
            <SheetTitle>Rules & evidence</SheetTitle>
            <SheetDescription>
              Recorded rules, decisions and exact input receipts. Private
              records are included in researcher inspection.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 min-w-0 overflow-y-auto px-4 pb-6 sm:px-6">
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
                  <ErrorState
                    error={evidence.error}
                    onRetry={evidence.refetch}
                  />
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
                        <h2 className="text-base font-semibold">
                          Outcome history
                        </h2>
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
                        Recorded outcomes through turn {turn}. Each point
                        summarizes one round.
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
                              {run.design.profiles.find(
                                (p) => p.key === event.actor,
                              )?.name ?? "Environment"}
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
                    <h2 className="text-base font-semibold">
                      Interaction patterns
                    </h2>
                    <p>
                      Directed exchanges and direct messages through turn {turn}
                      .
                    </p>
                  </div>
                </div>
                <div className="grid min-w-0 items-start gap-8 xl:grid-cols-2">
                  <InteractionTable
                    profiles={run.design.profiles}
                    events={events}
                    onAgent={selectAgent}
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">
                      Verifiable behavior
                    </h2>
                    <p className="text-muted-foreground">
                      Ground truth comes from the rules and the information each
                      actor received.
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
