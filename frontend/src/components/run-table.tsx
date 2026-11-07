import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, Table } from "@/components/ui/data";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Select } from "@/components/ui/select";
import type { RunSummary } from "@/lib/types";
import { label, money, runModelLabel } from "@/lib/utils";
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
    <div className="table-frame">
      <div className="table-toolbar">
        <div className="search">
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
          <div className="selection-summary">
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
      <Table className="table">
        <thead>
          <tr>
            {selectable && (
              <th className="checkbox-cell">
                <span className="sr-only">Select</span>
              </th>
            )}
            <th>Run</th>
            <th>Status</th>
            <th>Model</th>
            <th className="table-heading-numeric">Progress</th>
            <th className="table-heading-numeric">Seed</th>
            <th className="table-heading-numeric">Cost</th>
            <th className="table-heading-numeric">Requests</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(current * 15, (current + 1) * 15).map((run) => (
            <tr key={run.id} data-selected={selected.includes(run.id)}>
              {selectable && (
                <td>
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
                </td>
              )}
              <td className="name-cell">
                <Link className="record-link" to={`/runs/${run.id}`}>
                  {run.condition}
                </Link>
                <span className="table-secondary">
                  {run.study_title} · rev {run.revision} · repetition{" "}
                  {run.repetition}
                </span>
              </td>
              <td>
                <Status value={run.status} />
              </td>
              <td className="nowrap">{runModelLabel(run)}</td>
              <td className="numeric nowrap">
                {run.turn} / {run.total_turns} turns
              </td>
              <td className="numeric">{run.seed}</td>
              <td className="numeric">
                {money(run.usage.cost_usd)}
                {run.usage.partial && "*"}
              </td>
              <td className="numeric">{run.usage.requests}</td>
            </tr>
          ))}
        </tbody>
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
      <div className="table-footer">
        <span>
          {filtered.length} runs
          {selected.length > 0 && ` · ${selected.length} selected`}
        </span>
        <div className="actions">
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
