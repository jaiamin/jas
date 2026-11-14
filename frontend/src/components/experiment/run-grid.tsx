import { Link } from "react-router-dom";
import { Status } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { conditionIdentity } from "@/lib/identity";
import type { StudyDetail } from "@/lib/types";

export function RunGrid({ study }: { study: StudyDetail }) {
  return (
    <section
      aria-label="Run status grid"
      className="overflow-hidden rounded-lg border"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Seed / repeat</TableHead>
            {study.design.conditions.map((condition) => (
              <TableHead key={condition.key}>
                <span
                  style={{
                    color: conditionIdentity(study.design, condition.key).color,
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
          {study.design.seeds.flatMap((seed) =>
            Array.from(
              { length: study.design.repetitions },
              (_, index) => index + 1,
            ).map((repetition) => (
              <TableRow key={`${seed}-${repetition}`}>
                <TableCell>
                  {seed} / {repetition}
                </TableCell>
                {study.design.conditions.map((condition) => {
                  const cell = study.comparison.cells.find(
                    (cell) =>
                      cell.seed === seed &&
                      cell.repetition === repetition &&
                      cell.condition_key === condition.key,
                  );
                  return (
                    <TableCell key={condition.key}>
                      {cell?.run_id ? (
                        <Link
                          title={cell.reason}
                          aria-label={`${condition.name}, seed ${seed}, repetition ${repetition}: ${cell.status}`}
                          to={`/runs/${cell.run_id}`}
                        >
                          <Status value={cell.status} />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Missing
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </section>
  );
}
