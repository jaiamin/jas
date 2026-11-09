import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { X } from "@/components/icons";
import { RunActions } from "@/components/record-actions";
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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRecordFavorites } from "@/hooks/use-record-favorites";
import type { RecordFilters } from "@/hooks/use-record-filters";
import { date, label, money } from "@/lib/format";
import type { RunSummary } from "@/lib/types";
export function RunTable({
  runs,
  filters,
  selectable = false,
}: {
  runs: RunSummary[] | undefined;
  filters: RecordFilters;
  selectable?: boolean;
}) {
  const [selection, setSelected] = useState<string[]>([]);
  const selected = selection.filter((id) => runs?.some((run) => run.id === id));
  const favorites = useRecordFavorites("runs");
  const { search, status, scope, view, page, setStatus, setScope, setPage } =
    filters;
  const loading = runs === undefined;
  const filtered =
    runs?.filter(
      (r) =>
        `${r.study_title} ${r.condition} ${r.id}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "all" || r.status === status) &&
        (scope === "all" || r.study_id === scope) &&
        (view === "all" || favorites.ids.has(r.id)),
    ) ?? [];
  const experiments = new Map<string, string>();
  for (const run of runs ?? []) {
    if (!experiments.has(run.study_id))
      experiments.set(run.study_id, run.study_title);
  }
  const pages = Math.max(1, Math.ceil(filtered.length / 15));
  const canCompare = selected.length >= 2 && selected.length <= 4;
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * 15, (current + 1) * 15);
  return (
    <RecordListView filters={filters} favorites={favorites} noun="runs">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <RecordScopeFilter
          noun="experiment"
          value={scope}
          onValueChange={setScope}
          loading={loading}
          options={[...experiments].map(([value, label]) => ({ value, label }))}
        />
        <RecordStatusFilter
          label="Filter run status"
          value={status}
          onValueChange={setStatus}
          options={[
            "all",
            "ready",
            "queued",
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
        {selectable && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <>
                <span role="status" className="text-sm text-muted-foreground">
                  {selected.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected([])}
                >
                  <X data-icon="inline-start" />
                  Clear selection
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild={canCompare}
              disabled={!canCompare}
            >
              {canCompare ? (
                <Link to={`/compare?runs=${selected.join(",")}`}>
                  Compare {selected.length} runs
                </Link>
              ) : selected.length > 4 ? (
                "Compare up to 4 runs"
              ) : (
                "Compare runs"
              )}
            </Button>
          </div>
        )}
      </div>
      <Separator />
      {loading && (
        <div role="status" aria-label="Loading" className="sr-only">
          Loading runs…
        </div>
      )}
      <RecordTable selection={selectable}>
        <TableHeader className="text-xs">
          <TableRow className="group/record">
            <TableHead aria-label="Name" className="relative">
              {selectable && (
                <RecordSelectAllCheckbox
                  ids={visible.map((run) => run.id)}
                  selected={selected}
                  onSelectionChange={setSelected}
                  label="Select all runs on this page"
                  disabled={loading}
                />
              )}
              Name
            </TableHead>
            <TableHead className="w-24">Favorite</TableHead>
            <TableHead>Experiment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Seed</TableHead>
            <TableHead>Revision</TableHead>
            <TableHead>Repetition</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-16">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          aria-busy={loading}
          aria-hidden={loading || undefined}
          className="[&_tr:last-child]:border-b"
        >
          {loading ? (
            <RecordTableSkeletonRows kind="run" />
          ) : (
            visible.map((run) => (
              <TableRow
                key={run.id}
                className="group/record"
                data-state={selected.includes(run.id) ? "selected" : undefined}
              >
                <TableCell className="relative min-w-48 max-w-96">
                  {selectable && (
                    <RecordSelectionCheckbox
                      aria-label={`Select ${run.condition}, seed ${run.seed}, revision ${run.revision}, repetition ${run.repetition}, ${run.id.slice(0, 6)}`}
                      checked={selected.includes(run.id)}
                      onCheckedChange={(checked) =>
                        setSelected((previous) =>
                          checked === true
                            ? [...previous, run.id]
                            : previous.filter((id) => id !== run.id),
                        )
                      }
                    />
                  )}
                  <Link
                    className="block truncate underline-offset-4 hover:underline"
                    title={run.condition}
                    to={`/runs/${run.id}`}
                  >
                    {run.condition}
                  </Link>
                </TableCell>
                <TableCell>
                  <FavoriteButton
                    id={run.id}
                    name={`${run.condition}, seed ${run.seed}, revision ${run.revision}, repetition ${run.repetition}`}
                    favorites={favorites}
                  />
                </TableCell>
                <TableCell className="min-w-40 max-w-80">
                  <Link
                    className="block truncate underline-offset-4 hover:underline"
                    title={run.study_title}
                    to={`/studies/${run.study_id}?revision=${run.revision}`}
                  >
                    {run.study_title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Status value={run.status} />
                </TableCell>
                <TableCell className="tabular-nums">{run.seed}</TableCell>
                <TableCell className="tabular-nums">{run.revision}</TableCell>
                <TableCell className="tabular-nums">{run.repetition}</TableCell>

                <TableCell className="tabular-nums whitespace-nowrap">
                  {run.turn} / {run.total_turns} turns
                </TableCell>

                <TableCell className="tabular-nums">
                  {money(run.usage.cost_usd)}
                  {run.usage.partial && "*"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {date(run.created)}
                </TableCell>
                <TableCell>
                  <RunActions run={run} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </RecordTable>
      {runs?.length === 0 ? (
        <Empty title="No runs yet" />
      ) : !loading &&
        view === "favorites" &&
        !runs?.some((run) => favorites.ids.has(run.id)) ? (
        <Empty title="No favorite runs yet">
          <Button variant="outline" onClick={() => filters.setView("all")}>
            View all
          </Button>
        </Empty>
      ) : (
        !loading &&
        !filtered.length && (
          <Empty title="No matching runs">
            <Button variant="outline" onClick={filters.clear}>
              Clear filters
            </Button>
          </Empty>
        )
      )}
      <RecordPagination
        page={current}
        pages={pages}
        onPageChange={setPage}
        noun="run"
      />
    </RecordListView>
  );
}
