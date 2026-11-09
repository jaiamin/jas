import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { ChevronLeft, ChevronRight, ExperimentIcon } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { RecordTable } from "@/components/record-table";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecordFilters } from "@/hooks/use-record-filters";
import { date, label } from "@/lib/format";
import type { StudySummary } from "@/lib/types";
export function StudyTable({
  studies,
  filters,
}: {
  studies: StudySummary[];
  filters: RecordFilters;
}) {
  const { search, status, page, setStatus, setPage } = filters;
  const filtered = studies.filter(
    (s) =>
      `${s.title} ${s.question}`.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || s.status === status),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pageCount - 1);
  if (!studies.length)
    return (
      <div className="min-w-0">
        <Empty
          title="No experiments yet"
          description="Create an experiment to define the agents, conditions, and rules."
        />
      </div>
    );
  return (
    <div className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Select
          label="Filter experiment status"
          value={status}
          onValueChange={setStatus}
          options={[
            "all",
            "ready",
            "running",
            "pausing",
            "paused",
            "complete",
            "failed",
          ].map((v) => ({
            value: v,
            label: v === "all" ? "All statuses" : label(v),
          }))}
        />
      </div>
      <RecordTable>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Name</TableHead>
            <TableHead className="w-36">Status</TableHead>

            <TableHead className="w-24">Runs</TableHead>

            <TableHead className="w-48">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.slice(current * 10, (current + 1) * 10).map((study) => (
            <TableRow key={study.id}>
              <TableCell className="min-w-48 max-w-96">
                <div className="flex items-center gap-2 [&>svg]:size-4 [&>svg]:text-muted-foreground">
                  <ExperimentIcon aria-hidden="true" />
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    to={`/studies/${study.id}`}
                  >
                    {study.title}
                  </Link>
                </div>
                <span
                  className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground"
                  title={study.question}
                >
                  {label(study.environment)} · Revision {study.revision}
                </span>
              </TableCell>
              <TableCell>
                <Status value={study.status} />
              </TableCell>
              <TableCell className="tabular-nums">
                {study.completed_runs} / {study.run_count}
              </TableCell>

              <TableCell className="text-muted-foreground whitespace-nowrap">
                {date(study.created)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </RecordTable>
      {!filtered.length && (
        <Empty title="No matching experiments">
          <Button variant="outline" onClick={filters.clear}>
            Clear filters
          </Button>
        </Empty>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-end px-4 py-3 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span>
              {current + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous experiment page"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next experiment page"
              disabled={current + 1 >= pageCount}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
