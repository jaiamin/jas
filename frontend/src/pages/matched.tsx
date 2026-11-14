import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert, Empty } from "@/components/feedback";
import { PlaybackControls } from "@/components/run/playback-controls";
import { RunViewer } from "@/components/run/run-viewer";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { api, useApi } from "@/lib/api";
import type { Evidence, RunDetail } from "@/lib/types";

interface MatchedReport {
  active: boolean;
  revision: number;
  seed: number;
  repetition: number;
  left_run_id: string | null;
  right_run_id: string | null;
  initial_state_differences: string[];
  setup_differences: string[];
  first_divergence: { turn: number; kind: string; description: string } | null;
  compared_turns: number;
  left_turns: number;
  right_turns: number;
  alignment: string;
  limits: string;
}

function Side({
  id,
  turn,
  name,
}: {
  id: string | null;
  turn: number;
  name: string;
}) {
  const [perspective, setPerspective] = useState("researcher");
  const path = `/runs/${id}`;
  const query = useQuery({
    queryKey: [path],
    queryFn: () => api<RunDetail>(path),
    enabled: !!id,
    refetchInterval: (query) =>
      ["running", "queued", "pausing"].includes(
        query.state.data?.summary.status ?? "",
      )
        ? 1500
        : false,
  });
  const actual = Math.min(turn, query.data?.summary.turn ?? turn);
  const evidence = useQuery({
    queryKey: ["evidence", id, actual],
    queryFn: () => api<Evidence>(`/runs/${id}/turns/${actual}`),
    enabled: !!query.data,
  });
  const perspectiveTurn = query.data?.turns.findLast(
    (value) => value.actor === perspective && value.number <= actual,
  )?.number;
  const personal = useQuery({
    queryKey: ["evidence", id, perspectiveTurn],
    queryFn: () => api<Evidence>(`/runs/${id}/turns/${perspectiveTurn}`),
    enabled: perspective !== "researcher" && perspectiveTurn !== undefined,
  });
  if (!id)
    return (
      <Empty
        title={`${name}: missing run`}
        description="This planned side has no captured record."
      />
    );
  if (query.error || evidence.error || personal.error)
    return (
      <ErrorState
        error={(query.error || evidence.error || personal.error) as Error}
        onRetry={() => {
          void query.refetch();
          void evidence.refetch();
          if (perspectiveTurn !== undefined) void personal.refetch();
        }}
      />
    );
  if (!query.data) return <Loading />;
  const run = query.data;
  return (
    <section
      aria-label={`${name} condition`}
      className="flex min-w-0 flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          className="font-medium underline underline-offset-4"
          to={`/runs/${id}?turn=${actual}`}
        >
          {run.summary.condition}
        </Link>
        <Status value={run.summary.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        Recorded turn {actual} · round {evidence.data?.round ?? "…"}
        {evidence.data?.checkpoint.logical_time != null
          ? ` · logical time ${evidence.data.checkpoint.logical_time}`
          : ""}
      </p>
      {turn > run.summary.turn && (
        <Alert>
          {run.summary.status === "complete"
            ? "This side ended"
            : run.summary.status === "failed"
              ? "This side failed"
              : "No committed turn yet"}{" "}
          at turn {run.summary.turn}. Showing its last recorded state.
        </Alert>
      )}
      <RunViewer
        compact
        run={run}
        turn={actual}
        evidence={evidence.data}
        perspective={perspective}
        perspectiveEvidence={personal.data}
        onPerspective={setPerspective}
      />
    </section>
  );
}

export default function Matched() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const source = new URLSearchParams();
  for (const key of ["revision", "left", "right", "seed", "repetition"])
    source.set(key, params.get(key) ?? "");
  const query = useApi<MatchedReport>(
    `/studies/${id}/matched?${source}`,
    (data) => data?.active ?? false,
  );
  if (query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!query.data) return <Loading />;
  const report = query.data;
  const max = Math.max(report.left_turns, report.right_turns);
  const raw = Number(params.get("turn") ?? 0);
  const turn = Number.isInteger(raw) && raw >= 0 ? Math.min(max, raw) : 0;
  const select = (number: number) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("turn", String(number));
        return next;
      },
      { replace: true },
    );
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-4 text-xs text-muted-foreground"
      >
        <Link
          className="underline underline-offset-4"
          to={`/experiments/${id}?revision=${report.revision}&tab=results`}
        >
          Back to experiment Results
        </Link>
      </nav>
      <PageHeading
        title="Matched replay"
        description={`Version ${report.revision} · seed ${report.seed} · repetition ${report.repetition}`}
      />
      <div className="mb-5 flex flex-col gap-3">
        {report.first_divergence ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">
              First path difference at turn {report.first_divergence.turn}:{" "}
              {report.first_divergence.description}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => select(report.first_divergence?.turn ?? 0)}
            >
              Jump to difference
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No action, schedule or consequence difference in{" "}
            {report.compared_turns} jointly recorded turns.
          </p>
        )}
        <Disclosure>
          <DisclosureTrigger>
            Initial setup &amp; comparison scope
          </DisclosureTrigger>
          <DisclosureContent className="flex flex-col gap-3 pt-3 text-sm text-muted-foreground">
            <p>
              Setup fields that differ:{" "}
              {report.setup_differences.join(", ") || "none"}.
            </p>
            <p>
              Initial world fields that differ:{" "}
              {report.initial_state_differences.join(", ") || "none"}.
            </p>
            <p>
              {report.alignment} {report.limits}
            </p>
          </DisclosureContent>
        </Disclosure>
      </div>
      <PlaybackControls
        key={source.toString()}
        turn={turn}
        maxTurn={max}
        moments={
          report.first_divergence
            ? [
                {
                  turn: report.first_divergence.turn,
                  kind: "divergence",
                  title: "First path difference",
                },
              ]
            : []
        }
        onTurn={select}
      />
      <div className="mt-6 grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <Side
          key={report.left_run_id}
          id={report.left_run_id}
          turn={turn}
          name="Left"
        />
        <Side
          key={report.right_run_id}
          id={report.right_run_id}
          turn={turn}
          name="Right"
        />
      </div>
    </>
  );
}
