import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EnvironmentAvatar } from "@/components/environment-avatar";
import { Empty } from "@/components/feedback";
import { ArrowDown, ArrowUp, ChevronsUpDown, Star } from "@/components/icons";
import { ExperimentActions } from "@/components/record-actions";
import { FavoriteButton, RecordListView } from "@/components/record-favorites";
import {
  RecordScopeFilter,
  RecordStatusFilter,
} from "@/components/record-filters";
import { RecordPagination } from "@/components/record-pagination";
import {
  RecordSelectAllCheckbox,
  RecordSelectionActions,
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
import { useNow } from "@/hooks/use-now";
import { useRecordFavorites } from "@/hooks/use-record-favorites";
import type { RecordFilters } from "@/hooks/use-record-filters";
import { label, relativeTime } from "@/lib/format";
import type { Environment, StudySummary } from "@/lib/types";

const nameOrder = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

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
  const now = useNow();
  const [sort, setSort] = useState<{
    key: "name" | "created";
    direction: "asc" | "desc";
  }>({ key: "created", direction: "desc" });
  const [selection, setSelected] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLButtonElement>(null);
  const selected = selection.filter((id) =>
    studies?.some((study) => study.id === id),
  );
  const { search, status, scope, view, page, setStatus, setScope, setPage } =
    filters;
  const loading = studies === undefined;
  const environmentsLoading = environments === undefined && !environmentsError;
  const environmentNames = new Map(
    environments?.map((environment) => [environment.key, environment.name]),
  );
  const filtered =
    studies
      ?.filter(
        (s) =>
          `${s.title} ${s.question} ${environmentNames.get(s.environment) ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (status === "all" || s.status === status) &&
          (scope === "all" || s.environment === scope) &&
          (view === "all" || favorites.ids.has(s.id)),
      )
      .toSorted((a, b) => {
        const comparison =
          sort.key === "name"
            ? nameOrder.compare(a.title, b.title)
            : Date.parse(a.created) - Date.parse(b.created);
        return sort.direction === "asc" ? comparison : -comparison;
      }) ?? [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * 10, (current + 1) * 10);
  const allSelectedFavorite =
    selected.length > 0 && selected.every((id) => favorites.ids.has(id));
  function changeSort(key: "name" | "created") {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key
          ? previous.direction === "asc"
            ? "desc"
            : "asc"
          : key === "created"
            ? "desc"
            : "asc",
    }));
    setPage(0);
  }
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
        {(search || scope !== "all" || status !== "all") &&
          filtered.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={filters.clear}
            >
              Clear filters
            </Button>
          )}
        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={!favorites.available}
              onClick={() => favorites.setMany(selected, !allSelectedFavorite)}
              aria-label={
                allSelectedFavorite
                  ? "Unfavorite selected experiments"
                  : "Favorite selected experiments"
              }
            >
              <Star data-icon="inline-start" />
              {allSelectedFavorite ? "Unfavorite" : "Favorite"}
            </Button>
            <RecordSelectionActions
              count={selected.length}
              onClear={() => {
                setSelected([]);
                selectAllRef.current?.focus();
              }}
            />
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
            <TableHead
              aria-label="Name"
              className="relative w-1/3"
              aria-sort={
                sort.key === "name"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <RecordSelectAllCheckbox
                ref={selectAllRef}
                ids={visible.map((study) => study.id)}
                selected={selected}
                onSelectionChange={setSelected}
                label="Select all experiments on this page"
                disabled={loading}
              />
              <SortHeading
                name="Name"
                active={sort.key === "name"}
                direction={sort.direction}
                onClick={() => changeSort("name")}
              />
            </TableHead>
            <TableHead className="w-24">Favorite</TableHead>
            <TableHead className="w-64">Environment</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24" title="Completed / total runs">
              Runs
            </TableHead>
            <TableHead
              className="w-40"
              aria-label="Created"
              aria-sort={
                sort.key === "created"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortHeading
                name="Created"
                active={sort.key === "created"}
                direction={sort.direction}
                onClick={() => changeSort("created")}
              />
            </TableHead>
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
                  <Link
                    className="block min-w-0 truncate underline-offset-4 hover:underline"
                    title={`${study.title}\n${study.question}`}
                    to={`/studies/${study.id}`}
                  >
                    {study.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <FavoriteButton
                    id={study.id}
                    name={study.title}
                    favorites={favorites}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <EnvironmentAvatar environment={study.environment} />
                    {environmentsLoading ? (
                      <Skeleton aria-hidden="true" className="h-4 w-32" />
                    ) : environments === undefined ? (
                      <span className="text-muted-foreground">Unavailable</span>
                    ) : (
                      <Link
                        className="underline-offset-4 hover:underline"
                        to={`/environments?environment=${study.environment}`}
                      >
                        {environmentNames.get(study.environment)}
                      </Link>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Status value={study.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  <Link
                    className="underline-offset-4 hover:underline"
                    to={`/studies/${study.id}?tab=runs`}
                    aria-label={`View runs for ${study.title}: ${study.completed_runs} / ${study.run_count} complete`}
                  >
                    {study.completed_runs} / {study.run_count}
                  </Link>
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <time
                    dateTime={study.created}
                    title={new Date(study.created).toLocaleString()}
                  >
                    {relativeTime(study.created, now)}
                  </time>
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

function SortHeading({
  name,
  active,
  direction,
  onClick,
}: {
  name: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ChevronsUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-0 text-xs hover:bg-transparent"
      aria-label={`Sort by ${name.toLowerCase()}`}
      onClick={onClick}
    >
      {name}
      <Icon data-icon="inline-end" className="text-muted-foreground" />
    </Button>
  );
}
