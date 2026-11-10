import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label, metric } from "@/lib/format";
import type { ComparisonReport, Sensitivity } from "@/lib/types";

function Bounds({
  name,
  sensitivity,
}: {
  name: string;
  sensitivity: Sensitivity;
}) {
  return (
    <p>
      {sensitivity.bounds
        ? `Planned-sample ${sensitivity.status === "observed" ? "value" : "bounds"}: ${metric(name, sensitivity.bounds[0])} to ${metric(name, sensitivity.bounds[1])}. `
        : "Planned-sample value not identified. "}
      {sensitivity.reason}
    </p>
  );
}

export function ComparisonEvidence({ report }: { report: ComparisonReport }) {
  const { comparison, results, effects } = report;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Condition",
                "Complete / planned",
                "Attempted",
                "Failed",
                "Interrupted",
                "Excluded",
                "Unmatched",
              ].map((name) => (
                <TableHead key={name}>{name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.conditions.map((c) => (
              <TableRow key={c.condition_key}>
                <TableCell>{c.condition}</TableCell>
                <TableCell className="tabular-nums">
                  {c.complete} / {c.planned}
                </TableCell>
                {[
                  c.attempted,
                  c.failed,
                  c.interrupted,
                  c.excluded,
                  c.unmatched,
                ].map((value, i) => (
                  <TableCell
                    key={
                      [
                        "attempted",
                        "failed",
                        "interrupted",
                        "excluded",
                        "unmatched",
                      ][i]
                    }
                    className="tabular-nums"
                  >
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">
        Estimates use complete, eligible outcomes. Excluded runs lack a terminal
        outcome; unmatched runs lack a complete counterpart. Counts overlap.
        Confidence intervals are withheld.
      </p>
      <Disclosure>
        <DisclosureTrigger>Sample &amp; uncertainty</DisclosureTrigger>
        <DisclosureContent className="flex min-w-0 flex-col gap-4 text-sm">
          <div className="flex max-w-prose flex-col gap-2">
            <p>
              Matching: {comparison.matching_unit}. Inference:{" "}
              {comparison.inference_unit}.
            </p>
            <p>
              Independent support:{" "}
              {comparison.independent_support ?? "not established"}.{" "}
              {comparison.dependence}
            </p>
            <p>{comparison.uncertainty_reason}</p>
            <p>{comparison.selection_assumption}</p>
            <p>
              Attempted counts recorded execution, including failure before a
              provider request. It does not count requests or cost.
            </p>
            <p>
              Revision {comparison.revision} · comparison v{comparison.version}{" "}
              · design{" "}
              <code className="break-all">{comparison.design_sha256}</code>
            </p>
          </div>
          {comparison.conditions.map((c) => (
            <p key={c.condition_key}>
              {c.condition}: {c.ready} not attempted · {c.in_progress} in
              progress · {c.not_captured} outside capture or absent.
            </p>
          ))}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Condition",
                    "Seed / repetition",
                    "Status",
                    "Through turn",
                    "Reason",
                  ].map((name) => (
                    <TableHead key={name}>{name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.cells.map((c) => (
                  <TableRow
                    key={`${c.condition_key}-${c.seed}-${c.repetition}`}
                  >
                    <TableCell>
                      {
                        comparison.conditions.find(
                          (row) => row.condition_key === c.condition_key,
                        )?.condition
                      }
                    </TableCell>
                    <TableCell>
                      {c.run_id ? (
                        <Link className="text-link" to={`/runs/${c.run_id}`}>
                          {c.seed} / {c.repetition}
                        </Link>
                      ) : (
                        `${c.seed} / ${c.repetition}`
                      )}
                    </TableCell>
                    <TableCell>{label(c.status)}</TableCell>
                    <TableCell>{c.through_turn ?? "—"}</TableCell>
                    <TableCell className="min-w-48 whitespace-normal break-words">
                      {c.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {results.map((r) => (
            <Disclosure key={`${r.condition_key}-${r.metric}`}>
              <DisclosureTrigger>
                {r.condition} · {label(r.metric)} · {r.runs} / {r.planned}{" "}
                eligible runs
              </DisclosureTrigger>
              <DisclosureContent className="flex max-w-prose flex-col gap-2">
                <p>
                  {r.method}. {r.seeds} observed seed clusters; {r.excluded}{" "}
                  excluded for this measurement.
                </p>
                <Bounds name={r.metric} sensitivity={r.sensitivity} />
                {r.exclusions.map((e) => (
                  <p key={`${e.seed}-${e.repetition}`}>
                    Seed {e.seed}, repetition {e.repetition}: {e.reason}.
                  </p>
                ))}
              </DisclosureContent>
            </Disclosure>
          ))}
        </DisclosureContent>
      </Disclosure>
      {effects.length > 0 && (
        <Disclosure>
          <DisclosureTrigger>Matched-seed effects</DisclosureTrigger>
          <DisclosureContent className="flex min-w-0 flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      "Comparison",
                      "Measurement",
                      "Observed difference",
                      "Support",
                    ].map((name) => (
                      <TableHead key={name}>{name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {effects.map((e) => (
                    <TableRow key={`${e.condition_key}-${e.metric}`}>
                      <TableCell>
                        {e.condition} − {e.baseline}
                      </TableCell>
                      <TableCell>{label(e.metric)}</TableCell>
                      <TableCell className="tabular-nums">
                        {e.mean != null && e.mean > 0 ? "+" : ""}
                        {metric(e.metric, e.mean)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {e.pairs} / {e.planned_pairs} pairs · {e.seeds} seed
                        clusters
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="max-w-prose text-sm text-muted-foreground">
              Treatment minus the first condition, using complete, eligible
              matched cells. Repetitions are averaged within seed. Missing pairs
              may change the conclusion.
            </p>
            {effects.map((e) => (
              <Disclosure key={`${e.condition_key}-${e.metric}`}>
                <DisclosureTrigger>
                  {e.condition} − {e.baseline} · {label(e.metric)} · sensitivity
                  &amp; missing pairs
                </DisclosureTrigger>
                <DisclosureContent className="flex max-w-prose flex-col gap-2 text-sm">
                  <Bounds name={e.metric} sensitivity={e.sensitivity} />
                  <p>{e.selection_assumption}</p>
                  {e.missing_pairs.map((p) => (
                    <p key={`${p.seed}-${p.repetition}`}>
                      Seed {p.seed}, repetition {p.repetition}: {p.reason}.
                    </p>
                  ))}
                </DisclosureContent>
              </Disclosure>
            ))}
          </DisclosureContent>
        </Disclosure>
      )}
    </div>
  );
}
