import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { X } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { FavoriteButton, RecordListView } from "@/components/record-favorites";
import { RecordPagination } from "@/components/record-pagination";
import { RecordTable } from "@/components/record-table";
import { RecordTableSkeletonRows } from "@/components/record-table-skeleton-rows";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selected, setSelected] = useState<string[]>([]);
  const favorites = useRecordFavorites("runs");
  const { search, status, view, page, setStatus, setPage } = filters;
  const loading = runs === undefined;
  const filtered =
    runs?.filter(
      (r) =>
        `${r.study_title} ${r.condition} ${r.id}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "all" || r.status === status) &&
        (view === "all" || favorites.ids.has(r.id)),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(filtered.length / 15));
  const current = Math.min(page, pages - 1);
  return (
    <RecordListView filters={filters} favorites={favorites} noun="runs">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Select
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
            label: v === "all" ? "All statuses" : label(v),
          }))}
        />
        {selectable && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                <X data-icon="inline-start" />
                Clear selection
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild={selected.length >= 2}
              disabled={selected.length < 2}
            >
              {selected.length >= 2 ? (
                <Link to={`/compare?runs=${selected.join(",")}`}>
                  Compare {selected.length} runs
                </Link>
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
      <RecordTable>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
            )}
            <TableHead>Run</TableHead>
            <TableHead className="w-24">Favorite</TableHead>
            <TableHead>Experiment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Seed</TableHead>
            <TableHead>Revision</TableHead>
            <TableHead>Repetition</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          aria-hidden={loading || undefined}
          className="[&_tr:last-child]:border-b"
        >
          {loading ? (
            <RecordTableSkeletonRows columns={selectable ? 11 : 10} />
          ) : (
            filtered.slice(current * 15, (current + 1) * 15).map((run) => (
              <TableRow
                key={run.id}
                data-state={selected.includes(run.id) ? "selected" : undefined}
              >
                {selectable && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${run.condition}, seed ${run.seed}, revision ${run.revision}, repetition ${run.repetition}, ${run.id.slice(0, 6)}`}
                      checked={selected.includes(run.id)}
                      disabled={
                        !selected.includes(run.id) && selected.length >= 4
                      }
                      onCheckedChange={(checked) =>
                        setSelected((previous) =>
                          checked === true
                            ? [...previous, run.id]
                            : previous.filter((id) => id !== run.id),
                        )
                      }
                    />
                  </TableCell>
                )}
                <TableCell className="min-w-48 max-w-96">
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
              </TableRow>
            ))
          )}
        </TableBody>
      </RecordTable>
      {runs?.length === 0 ? (
        <Empty
          title="No runs yet"
          description="Create an experiment to define the agents, conditions, and rules."
        />
      ) : !loading &&
        view === "favorites" &&
        !runs?.some((run) => favorites.ids.has(run.id)) ? (
        <Empty
          title="No favorite runs yet"
          description="Star a run to keep it here."
        >
          <Button variant="outline" onClick={() => filters.setView("all")}>
            View all
          </Button>
        </Empty>
      ) : (
        !loading &&
        !filtered.length && (
          <Empty
            title="No matching runs"
            description="Try another experiment, condition or run ID."
          >
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
