import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { TurnAnnotations } from "@/components/run/turn-annotations";
import { ErrorState, Json, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge, Empty, Table } from "@/components/ui/data";
import { Select } from "@/components/ui/select";
import type { Evidence, RunDetail } from "@/lib/types";
import { label } from "@/lib/utils";

export function DecisionBrowser({
  run,
  turn,
  pinned,
  evidence,
  focusRequest,
  selectTurn,
}: {
  run: RunDetail;
  turn: number;
  pinned: boolean;
  evidence: Pick<UseQueryResult<Evidence, Error>, "data" | "error" | "refetch">;
  focusRequest: number;
  selectTurn: (turn: number, decision?: boolean) => void;
}) {
  const [params, setParams] = useSearchParams();
  const actorFilter = params.get("actor") ?? "all";
  const [page, setPage] = useState(0);
  const evidenceReturn = useRef<HTMLButtonElement>(null);
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const journalHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusRequest && evidenceReturn.current?.getClientRects().length) {
      inspectorHeading.current?.focus({ preventScroll: true });
      inspector.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [focusRequest]);
  const visibleTurns = run.turns
    .filter((t) => actorFilter === "all" || t.actor === actorFilter)
    .toReversed();
  const pages = Math.max(1, Math.ceil(visibleTurns.length / 15));
  const current = Math.min(page, pages - 1);
  function setActorFilter(actor: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (actor === "all") next.delete("actor");
        else next.set("actor", actor);
        next.set("turn", String(turn));
        return next;
      },
      { replace: true },
    );
  }
  return (
    <div className="decision-layout">
      <section>
        <div className="section-heading">
          <h2 ref={journalHeading} tabIndex={-1} className="inspection-anchor">
            Decision journal
          </h2>
          <Select
            label="Filter actor"
            value={actorFilter}
            onValueChange={(v) => {
              setActorFilter(v);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All agents" },
              ...run.design.profiles.map((p) => ({
                value: p.key,
                label: p.name,
              })),
            ]}
          />
        </div>
        <div className="table-frame">
          <Table className="table">
            <thead>
              <tr>
                <th>Turn</th>
                <th>Agent</th>
                <th>Decision</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {visibleTurns.slice(current * 15, (current + 1) * 15).map((t) => (
                <tr key={t.number} data-selected={t.number === turn}>
                  <td>
                    <Button
                      variant="link"
                      size="sm"
                      className="turn-link"
                      type="button"
                      onClick={() => selectTurn(t.number, true)}
                    >
                      {t.number}
                    </Button>
                  </td>
                  <td>
                    {run.design.profiles.find((p) => p.key === t.actor)?.name ??
                      t.actor}
                  </td>
                  <td>
                    <strong className="action-label">
                      {label(t.action.kind)}
                      {["contribute", "send", "return"].includes(
                        t.action.kind,
                      ) && ` ${t.action.amount}`}
                      {t.action.target && ` → ${t.action.target}`}
                    </strong>
                    <span className="table-secondary rationale-preview">
                      {t.rationale}
                    </span>
                  </td>
                  <td className="numeric muted">
                    {(t.latency_ms / 1000).toFixed(1)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!visibleTurns.length && (
            <p className="table-no-results">
              No decisions recorded for this selection.
            </p>
          )}
          <div className="table-footer">
            <span>{visibleTurns.length} decisions</span>
            <div className="actions">
              <span>
                {current + 1} / {pages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={!current}
                aria-label="Previous decisions page"
                onClick={() => {
                  setPage(current - 1);
                }}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={current + 1 >= pages}
                aria-label="Next decisions page"
                onClick={() => {
                  setPage(current + 1);
                }}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      </section>
      <aside ref={inspector} className="evidence-inspector">
        <Button
          variant="outline"
          size="sm"
          ref={evidenceReturn}
          className="evidence-return"
          onClick={() => {
            journalHeading.current?.focus({ preventScroll: true });
            journalHeading.current?.scrollIntoView({ block: "start" });
          }}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to decisions
        </Button>
        <div className="section-heading">
          <h2
            ref={inspectorHeading}
            tabIndex={-1}
            className="inspection-anchor"
          >
            Turn {turn} evidence
          </h2>
          <Badge>Saved input & output</Badge>
        </div>
        {evidence.error ? (
          <ErrorState error={evidence.error} onRetry={evidence.refetch} />
        ) : !evidence.data ? (
          <Loading />
        ) : evidence.data.number === 0 ? (
          <Empty
            title="Initial state"
            description="Turn zero is the starting checkpoint, before any model decision."
          />
        ) : (
          <>
            <h3 className="inspector-actor">
              {
                run.design.profiles.find((p) => p.key === evidence.data?.actor)
                  ?.name
              }
            </h3>
            <p className="decision-rationale">
              {evidence.data.decision.rationale}
            </p>
            <dl className="key-values">
              <div>
                <dt>Action</dt>
                <dd>
                  {label(evidence.data.decision.action?.kind ?? "")}
                  {evidence.data.decision.action?.target &&
                    ` → ${evidence.data.decision.action.target}`}
                </dd>
              </div>
              <div>
                <dt>Private note</dt>
                <dd>{evidence.data.decision.memory || "No note"}</dd>
              </div>
              {evidence.data.decision.action?.message && (
                <div>
                  <dt>Message</dt>
                  <dd>{evidence.data.decision.action.message}</dd>
                </div>
              )}
            </dl>
            <p className="evidence-disclaimer">
              Rationale and memory are model self-reports. They do not expose
              its internal reasoning.
            </p>
            {[
              [
                "Exact observation before the decision",
                evidence.data.observation,
              ],
              ["Typed decision", evidence.data.decision],
              ["Consequences & verified facts", evidence.data.events],
              [`Complete state after turn ${turn}`, evidence.data.checkpoint],
            ].map(([title, value]) => (
              <Disclosure
                key={String(title)}
                className="disclosure"
                onOpenChange={(open) => {
                  if (open && !pinned) selectTurn(turn, true);
                }}
              >
                <DisclosureTrigger>{String(title)}</DisclosureTrigger>
                <DisclosureContent>
                  <Json value={value} />
                </DisclosureContent>
              </Disclosure>
            ))}
          </>
        )}
        <TurnAnnotations
          runId={run.summary.id}
          turn={turn}
          onInteract={() => {
            if (!pinned) selectTurn(turn);
          }}
        />
      </aside>
    </div>
  );
}
