import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { PlaybackControls } from "@/components/run/playback-controls";
import { RunViewer } from "@/components/run/run-viewer";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadRecording } from "@/lib/recordings";

export default function Watch() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [perspective, setPerspective] = useState("researcher");
  const recording = useQuery({
    queryKey: ["recording", id],
    queryFn: () => loadRecording(id),
  });
  if (recording.error)
    return <ErrorState error={recording.error} onRetry={recording.refetch} />;
  if (!recording.data) return <Loading />;
  const { run, evidence } = recording.data;
  const value = Number(params.get("turn") ?? 0);
  const turn =
    Number.isInteger(value) && value >= 0
      ? Math.min(run.summary.turn, value)
      : 0;
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground"
      >
        <Link to="/" className="hover:underline">
          Home
        </Link>
        <span>/</span>
        <span>Recorded starter</span>
      </nav>
      <PageHeading title={run.design.title} description={run.design.question}>
        <Button variant="outline" asChild>
          <Link to={`/new?starter=${encodeURIComponent(id)}`}>
            Use this starter
          </Link>
        </Button>
      </PageHeading>
      <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="secondary">Scripted demo</Badge>
        <span>No keys · no cost</span>
        <span>Seed {run.summary.seed}</span>
      </div>
      <Alert>
        This recording demonstrates the rules and viewer using a declared
        scripted policy. It is not evidence of model behavior.
      </Alert>
      <div className="mt-6 flex flex-col gap-6">
        <RunViewer
          run={run}
          turn={turn}
          evidence={evidence[turn]}
          perspective={perspective}
          perspectiveEvidence={evidence.findLast(
            (item) => item.number <= turn && item.actor === perspective,
          )}
          onPerspective={setPerspective}
        />
        <PlaybackControls
          key={id}
          turn={turn}
          maxTurn={run.summary.turn}
          moments={run.key_moments}
          onTurn={(number) => {
            setParams({ turn: String(number) }, { replace: true });
          }}
        />
      </div>
    </>
  );
}
