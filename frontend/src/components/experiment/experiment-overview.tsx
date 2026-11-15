import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { SeedChart } from "@/components/experiment/seed-chart";
import { Empty } from "@/components/feedback";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { label, metric } from "@/lib/format";
import type { ResearchFindings, RunSummary, StudyDetail } from "@/lib/types";

export function ExperimentOverview({
  study,
  activeRun,
}: {
  study: StudyDetail;
  activeRun?: RunSummary;
}) {
  const declared = study.design.analysis_plan?.outcomes[0];
  const findings = useQuery({
    queryKey: [`/studies/${study.id}/findings?revision=${study.revision}`],
    queryFn: () =>
      api<ResearchFindings>(
        `/studies/${study.id}/findings?revision=${study.revision}`,
      ),
    enabled: !!declared,
    refetchInterval: activeRun ? 1500 : false,
  });
  const primary =
    declared?.key ?? study.design.measures[0] ?? study.results[0]?.metric;
  const results = declared ? (findings.data?.results ?? []) : study.results;
  const rows = results.filter((result) => result.metric === primary);
  const cells = declared
    ? study.comparison.cells.map((cell) => {
        const value = findings.data?.evidence.find(
          (row) => row.run_id === cell.run_id && row.outcome === primary,
        )?.value;
        return { ...cell, metrics: value == null ? {} : { [primary]: value } };
      })
    : study.comparison.cells;
  const limits = [
    ...new Set(
      [
        ...study.design.limitations,
        ...study.preflight.issues.map((issue) => issue.message),
        study.comparison.uncertainty_reason,
      ].filter(Boolean),
    ),
  ];
  const present = rows.filter((row) => row.mean != null);
  return (
    <section
      aria-label="Experiment overview"
      className="flex min-w-0 flex-col gap-6"
    >
      {declared && findings.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Calculating the declared outcome…
        </p>
      ) : findings.error ? (
        <ErrorState
          title="Results couldn’t load"
          error={findings.error}
          onRetry={findings.refetch}
        />
      ) : present.length ? (
        <div>
          <h2 className="max-w-prose text-base font-medium leading-relaxed">
            {present.slice(0, 2).map((row, index) => (
              <span key={row.condition_key}>
                {index ? " and " : ""}
                {row.condition} averaged {metric(primary ?? "", row.mean)}
              </span>
            ))}{" "}
            on {label(primary ?? "").toLowerCase()}.
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {declared ? "First declared outcome" : "Descriptive metric"} ·{" "}
            {rows.reduce((total, row) => total + row.runs, 0)} eligible /{" "}
            {rows.reduce((total, row) => total + row.planned, 0)} planned runs.
            Missing and ineligible runs remain available in Results.
          </p>
        </div>
      ) : (
        <Empty
          title={activeRun ? "Runs in progress" : "No results yet"}
          description={
            declared?.calculation === "manual"
              ? "The first declared outcome requires manual assessment."
              : "The numerical summary appears as eligible runs finish."
          }
        >
          {activeRun && (
            <Button variant="outline" asChild>
              <Link to={`/runs/${activeRun.id}`}>Watch live</Link>
            </Button>
          )}
        </Empty>
      )}
      {primary && present.length > 0 && (
        <SeedChart design={study.design} cells={cells} metricKey={primary} />
      )}
      {limits.length > 0 && (
        <section
          aria-label="Interpretation limits"
          className="flex flex-col gap-3 border-t pt-6"
        >
          <h2 className="text-sm font-medium">Interpretation</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {limits[0]}
          </p>
          {limits.length > 1 && (
            <Disclosure>
              <DisclosureTrigger>All limits</DisclosureTrigger>
              <DisclosureContent>
                <ul className="flex max-w-prose flex-col gap-3 pt-3 text-sm text-muted-foreground">
                  {limits.slice(1).map((limit) => (
                    <li key={limit}>{limit}</li>
                  ))}
                </ul>
              </DisclosureContent>
            </Disclosure>
          )}
        </section>
      )}
    </section>
  );
}
