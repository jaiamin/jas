import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Empty, Table } from "@/components/ui/data";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { RunDetail } from "@/lib/types";
import { label, metric, money, runModelLabel } from "@/lib/utils";

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
      <div className="comparison-layout">
        <section>
          <div className="section-heading">
            <h2>Recorded outcomes</h2>
          </div>
          <div className="table-frame">
            <Table className="table">
              <thead>
                <tr>
                  <th>Measurement</th>
                  {runs.map((r) => (
                    <th key={r.summary.id}>
                      <span className="table-secondary">
                        {r.summary.study_title}
                      </span>
                      <Link to={`/runs/${r.summary.id}`}>
                        {r.summary.condition}
                      </Link>
                      <span className="table-secondary">
                        Rev {r.summary.revision} · seed {r.summary.seed} · rep{" "}
                        {r.summary.repetition} · {r.summary.id.slice(0, 6)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Status</td>
                  {runs.map((r) => (
                    <td key={r.summary.id}>
                      <Status value={r.summary.status} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Model</td>
                  {runs.map((r) => (
                    <td key={r.summary.id}>{runModelLabel(r.summary)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Turns</td>
                  {runs.map((r) => (
                    <td key={r.summary.id}>{r.summary.turn}</td>
                  ))}
                </tr>
                {keys.map((key) => (
                  <tr key={key}>
                    <td>{label(key)}</td>
                    {runs.map((r) => (
                      <td className="numeric" key={r.summary.id}>
                        {metric(key, r.metrics[key])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Cost</td>
                  {runs.map((r) => (
                    <td key={r.summary.id}>
                      {money(r.summary.usage.cost_usd)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </Table>
          </div>
        </section>
        <section>
          <div className="section-heading">
            <h2>History by round</h2>
            <Select
              label="Comparison measurement"
              value={metricKey}
              onValueChange={setSelected}
              options={keys.map((key) => ({ value: key, label: label(key) }))}
            />
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
      <p className="comparison-note muted">
        Different protocols may not support a causal comparison.
      </p>
    </>
  );
}
