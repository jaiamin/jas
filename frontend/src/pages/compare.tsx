import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import { ErrorState, Loading, PageHeading, Status } from "@/components/shared";
import { Alert, Table } from "@/components/ui/data";
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
  if (error) return <ErrorState error={error} />;
  if (queries.some((q) => !q.data)) return <Loading />;
  const runs = queries.flatMap((q) => (q.data ? [q.data] : []));
  if (runs.length < 2)
    return <Alert>Select two to four runs in the run library.</Alert>;
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
      <PageHeading
        title="Compare runs"
        description="Recorded outcomes side by side. Different designs may not support a causal comparison."
      />
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
            <Table>
              <thead>
                <tr>
                  <th>Measurement</th>
                  {runs.map((r) => (
                    <th key={r.summary.id}>
                      <Link to={`/runs/${r.summary.id}`}>
                        {r.summary.condition}
                      </Link>
                      <span className="table-secondary">
                        Seed {r.summary.seed}
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
              name: `${r.summary.condition} · seed ${r.summary.seed} · repeat ${r.summary.repetition}`,
              measurements: r.measurements,
            }))}
            metricKey={metricKey}
          />
        </section>
      </div>
    </>
  );
}
