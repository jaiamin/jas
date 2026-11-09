import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { ExperimentIcon } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { FavoriteButton, RecordListView } from "@/components/record-favorites";
import { RecordPagination } from "@/components/record-pagination";
import { RecordTable } from "@/components/record-table";
import { RecordTableSkeletonRows } from "@/components/record-table-skeleton-rows";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRecordFavorites } from "@/hooks/use-record-favorites";
import type { RecordFilters } from "@/hooks/use-record-filters";
import { date, label } from "@/lib/format";
import type { Environment, StudySummary } from "@/lib/types";
export function StudyTable({
  studies,
  filters,
  environments,
}: {
  studies: StudySummary[] | undefined;
  environments: Environment[] | undefined;
  filters: RecordFilters;
}) {
  const favorites = useRecordFavorites("studies");
  const { search, status, view, page, setStatus, setPage } = filters;
  const loading = studies === undefined || environments === undefined;
  const filtered =
    studies?.filter(
      (s) =>
        `${s.title} ${s.question}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "all" || s.status === status) &&
        (view === "all" || favorites.ids.has(s.id)),
    ) ?? [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pageCount - 1);
  return (
    <RecordListView filters={filters} favorites={favorites} noun="experiments">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
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
      <Separator />
      {loading && (
        <div role="status" aria-label="Loading" className="sr-only">
          Loading experiments…
        </div>
      )}
      <RecordTable>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Name</TableHead>
            <TableHead className="w-24">Favorite</TableHead>
            <TableHead className="w-40">Environment</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24">Revision</TableHead>
            <TableHead className="w-24">Runs</TableHead>
            <TableHead className="w-48">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          aria-hidden={loading || undefined}
          className="[&_tr:last-child]:border-b"
        >
          {loading ? (
            <RecordTableSkeletonRows columns={7} />
          ) : (
            filtered.slice(current * 10, (current + 1) * 10).map((study) => (
              <TableRow key={study.id}>
                <TableCell className="min-w-48 max-w-96">
                  <div className="flex min-w-0 items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
                    <ExperimentIcon aria-hidden="true" />
                    <Link
                      className="min-w-0 truncate underline-offset-4 hover:underline"
                      title={study.title}
                      to={`/studies/${study.id}`}
                    >
                      {study.title}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <FavoriteButton
                    id={study.id}
                    name={study.title}
                    favorites={favorites}
                  />
                </TableCell>
                <TableCell>
                  {
                    environments?.find(
                      (environment) => environment.key === study.environment,
                    )?.name
                  }
                </TableCell>
                <TableCell>
                  <Status value={study.status} />
                </TableCell>
                <TableCell className="tabular-nums">{study.revision}</TableCell>
                <TableCell className="tabular-nums">
                  {study.completed_runs} / {study.run_count}
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {date(study.created)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </RecordTable>
      {!loading && studies?.length === 0 ? (
        <Empty
          title="No experiments yet"
          description="Create an experiment to define the agents, conditions, and rules."
        />
      ) : !loading &&
        view === "favorites" &&
        !studies?.some((study) => favorites.ids.has(study.id)) ? (
        <Empty
          title="No favorite experiments yet"
          description="Star an experiment to keep it here."
        >
          <Button variant="outline" onClick={() => filters.setView("all")}>
            View all
          </Button>
        </Empty>
      ) : (
        !loading &&
        !filtered.length && (
          <Empty title="No matching experiments">
            <Button variant="outline" onClick={filters.clear}>
              Clear filters
            </Button>
          </Empty>
        )
      )}

      <RecordPagination
        page={current}
        pages={pageCount}
        onPageChange={setPage}
        noun="experiment"
      />
    </RecordListView>
  );
}
