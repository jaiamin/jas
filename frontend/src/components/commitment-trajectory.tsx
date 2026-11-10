import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label } from "@/lib/format";
import type { Event, RunDetail, State } from "@/lib/types";

export function CommitmentTrajectory({
  run,
  state,
  events,
}: {
  run: RunDetail;
  state: State;
  events: Event[];
}) {
  const rules = run.parameters.commitments;
  if (!rules) return null;
  const names = new Map(run.design.profiles.map((p) => [p.key, p.name]));
  return (
    <section
      aria-label="Commitment trajectory"
      className="flex min-w-0 flex-col gap-2"
    >
      <h3 className="text-sm font-medium">Commitments and reliance</h3>
      <p className="text-sm text-muted-foreground">
        Private recipient effects are recorded separately. Eligibility requires
        reliance, feasibility and an actual opportunity. Unresolved deadlines
        have no settled effect; breach alone does not establish intent.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opportunity</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Feasibility and opportunities</TableHead>
            <TableHead>Reliance and access</TableHead>
            <TableHead>Resolution</TableHead>
            <TableHead>Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.opportunities.map((o) => {
            const row = state.commitments?.[o.key];
            const sources = events.filter(
              (e) =>
                e.data.key === o.key && e.kind !== "commitment_availability",
            );
            const consequence = sources.find(
              (e) => e.kind === "reliance_consequence",
            );
            const value =
              consequence && typeof consequence.data.value === "number"
                ? consequence.data.value
                : null;
            return (
              <TableRow key={o.key}>
                <TableCell>
                  <p>{o.key}</p>
                  <p>
                    {names.get(o.promisor)} → {names.get(o.recipient)}
                  </p>
                  <p>Promised alternative: {o.alternative}</p>
                </TableCell>
                <TableCell className="tabular-nums">
                  <p>Opening: {o.opens_at}</p>
                  <p>Deadline: {o.deadline}</p>
                  <p>Promised at: {row?.promised_at ?? "No promise"}</p>
                </TableCell>
                <TableCell>
                  <p>
                    Feasible at promise:{" "}
                    {row
                      ? row.feasible_at_promise
                        ? "yes"
                        : "no"
                      : "not assessed"}
                  </p>
                  <p>
                    Decision times:{" "}
                    {row?.opportunities.join(", ") || "None recorded"}
                  </p>
                  <p>
                    Eligible:{" "}
                    {row?.status === "pending"
                      ? "pending"
                      : row?.eligible
                        ? "yes"
                        : "no"}
                  </p>
                </TableCell>
                <TableCell>
                  <p>Relied at: {row?.relied_at ?? "No reliance"}</p>
                  <a
                    className="underline underline-offset-4"
                    href={`#artifact-${o.artifact}`}
                  >
                    {o.artifact}
                  </a>
                  <p>
                    {state.read_grants?.[o.artifact]?.includes(o.promisor)
                      ? `Read granted to ${names.get(o.promisor)}`
                      : "Access not entrusted"}
                  </p>
                </TableCell>
                <TableCell className="tabular-nums">
                  <p>{row ? label(row.status) : "No promise"}</p>
                  <p>Resolved at: {row?.resolved_at ?? "Not resolved"}</p>
                  <p>Fulfilled at: {row?.fulfilled_at ?? "Not recorded"}</p>
                  <p>
                    Recipient effect:{" "}
                    {value ??
                      (row?.resolved_at != null
                        ? "none recorded"
                        : "not settled")}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {sources.length
                      ? sources.map((e) => (
                          <Link
                            key={e.id}
                            className="underline underline-offset-4"
                            to={`/runs/${run.summary.id}?tab=decisions&turn=${e.turn}`}
                          >
                            Turn {e.turn} · {label(e.kind)}
                          </Link>
                        ))
                      : "No settled evidence"}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
