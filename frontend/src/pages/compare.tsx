import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MetricChart } from "@/components/charts";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert, Empty } from "@/components/feedback";
import { OptionSelect as Select } from "@/components/option-select";
import {
  ErrorState,
  Json,
  Loading,
  PageHeading,
  Status,
} from "@/components/shared";
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
                        Version {r.summary.revision} · seed {r.summary.seed} ·
                        rep {r.summary.repetition} · {r.summary.id.slice(0, 6)}
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
                {[
                  {
                    name: "Participant harness",
                    value: (r: RunDetail) =>
                      `${label(r.harness.kind)} v${r.harness.version}${r.harness.kind === "scripted" ? ` · ${r.harness.policy}` : ""}`,
                  },
                  {
                    name: "Retained memory",
                    value: (r: RunDetail) => r.parameters.memory,
                  },
                  {
                    name: "Per-activation limits",
                    value: (r: RunDetail) =>
                      `${r.harness.max_requests} requests · ${r.harness.max_tool_operations} operations`,
                  },
                  {
                    name: "Per-request output limit",
                    value: (r: RunDetail) =>
                      r.harness.kind === "scripted"
                        ? "No model inference"
                        : `${r.design.response_tokens} tokens · reasoning effort: ${r.design.openai_reasoning_effort ?? "provider default"}`,
                  },
                  {
                    name: "Inference attempts / requests",
                    value: (r: RunDetail) =>
                      r.effort
                        ? `${r.effort.inference_attempts} / ${r.effort.usage.requests}`
                        : "Not captured",
                  },
                  {
                    name: "Tool operations / attempts",
                    value: (r: RunDetail) =>
                      r.effort
                        ? `${r.effort.tool_operations} / ${r.effort.tool_attempts}`
                        : "Not captured",
                  },
                  {
                    name: "Input / output tokens",
                    value: (r: RunDetail) =>
                      `${r.summary.usage.input_tokens} / ${r.summary.usage.output_tokens}${r.summary.usage.partial ? " · partial" : ""}`,
                  },
                ].map(({ name, value }) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    {runs.map((r) => (
                      <TableCell key={r.summary.id}>{value(r)}</TableCell>
                    ))}
                  </TableRow>
                ))}
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
                      {r.summary.usage.partial &&
                        " · includes unknown/pending charges"}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Selected runs only. Effort includes failed attempts; differing
            envelopes are not compute matched. For planned support, matching,
            missingness and uncertainty, open the experiment's Results.
          </p>
          {runs.map((r) => (
            <Disclosure key={r.summary.id} className="mt-3">
              <DisclosureTrigger>
                Participant configuration · {r.summary.condition} ·{" "}
                {r.summary.id.slice(0, 6)}
              </DisclosureTrigger>
              <DisclosureContent className="flex min-w-0 flex-col gap-3 pt-3">
                <Link
                  className="text-link"
                  to={`/experiments/${r.summary.study_id}?revision=${r.summary.revision}`}
                >
                  Experiment results · version {r.summary.revision}
                </Link>
                <Json
                  value={{
                    condition: r.design.conditions.find(
                      (c) => c.key === r.summary.condition_key,
                    ),
                    profiles: r.design.profiles,
                    response_tokens: r.design.response_tokens,
                    openai_reasoning_effort: r.design.openai_reasoning_effort,
                    effort: r.effort,
                    recorded_identities: r.activations.map((a) => ({
                      id: a.id,
                      actor: a.actor,
                      status: a.status,
                      stop_reason: a.stop_reason,
                      identity: a.identity,
                    })),
                  }}
                />
              </DisclosureContent>
            </Disclosure>
          ))}
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
              name: `${r.summary.condition} · version ${r.summary.revision} · seed ${r.summary.seed} · rep ${r.summary.repetition}`,
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
