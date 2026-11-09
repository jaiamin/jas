import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { ExperimentIcon, X } from "@/components/icons";
import { ExperimentActions } from "@/components/record-actions";
import { FavoriteButton, RecordListView } from "@/components/record-favorites";
import {
  RecordScopeFilter,
  RecordStatusFilter,
} from "@/components/record-filters";
import { RecordPagination } from "@/components/record-pagination";
import {
  RecordSelectAllCheckbox,
  RecordSelectionCheckbox,
  RecordTable,
} from "@/components/record-table";
import { RecordTableSkeletonRows } from "@/components/record-table-skeleton-rows";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  environmentsError,
}: {
  studies: StudySummary[] | undefined;
  environments: Environment[] | undefined;
  environmentsError: boolean;
  filters: RecordFilters;
}) {
  const favorites = useRecordFavorites("studies");
  const [selection, setSelected] = useState<string[]>([]);
  const selected = selection.filter((id) =>
    studies?.some((study) => study.id === id),
  );
  const { search, status, scope, view, page, setStatus, setScope, setPage } =
    filters;
  const loading = studies === undefined;
  const environmentsLoading = environments === undefined && !environmentsError;
  const filtered =
    studies?.filter(
      (s) =>
        `${s.title} ${s.question}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "all" || s.status === status) &&
        (scope === "all" || s.environment === scope) &&
        (view === "all" || favorites.ids.has(s.id)),
    ) ?? [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * 10, (current + 1) * 10);
  return (
    <RecordListView filters={filters} favorites={favorites} noun="experiments">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <RecordScopeFilter
          noun="environment"
          value={scope}
          onValueChange={setScope}
          loading={environments === undefined}
          options={
            environments?.map((environment) => ({
              value: environment.key,
              label: environment.name,
            })) ?? []
          }
        />
        <RecordStatusFilter
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
            label: v === "all" ? "All" : label(v),
          }))}
        />
        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span role="status" className="text-sm text-muted-foreground">
              {selected.length} selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              <X data-icon="inline-start" /> Clear selection
            </Button>
          </div>
        )}
      </div>
      <Separator />
      {(loading || (environmentsLoading && visible.length > 0)) && (
        <div role="status" aria-label="Loading" className="sr-only">
          {loading ? "Loading experiments…" : "Loading environment names…"}
        </div>
      )}
      <RecordTable selection>
        <TableHeader className="text-xs">
          <TableRow className="group/record">
            <TableHead aria-label="Name" className="relative w-1/3">
              <RecordSelectAllCheckbox
                ids={visible.map((study) => study.id)}
                selected={selected}
                onSelectionChange={setSelected}
                label="Select all experiments on this page"
                disabled={loading}
              />
              Name
            </TableHead>
            <TableHead className="w-24">Favorite</TableHead>
            <TableHead className="w-40">Environment</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24">Revision</TableHead>
            <TableHead className="w-24">Runs</TableHead>
            <TableHead className="w-48">Created</TableHead>
            <TableHead className="w-16">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          aria-busy={loading || (environmentsLoading && visible.length > 0)}
          aria-hidden={loading || undefined}
          className="[&_tr:last-child]:border-b"
        >
          {loading ? (
            <RecordTableSkeletonRows kind="experiment" />
          ) : (
            visible.map((study) => (
              <TableRow
                key={study.id}
                className="group/record"
                data-state={
                  selected.includes(study.id) ? "selected" : undefined
                }
              >
                <TableCell className="relative min-w-48 max-w-96">
                  <RecordSelectionCheckbox
                    aria-label={`Select ${study.title}`}
                    checked={selected.includes(study.id)}
                    onCheckedChange={(checked) =>
                      setSelected((previous) =>
                        checked === true
                          ? [...previous, study.id]
                          : previous.filter((id) => id !== study.id),
                      )
                    }
                  />
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
                  {environmentsLoading ? (
                    <Skeleton aria-hidden="true" className="h-4 w-32" />
                  ) : environments === undefined ? (
                    <span className="text-muted-foreground">Unavailable</span>
                  ) : (
                    environments.find(
                      (environment) => environment.key === study.environment,
                    )?.name
                  )}
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
                <TableCell>
                  <ExperimentActions study={study} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </RecordTable>
      {!loading && studies?.length === 0 ? (
        <Empty title="No experiments yet" />
      ) : !loading &&
        view === "favorites" &&
        !studies?.some((study) => favorites.ids.has(study.id)) ? (
        <Empty title="No favorite experiments yet">
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
