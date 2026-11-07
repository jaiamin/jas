import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, Badge, Empty, Skeleton, Table } from "@/components/ui/data";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RunSummary, StudySummary } from "@/lib/types";
import { cn, date, label, money, runModelLabel } from "@/lib/utils";

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <Badge className={cn("status", `status-${value}`)}>
      <span className="status-dot" />
      {label(value)}
    </Badge>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-20" />
      <Skeleton className="h-48" />
    </div>
  );
}
export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => unknown;
}) {
  return (
    <Alert variant="error" title="Could not load this view">
      {error.message}
      <Button variant="outline" size="sm" onClick={() => onRetry()}>
        Retry
      </Button>
    </Alert>
  );
}
export function Json({ value }: { value: unknown }) {
  return <pre className="json-view">{JSON.stringify(value, null, 2)}</pre>;
}

export function StudyTable({
  studies,
  compact = false,
}: {
  studies: StudySummary[];
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = studies.filter(
    (s) =>
      `${s.title} ${s.question}`.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || s.status === status),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pageCount - 1);
  if (!studies.length)
    return (
      <Empty
        title="Your first experiment starts with a question"
        description="Design a study with AI, or configure every detail yourself."
      >
        <Button asChild>
          <Link to="/new">
            Create experiment
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </Empty>
    );
  return (
    <div className="table-frame">
      {!compact && (
        <div className="table-toolbar">
          <div className="search">
            <Search />
            <Input
              aria-label="Search experiments"
              placeholder="Search experiments…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select
            label="Filter experiment status"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
            options={[
              "all",
              "ready",
              "running",
              "paused",
              "complete",
              "failed",
            ].map((v) => ({
              value: v,
              label: v === "all" ? "All statuses" : label(v),
            }))}
          />
        </div>
      )}
      <Table className="table">
        <thead>
          <tr>
            <th>Experiment</th>
            <th>Status</th>
            <th>Environment</th>
            <th>Runs</th>
            <th>Cost</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(current * 10, (current + 1) * 10).map((study) => (
            <tr key={study.id}>
              <td className="name-cell">
                <Link className="record-link" to={`/studies/${study.id}`}>
                  {study.title}
                </Link>
              </td>
              <td>
                <Status value={study.status} />
              </td>
              <td>{label(study.environment)}</td>
              <td className="numeric">
                {study.completed_runs} / {study.run_count}
              </td>
              <td className="numeric">{money(study.cost_usd)}</td>
              <td className="muted nowrap">{date(study.created)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!filtered.length && (
        <p className="table-no-results">No experiments match these filters.</p>
      )}
      {!compact && (
        <div className="table-footer">
          <span>
            {filtered.length} experiment{filtered.length !== 1 && "s"}
          </span>
          <div className="actions">
            {pageCount > 1 && (
              <span>
                {current + 1} / {pageCount}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous experiment page"
              hidden={pageCount === 1}
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next experiment page"
              hidden={pageCount === 1}
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
          <Search />
          <Input
            aria-label="Search runs"
            placeholder="Search runs…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
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
            "paused",
            "complete",
            "failed",
          ].map((v) => ({
            value: v,
            label: v === "all" ? "All statuses" : label(v),
          }))}
        />
        {selectable && (
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
            <th>Progress</th>
            <th>Seed</th>
            <th>Cost</th>
            <th>Requests</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(current * 15, (current + 1) * 15).map((run) => (
            <tr key={run.id} data-selected={selected.includes(run.id)}>
              {selectable && (
                <td>
                  <Checkbox
                    aria-label={`Select ${run.condition}, seed ${run.seed}`}
                    checked={selected.includes(run.id)}
                    disabled={
                      !selected.includes(run.id) && selected.length >= 4
                    }
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked === true
                          ? [...selected, run.id]
                          : selected.filter((id) => id !== run.id),
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
        <p className="table-no-results">No runs match these filters.</p>
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
