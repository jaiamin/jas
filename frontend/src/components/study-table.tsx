import { ChevronLeft, ChevronRight, FlaskConical, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Empty, Table } from "@/components/ui/data";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Select } from "@/components/ui/select";
import type { StudySummary } from "@/lib/types";
import { date, label, money } from "@/lib/utils";
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
  if (!studies.length) return <Empty title="No experiments yet" />;
  return (
    <div className="table-frame">
      <div className="table-toolbar">
        <div className="search">
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
      <Table className="table">
        <thead>
          <tr>
            <th>Experiment</th>
            <th>Status</th>
            <th>Environment</th>
            <th className="table-heading-numeric">Runs</th>
            <th className="table-heading-numeric">Cost</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(current * 10, (current + 1) * 10).map((study) => (
            <tr key={study.id}>
              <td className="name-cell">
                <div className="record-title">
                  <FlaskConical aria-hidden="true" />
                  <Link className="record-link" to={`/studies/${study.id}`}>
                    {study.title}
                  </Link>
                </div>
                <span
                  className="table-secondary record-description"
                  title={study.question}
                >
                  {study.question}
                </span>
              </td>
              <td>
                <Status value={study.status} />
              </td>
              <td>
                {label(study.environment)}
                <span className="table-secondary">
                  Revision {study.revision}
                </span>
              </td>
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
    </div>
  );
}
