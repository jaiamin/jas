import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Json } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Analysis, AnalysisLensKey, ClaimSupport } from "@/lib/types";

const statuses: Record<ClaimSupport["claims"][number]["status"], string> = {
  checked: "Value checked",
  contradicted: "Contradicted",
  unsupported: "Unsupported",
  unavailable: "Unavailable",
  unassessed: "Unassessed",
};

export function ClaimEvidence({
  row,
  disabled,
  onReanalyze,
}: {
  row: Analysis;
  disabled: boolean;
  onReanalyze?: (lens: AnalysisLensKey) => void;
}) {
  const lens = row.output?.lens;
  const support = row.output?.support;
  if (!lens || row.status === "pending") return null;
  const nextLens = lens.key === "behavior" ? "communication" : "behavior";
  return (
    <section
      aria-label="Finding evidence"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Wording unassessed</Badge>
        {support?.status === "contradicted" && (
          <Badge variant="destructive">Numerical contradiction</Badge>
        )}
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {lens.account.slice(0, 3).map((item) => (
          <li key={item.run_id} className="flex min-w-0 flex-col gap-1">
            <span>{item.text}</span>
            <Link
              className="text-xs text-muted-foreground underline underline-offset-4"
              to={`/runs/${item.run_id}?turn=${item.turn}&tab=decisions`}
            >
              Run {item.run_id.slice(0, 5)} · through turn {item.turn}
            </Link>
          </li>
        ))}
      </ul>
      {lens.account.length > 3 && (
        <p className="text-xs text-muted-foreground">
          {lens.account.length - 3} further runs in the frozen evidence.
        </p>
      )}
      <Disclosure>
        <DisclosureTrigger>Evidence &amp; claim status</DisclosureTrigger>
        <DisclosureContent className="flex min-w-0 flex-col gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {support?.limitation ??
              "Request stopped. Captured facts remain available; interpretation is unassessed."}
          </p>
          {support?.claims.map((claim, index) => {
            const calculation = lens.calculations.find(
              (item) => item.id === claim.calculation_id,
            );
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: Claims are immutable ordered assertions and may repeat.
              <div key={index} className="flex min-w-0 flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      claim.status === "contradicted"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {statuses[claim.status]}
                  </Badge>
                  <span>{claim.text}</span>
                </div>
                {claim.kind === "calculation" && (
                  <p className="tabular-nums">
                    Claimed {claim.value ?? "unavailable"} · computed{" "}
                    {claim.computed ?? "unavailable"}
                  </p>
                )}
                <p className="text-muted-foreground">{claim.reason}</p>
                {calculation && (
                  <Disclosure>
                    <DisclosureTrigger>
                      Calculation inputs · {calculation.label}
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={calculation} />
                    </DisclosureContent>
                  </Disclosure>
                )}
              </div>
            );
          })}
          {!support?.claims.length && (
            <p className="text-sm">
              No structured assertions were checked. Wording still requires
              review.
            </p>
          )}
          <Disclosure>
            <DisclosureTrigger>
              Coverage &amp; missing evidence
            </DisclosureTrigger>
            <DisclosureContent className="flex flex-col gap-3 text-sm">
              <p>
                {lens.name} · version {lens.version}
              </p>
              <p>
                {lens.coverage.planned_cells} planned cells ·{" "}
                {lens.coverage.failed_cells} failed ·{" "}
                {lens.coverage.nonterminal_cells} nonterminal or unavailable.
              </p>
              <p>
                Requires:{" "}
                {lens.requirements
                  .map((value) => value.replaceAll("_", " "))
                  .join(", ")}
                .
              </p>
              {lens.coverage.runs.slice(0, 6).map((run) => (
                <div key={run.run_id} className="flex flex-col gap-1">
                  <p>
                    Run {run.run_id.slice(0, 5)}: {run.recorded_turns}{" "}
                    decisions; {run.missing_turns.length} missing turns; input
                    capture {run.exposure_capture}; {run.unknown_requests}{" "}
                    unknown request receipts.
                  </p>
                  {run.truncation.run_continues && (
                    <p>
                      The captured run was unfinished; later opportunities are
                      outside this analysis.
                    </p>
                  )}
                  <p className="text-muted-foreground">{run.truncation.note}</p>
                </div>
              ))}
              {lens.coverage.runs.length > 6 && (
                <p>
                  Further run coverage is retained in the full frozen evidence.
                </p>
              )}
              <ul className="list-disc pl-5">
                {lens.limitations.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </DisclosureContent>
          </Disclosure>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/analyses/${row.id}`} download>
                Download frozen evidence
              </a>
            </Button>
            {row.status === "complete" && onReanalyze && (
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onReanalyze(nextLens)}
              >
                Reanalyze {nextLens}
              </Button>
            )}
          </div>
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}
