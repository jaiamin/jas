import type { UseQueryResult } from "@tanstack/react-query";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Empty } from "@/components/feedback";
import { ArrowLeft, ChevronLeft, ChevronRight } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { TurnAnnotations } from "@/components/run/turn-annotations";
import { ErrorState, Json, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label } from "@/lib/format";
import type { Evidence, RunDetail } from "@/lib/types";

export function DecisionBrowser({
  run,
  turn,
  pinned,
  evidence,
  focusRequest,
  selectTurn,
  annotationDrafts,
  setAnnotationDrafts,
}: {
  run: RunDetail;
  turn: number;
  pinned: boolean;
  evidence: Pick<UseQueryResult<Evidence, Error>, "data" | "error" | "refetch">;
  focusRequest: number;
  selectTurn: (turn: number, decision?: boolean) => void;
  annotationDrafts: Record<string, string>;
  setAnnotationDrafts: Dispatch<SetStateAction<Record<string, string>>>;
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
  const pages = Math.max(1, Math.ceil(visibleTurns.length / 10));
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
    <div className="grid min-w-0 items-start gap-6 min-[1440px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <h2 ref={journalHeading} tabIndex={-1} className="scroll-mt-20">
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
        <div className="min-w-0 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turn</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTurns.slice(current * 10, (current + 1) * 10).map((t) => (
                <TableRow
                  key={t.number}
                  data-state={t.number === turn ? "selected" : undefined}
                >
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => selectTurn(t.number, true)}
                    >
                      {t.number}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {run.design.profiles.find((p) => p.key === t.actor)?.name ??
                      t.actor}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {(t.latency_ms / 1000).toFixed(1)}s
                    </span>
                  </TableCell>
                  <TableCell>
                    <strong className="font-medium">
                      {label(t.action.kind)}
                      {"operation" in t.action &&
                        ` · ${label(String(t.action.operation))}`}
                      {"amount" in t.action &&
                        ["contribute", "send", "return"].includes(
                          t.action.kind,
                        ) &&
                        ` ${t.action.amount}`}
                      {"target" in t.action &&
                        t.action.target &&
                        ` → ${t.action.target}`}
                      {"artifact" in t.action && ` · ${t.action.artifact}`}
                    </strong>
                    <span className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground line-clamp-2 min-w-40 max-w-72 whitespace-normal">
                      {t.rationale}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!visibleTurns.length && (
            <Empty
              title="No decisions recorded"
              description="Choose another agent or start the run."
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{visibleTurns.length} decisions</span>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
      <aside
        ref={inspector}
        className="min-w-0 scroll-mt-6 max-[1439px]:min-h-[calc(100svh-3rem)]"
      >
        <Card>
          <CardHeader>
            <Button
              variant="outline"
              size="sm"
              ref={evidenceReturn}
              className="mb-4 inline-flex min-[1440px]:hidden"
              onClick={() => {
                journalHeading.current?.focus({ preventScroll: true });
                journalHeading.current?.scrollIntoView({ block: "start" });
              }}
            >
              <ArrowLeft data-icon="inline-start" />
              Back to decisions
            </Button>
            <CardTitle>
              <h2 ref={inspectorHeading} tabIndex={-1}>
                Turn {turn} evidence
              </h2>
            </CardTitle>
            <CardDescription>
              Saved input, decision and consequences.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                <h3 className="mb-2 font-medium">
                  {
                    run.design.profiles.find(
                      (p) => p.key === evidence.data?.actor,
                    )?.name
                  }
                </h3>
                <p className="text-sm leading-relaxed">
                  {evidence.data.decision.rationale}
                </p>
                <dl className="grid gap-3 text-sm [&>div]:grid [&>div]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] [&>div]:gap-4 [&_dt]:text-muted-foreground [&_dd]:min-w-0 [&_dd]:break-words">
                  <div>
                    <dt>Action</dt>
                    <dd>
                      {label(evidence.data.decision.action?.kind ?? "")}
                      {evidence.data.decision.action &&
                        "target" in evidence.data.decision.action &&
                        evidence.data.decision.action.target &&
                        ` → ${evidence.data.decision.action.target}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Private note</dt>
                    <dd>{evidence.data.decision.memory || "No note"}</dd>
                  </div>
                  {evidence.data.decision.action &&
                    "message" in evidence.data.decision.action &&
                    evidence.data.decision.action.message && (
                      <div>
                        <dt>Message</dt>
                        <dd>{evidence.data.decision.action.message}</dd>
                      </div>
                    )}
                </dl>
                <p className="my-4 text-xs leading-relaxed text-muted-foreground">
                  Rationale and memory are model self-reports. They do not
                  expose its internal reasoning.
                </p>
                {[
                  [
                    "Exact observation before the decision",
                    evidence.data.observation,
                  ],
                  ["Typed decision", evidence.data.decision],
                  ["Consequences & verified facts", evidence.data.events],
                  [
                    `Complete state after turn ${turn}`,
                    evidence.data.checkpoint,
                  ],
                ].map(([title, value]) => (
                  <Disclosure
                    key={String(title)}
                    className="min-w-0"
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
              drafts={annotationDrafts}
              setDrafts={setAnnotationDrafts}
              onInteract={() => {
                if (!pinned) selectTurn(turn);
              }}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
