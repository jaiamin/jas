import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import { Alert, Empty } from "@/components/feedback";
import { OptionSelect as Select } from "@/components/option-select";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { label, metric, money, runModelLabel } from "@/lib/format";
import type { RunDetail } from "@/lib/types";

export default function Compare() {
  const [params] = useSearchParams();
  const ids = [
    ...new Set(params.get("runs")?.split(",").filter(Boolean) ?? []),
  ].slice(0, 4);
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: [`/runs/${id}`],
      queryFn: () => api<RunDetail>(`/runs/${id}`),
    })),
  });
  const [selected, setSelected] = useState("");
  const error = queries.find((q) => q.error)?.error;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={() =>
          Promise.all(
            queries
              .filter((query) => query.error)
              .map((query) => query.refetch()),
          )
        }
      />
    );
  if (queries.some((q) => !q.data)) return <Loading />;
  const runs = queries.flatMap((q) => (q.data ? [q.data] : []));
  if (runs.length < 2)
    return (
      <>
        <PageHeading title="Compare runs" />
        <Empty title="Choose runs to compare" description="Select 2–4 runs.">
          <Button asChild>
            <Link to="/runs">Browse runs</Link>
          </Button>
        </Empty>
      </>
    );
  const compatible = runs.every(
    (r) => r.summary.environment === runs[0]?.summary.environment,
  );
  const keys = [...new Set(runs.flatMap((r) => Object.keys(r.metrics)))].filter(
    (key) => runs.some((r) => r.metrics[key] != null),
  );
  const metricKey = keys.includes(selected)
    ? selected
    : (keys[0] ?? "contribution_rate");
  return (
    <>
      <PageHeading title="Compare runs">
        <Button variant="outline" asChild>
          <Link to="/runs">Choose runs</Link>
        </Button>
      </PageHeading>
      {!compatible && (
        <Alert>
          These runs use different environments. Shared metric names may have
          different meanings; inspect each protocol.
        </Alert>
      )}
      <div className="flex min-w-0 flex-col gap-8">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
            <h2 className="text-base font-semibold">Recorded outcomes</h2>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Measurement</TableHead>
                  {runs.map((r) => (
                    <TableHead key={r.summary.id}>
                      <span className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground">
                        {r.summary.study_title}
                      </span>
                      <Link to={`/runs/${r.summary.id}`}>
                        {r.summary.condition}
                      </Link>
                      <span className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground">
                        Rev {r.summary.revision} · seed {r.summary.seed} · rep{" "}
                        {r.summary.repetition} · {r.summary.id.slice(0, 6)}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Status</TableCell>
                  {runs.map((r) => (
                    <TableCell key={r.summary.id}>
                      <Status value={r.summary.status} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Model</TableCell>
                  {runs.map((r) => (
                    <TableCell key={r.summary.id}>
                      {runModelLabel(r.summary)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Turns</TableCell>
                  {runs.map((r) => (
                    <TableCell key={r.summary.id}>{r.summary.turn}</TableCell>
                  ))}
                </TableRow>
                {keys.map((key) => (
                  <TableRow key={key}>
                    <TableCell>{label(key)}</TableCell>
                    {runs.map((r) => (
                      <TableCell
                        className="text-right tabular-nums"
                        key={r.summary.id}
                      >
                        {metric(key, r.metrics[key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Cost</TableCell>
                  {runs.map((r) => (
                    <TableCell key={r.summary.id}>
                      {money(r.summary.usage.cost_usd)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
            <h2 className="text-base font-semibold">History by round</h2>
            {keys.length > 0 && (
              <Select
                label="Comparison measurement"
                value={metricKey}
                onValueChange={setSelected}
                options={keys.map((key) => ({ value: key, label: label(key) }))}
              />
            )}
          </div>
          <MetricChart
            series={runs.map((r) => ({
              id: r.summary.id,
              name: `${r.summary.condition} · rev ${r.summary.revision} · seed ${r.summary.seed} · rep ${r.summary.repetition}`,
              measurements: r.measurements,
            }))}
            metricKey={metricKey}
          />
        </section>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Different protocols may not support a causal comparison.
      </p>
    </>
  );
}
