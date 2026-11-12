import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/lib/api";
import { label, money } from "@/lib/format";
import type { ResearchFindings as Findings } from "@/lib/types";

export function ResearchFindings({
  studyId,
  revision,
  active,
}: {
  studyId: string;
  revision: number;
  active: boolean;
}) {
  const query = useApi<Findings>(
    `/studies/${studyId}/findings?revision=${revision}`,
    active,
  );
  const report = query.data;
  const { refetch } = query;
  useEffect(() => {
    if (!active) void refetch();
  }, [active, refetch]);
  return (
    <section
      aria-label="Research findings"
      className="flex min-w-0 flex-col gap-4"
    >
      <div>
        <h2 className="text-base font-semibold">Research findings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculated from recorded evidence. No model calls.
        </p>
      </div>
      {query.error && (
        <Alert variant="error">
          {query.error.message}{" "}
          <Button variant="link" size="sm" onClick={() => query.refetch()}>
            Retry findings
          </Button>
        </Alert>
      )}
      {!report && !query.error && <Skeleton className="h-24 w-full" />}
      {report && (
        <>
          <p className="max-w-prose text-sm">{report.summary}</p>
          {report.observations.map((row) => (
            <p key={row.outcome} className="max-w-prose text-sm">
              {row.text} ({row.runs} eligible / {report.planned} planned.)
            </p>
          ))}
          {report.plan_status === "not_declared" && (
            <p className="text-sm text-muted-foreground">
              No executable analysis plan was declared. Registered metrics are
              descriptive; prose outcomes remain uncomputed. Tune a new revision
              to declare them before new trials.
            </p>
          )}
          {report.complete > 0 && report.outcomes.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outcome / condition</TableHead>
                    <TableHead>Observed mean</TableHead>
                    <TableHead>Eligible / planned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.results.map((row) => (
                    <TableRow key={`${row.metric}-${row.condition_key}`}>
                      <TableCell>
                        <span>{label(row.metric)}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {row.condition}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.mean === null
                          ? "Not computed"
                          : report.outcomes.find((o) => o.key === row.metric)
                                ?.calculation === "cost_usd"
                            ? money(row.mean)
                            : new Intl.NumberFormat(undefined, {
                                maximumFractionDigits: 3,
                              }).format(row.mean)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.runs} / {row.planned}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {report.effects.length > 0 && (
            <Disclosure>
              <DisclosureTrigger>
                Matched condition differences
              </DisclosureTrigger>
              <DisclosureContent className="flex flex-col gap-3 pt-3 text-sm">
                {report.effects.map((row) => (
                  <p key={`${row.metric}-${row.condition_key}`}>
                    {label(row.metric)} · {row.condition} − {row.baseline}:{" "}
                    {row.mean === null
                      ? "not identified"
                      : new Intl.NumberFormat(undefined, {
                          maximumFractionDigits: 3,
                        }).format(row.mean)}{" "}
                    · {row.pairs} / {row.planned_pairs} eligible pairs.{" "}
                    {row.method}.
                  </p>
                ))}
                <p className="text-muted-foreground">
                  Descriptive differences only. Missing pairs remain excluded
                  and visible in the planned denominator; no causal or
                  population inference is certified.
                </p>
              </DisclosureContent>
            </Disclosure>
          )}
          <Disclosure>
            <DisclosureTrigger>
              Effort across all attempted runs
            </DisclosureTrigger>
            <DisclosureContent className="pt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Condition</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Ledger charge</TableHead>
                    <TableHead>Waits / turns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.effort.map((row) => (
                    <TableRow key={row.condition_key}>
                      <TableCell>{row.condition}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.requests}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {money(row.cost_usd)}
                        {row.partial
                          ? " · includes pending/unknown reservations"
                          : ""}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.waits} / {row.committed_turns}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-sm text-muted-foreground">
                Includes failed and interrupted attempts and separate
                adjudication calls. Waiting costs API credits unless the
                explicit event-wait policy applies; World utility follows its
                own rules.
              </p>
            </DisclosureContent>
          </Disclosure>
          <Disclosure>
            <DisclosureTrigger>
              Calculations, missingness &amp; sources
            </DisclosureTrigger>
            <DisclosureContent className="flex flex-col gap-4 pt-3 text-sm">
              {report.outcomes.map((o) => (
                <div key={o.key}>
                  <p className="font-medium">
                    {label(o.key)} ·{" "}
                    {o.status === "manual"
                      ? "Manual assessment required"
                      : "Deterministic calculation"}
                  </p>
                  <p>
                    {o.formula} {o.manual_reason}
                  </p>
                </div>
              ))}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Recorded scope</TableHead>
                    <TableHead>Value / missing reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.evidence.map((row) => (
                    <TableRow key={`${row.outcome}-${row.run_id}`}>
                      <TableCell>{label(row.outcome)}</TableCell>
                      <TableCell>
                        <Link
                          className="text-link"
                          to={`/runs/${row.run_id}?turn=${row.through_turn}`}
                        >
                          Through turn {row.through_turn}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-48 whitespace-normal">
                        {row.value ?? row.missing_reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {report.plan && (
                <p>
                  Target: {report.plan.target} Sampling unit:{" "}
                  {report.plan.sampling_unit}. Allocation:{" "}
                  {report.plan.allocation}
                </p>
              )}
              <p className="text-muted-foreground">{report.interpretation}</p>
              <p className="break-all text-xs text-muted-foreground">
                Revision {report.revision} · design {report.design_sha256} ·
                analysis contract v{report.version}
              </p>
            </DisclosureContent>
          </Disclosure>
          <Disclosure>
            <DisclosureTrigger>
              Limits &amp; next discriminating tests
            </DisclosureTrigger>
            <DisclosureContent className="flex flex-col gap-3 pt-3 text-sm">
              {report.next_tests.map((test) => (
                <p key={test}>{test}</p>
              ))}
              <p className="text-muted-foreground">{report.review.limits}</p>
            </DisclosureContent>
          </Disclosure>
        </>
      )}
    </section>
  );
}
