import { useState } from "react";
import { Link } from "react-router-dom";
import { SeedChart } from "@/components/experiment/seed-chart";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label, metric } from "@/lib/format";
import { conditionIdentity } from "@/lib/identity";
import type { StudyDetail } from "@/lib/types";

export function ExperimentResults({ study }: { study: StudyDetail }) {
  const [selected, setSelected] = useState<{
    condition: string;
    metric: string;
  } | null>(null);
  const metrics = study.design.measures.length
    ? study.design.measures
    : [...new Set(study.results.map((result) => result.metric))];
  const baseline = study.design.conditions[0];
  return (
    <section
      aria-label="Condition results"
      className="flex min-w-0 flex-col gap-4"
    >
      <h2 className="text-sm font-medium">Outcomes by condition</h2>
      <div className="min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              {study.design.conditions.map((condition) => (
                <TableHead key={condition.key}>
                  <span
                    style={{
                      color: conditionIdentity(study.design, condition.key)
                        .color,
                    }}
                  >
                    ●
                  </span>{" "}
                  {condition.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((key) => (
              <TableRow key={key}>
                <TableCell>{label(key)}</TableCell>
                {study.design.conditions.map((condition) => {
                  const cells = study.comparison.cells.filter(
                    (cell) => cell.condition_key === condition.key,
                  );
                  const result = study.results.find(
                    (result) =>
                      result.condition_key === condition.key &&
                      result.metric === key,
                  );
                  const unavailable = cells.filter(
                    (cell) =>
                      cell.status !== "complete" || cell.metrics[key] == null,
                  );
                  return (
                    <TableCell
                      key={condition.key}
                      className="min-w-44 p-0 align-top"
                    >
                      <button
                        type="button"
                        className="flex w-full flex-col items-stretch gap-1 p-3 text-left hover:bg-muted/40 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                        aria-label={`${label(key)} · ${condition.name}: inspect runs`}
                        onClick={() =>
                          setSelected({ condition: condition.key, metric: key })
                        }
                      >
                        <span className="text-base font-medium tabular-nums">
                          {metric(key, result?.mean)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result?.runs ?? 0} eligible /{" "}
                          {result?.planned ?? cells.length} planned ·{" "}
                          {result?.seeds ?? 0} seeds
                        </span>
                        <SeedChart
                          design={study.design}
                          conditionKey={condition.key}
                          cells={cells}
                          metricKey={key}
                          compact
                          domain={(() => {
                            const values = study.comparison.cells.flatMap(
                              (cell) =>
                                cell.metrics[key] == null
                                  ? []
                                  : [cell.metrics[key]],
                            );
                            return values.length
                              ? ([Math.min(...values), Math.max(...values)] as [
                                  number,
                                  number,
                                ])
                              : undefined;
                          })()}
                        />
                        {unavailable.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {unavailable.length} failed, missing or ineligible ·
                            inspect
                          </span>
                        )}
                      </button>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
        One dot per eligible seed; repetitions are averaged within seed. Only
        complete, defined outcomes contribute to means. Planned cells remain
        inspectable. No population confidence interval is identified.
      </p>
      {study.design.conditions.length > 1 && (
        <section
          aria-label="Matched seeds"
          className="mt-4 flex min-w-0 flex-col gap-4"
        >
          <h2 className="text-sm font-medium">Matched runs</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seed</TableHead>
                <TableHead>Repetition</TableHead>
                <TableHead>Matched replay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {study.design.seeds.flatMap((seed) =>
                Array.from(
                  { length: study.design.repetitions },
                  (_, index) => index + 1,
                ).map((repetition) => (
                  <TableRow key={`${seed}-${repetition}`}>
                    <TableCell>{seed}</TableCell>
                    <TableCell>{repetition}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {study.design.conditions.slice(1).map((condition) => (
                          <Button
                            key={condition.key}
                            variant="link"
                            size="sm"
                            asChild
                          >
                            <Link
                              to={`/experiments/${study.id}/matched?revision=${study.revision}&seed=${seed}&repetition=${repetition}&left=${encodeURIComponent(baseline.key)}&right=${encodeURIComponent(condition.key)}`}
                            >
                              {baseline.name} / {condition.name}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </section>
      )}
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selected && label(selected.metric)} ·{" "}
              {
                study.design.conditions.find(
                  (condition) => condition.key === selected?.condition,
                )?.name
              }
            </SheetTitle>
            <SheetDescription>
              Every planned seed and repetition, including failed and missing
              outcomes.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seed / repeat</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {study.comparison.cells
                  .filter((cell) => cell.condition_key === selected?.condition)
                  .map((cell) => (
                    <TableRow key={`${cell.seed}-${cell.repetition}`}>
                      <TableCell>
                        {cell.seed} / {cell.repetition}
                      </TableCell>
                      <TableCell>
                        {metric(
                          selected?.metric ?? "",
                          selected ? cell.metrics[selected.metric] : undefined,
                        )}
                        <p className="mt-1 max-w-48 whitespace-normal text-xs text-muted-foreground">
                          {cell.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        {cell.run_id ? (
                          <Link
                            className="underline underline-offset-4"
                            to={`/runs/${cell.run_id}`}
                          >
                            <Status value={cell.status} />
                          </Link>
                        ) : (
                          "Missing"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
