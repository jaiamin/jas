import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert, Empty } from "@/components/feedback";
import { Json } from "@/components/shared";
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
import { label } from "@/lib/format";
import type { ExposureReport, ExposureSource } from "@/lib/types";

const names: Record<string, string> = {
  observation: "World observation",
  rules: "Rule framing",
  choices: "Legal choices",
  message: "Message records",
  claim: "Signal reports",
  sanction: "Sanction records",
};

export function ExposureInspection({ path }: { path: string }) {
  const query = useApi<ExposureReport | { runs: ExposureReport[] }>(path, true);
  const reports = query.data
    ? "runs" in query.data
      ? query.data.runs
      : [query.data]
    : [];
  return (
    <section
      aria-label="Treatment exposure"
      className="mt-8 flex min-w-0 flex-col gap-4"
    >
      <div>
        <h2 className="text-base font-semibold">Treatment exposure</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assignment, eligible opportunities and confirmed model input at each
          cutoff. Inclusion does not establish attention, belief or intent.
        </p>
      </div>
      {query.isPending && (
        <div
          role="status"
          aria-label="Loading exposure evidence"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
        </div>
      )}
      {query.error && (
        <Alert variant="error" title="Could not load exposure evidence">
          {query.error.message}
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry exposure
          </Button>
        </Alert>
      )}
      {query.data && !reports.length && (
        <Empty
          title="No assigned runs"
          description="Exposure evidence appears with the experiment's run plan."
        />
      )}
      {reports.map((report) => (
        <Disclosure
          key={report.run_id}
          defaultOpen={reports.length === 1}
          className="min-w-0"
        >
          <DisclosureTrigger>
            {report.assignment.condition_name} · through turn{" "}
            {report.through_turn} · {report.run_id.slice(0, 8)}
          </DisclosureTrigger>
          <DisclosureContent className="flex min-w-0 flex-col gap-4 pt-3">
            <p className="text-sm text-muted-foreground">
              Assignment-based record ·{" "}
              <Source source={report.assignment.source} />
              {report.capture === "unavailable" && (
                <span className="block">Historical capture unavailable</span>
              )}
              {report.capture === "partial" && (
                <span className="block">Historical capture incomplete</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Confirmed included / eligible
            </p>
            <div className="min-w-0 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Input or record</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Opportunities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.summary.map((count) => (
                    <TableRow key={count.kind}>
                      <TableCell>
                        {names[count.kind] ?? label(count.kind)}
                      </TableCell>
                      <TableCell>
                        {count.exposed_participants === null
                          ? `Unknown · ${count.confirmed_participants} confirmed / ${count.eligible_participants} eligible`
                          : `${count.exposed_participants} / ${count.eligible_participants}`}
                      </TableCell>
                      <TableCell>
                        {count.exposed_opportunities === null
                          ? `Unknown · ${count.confirmed_opportunities} confirmed / ${count.eligible_opportunities} eligible`
                          : `${count.exposed_opportunities} / ${count.eligible_opportunities}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.delivery.confirmed_requests} requests with confirmed input
              · {report.delivery.unknown_requests} with unknown delivery ·{" "}
              {report.delivery.unsent_attempts} inference attempts without a
              sent request. Eligible counts follow recipients, including
              authors; memory and later turns can prevent inclusion. These are
              not independent sample sizes. Cutoffs count committed turns;
              membership also retains unfinished attempts at the next decision
              boundary.
            </p>
            <Disclosure className="min-w-0">
              <DisclosureTrigger>Assigned configuration</DisclosureTrigger>
              <DisclosureContent>
                <Json value={report.assignment.configuration} />
              </DisclosureContent>
            </Disclosure>
            <Disclosure className="min-w-0">
              <DisclosureTrigger>Exposure sources</DisclosureTrigger>
              <DisclosureContent className="flex min-w-0 flex-col gap-4 pt-3">
                {!report.opportunities.length && (
                  <Empty title="No opportunities captured" />
                )}
                {report.opportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className="flex min-w-0 flex-col gap-2 border-b pb-3 text-sm"
                  >
                    <p className="font-medium">
                      {opportunity.participant} ·{" "}
                      {names[opportunity.kind] ?? label(opportunity.kind)} ·{" "}
                      {opportunity.included === null
                        ? "Unknown inclusion"
                        : opportunity.included
                          ? "Confirmed input"
                          : "No confirmed input"}
                    </p>
                    <Source source={opportunity.source} />
                    <p className="text-muted-foreground">
                      {opportunity.available.length} available observations ·{" "}
                      {opportunity.inputs.length} candidate inputs
                    </p>
                    {opportunity.available.map((source) => (
                      <Source
                        key={`${source.href}:${source.pointer}`}
                        source={source}
                      />
                    ))}
                    {opportunity.inputs.map((input) => (
                      <div
                        key={`${input.source.href}:${input.source.pointer}`}
                        className="min-w-0"
                      >
                        <span>
                          {label(input.delivery)} delivery ·{" "}
                          {label(input.request_status)} request ·{" "}
                        </span>
                        <Source source={input.source} />
                        <code className="block break-all text-xs text-muted-foreground">
                          {input.source.pointer}
                        </code>
                      </div>
                    ))}
                    {opportunity.capture_unavailable && (
                      <p>
                        Historical capture unavailable for this opportunity.
                      </p>
                    )}
                  </div>
                ))}
              </DisclosureContent>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>
                Interpretation and cutoff membership
              </DisclosureTrigger>
              <DisclosureContent className="flex min-w-0 flex-col gap-3 pt-3">
                {report.interpretation.map((note) => (
                  <p key={note} className="text-sm text-muted-foreground">
                    {note}
                  </p>
                ))}
                <Json value={report.membership} />
              </DisclosureContent>
            </Disclosure>
          </DisclosureContent>
        </Disclosure>
      ))}
      <p className="text-sm text-muted-foreground">
        Exposure-conditioned descriptions select on input after assignment.
        Exposed-only filtering does not automatically identify a causal effect.
        The experiment export retains sources and frozen analysis cutoffs.
      </p>
    </section>
  );
}

function Source({ source }: { source: ExposureSource }) {
  return (
    <a href={source.href} className="break-words underline underline-offset-4">
      {source.label}
    </a>
  );
}
