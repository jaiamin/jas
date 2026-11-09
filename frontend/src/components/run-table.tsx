import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { ChevronLeft, ChevronRight, Search, X } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label, money } from "@/lib/format";
import type { RunSummary } from "@/lib/types";
export function RunTable({
  runs,
  selectable = false,
}: {
  runs: RunSummary[];
  selectable?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = runs.filter(
    (r) =>
      `${r.study_title} ${r.condition} ${r.id}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || r.status === status),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 15));
  const current = Math.min(page, pages - 1);
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto w-full sm:w-72">
          <InputGroup>
            <InputGroupInput
              aria-label="Search runs"
              placeholder="Search runs…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <Select
          label="Filter run status"
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
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
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
            )}
            <TableHead>Run</TableHead>
            <TableHead>Status</TableHead>

            <TableHead className="text-right">Progress</TableHead>

            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.slice(current * 15, (current + 1) * 15).map((run) => (
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
                  className="font-medium underline-offset-4 hover:underline"
                  to={`/runs/${run.id}`}
                >
                  {run.condition}
                </Link>
                <span className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground">
                  {run.study_title} · Seed {run.seed} · rev {run.revision} ·
                  repetition {run.repetition}
                </span>
              </TableCell>
              <TableCell>
                <Status value={run.status} />
              </TableCell>

              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {run.turn} / {run.total_turns} turns
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {money(run.usage.cost_usd)}
                {run.usage.partial && "*"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!filtered.length && (
        <Empty
          title="No matching runs"
          description="Try another experiment, condition or run ID."
        >
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        </Empty>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
        <span>
          {filtered.length} runs
          {selected.length > 0 && ` · ${selected.length} selected`}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span>
            {current + 1} / {pages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous run page"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next run page"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
