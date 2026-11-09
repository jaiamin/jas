import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/feedback";
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Search,
} from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
import { date, label } from "@/lib/format";
import type { StudySummary } from "@/lib/types";
export function StudyTable({ studies }: { studies: StudySummary[] }) {
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
        description="Choose an environment and define what to compare. Agent can help turn your question into a reviewed protocol."
      >
        <Button asChild>
          <Link to="/agent?context=new">Design an experiment</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/environments">Explore environments</Link>
        </Button>
      </Empty>
    );
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto w-full sm:w-72">
          <InputGroup>
            <InputGroupInput
              aria-label="Search experiments"
              placeholder="Search experiments…"
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Experiment</TableHead>
            <TableHead>Status</TableHead>

            <TableHead className="text-right">Runs</TableHead>

            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.slice(current * 10, (current + 1) * 10).map((study) => (
            <TableRow key={study.id}>
              <TableCell className="min-w-48 max-w-96">
                <div className="flex items-center gap-2 [&>svg]:size-4 [&>svg]:text-muted-foreground">
                  <FlaskConical aria-hidden="true" />
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
              <TableCell className="text-right tabular-nums">
                {study.completed_runs} / {study.run_count}
              </TableCell>

              <TableCell className="text-muted-foreground whitespace-nowrap">
                {date(study.created)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!filtered.length && (
        <Empty title="No matching experiments">
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
          {filtered.length} experiment{filtered.length !== 1 && "s"}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
    </div>
  );
}
