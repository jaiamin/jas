import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AgentComposer } from "@/components/agent/agent-composer";
import { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert, Empty } from "@/components/feedback";
import { HomeGrid } from "@/components/home-grid";
import {
  ArrowUpRight,
  FlaskConical,
  GitCompareArrows,
  MessageSquare,
  PenLine,
  Play,
  Plus,
  ScanLine,
} from "@/components/icons";
import { ErrorState, Loading, Status } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { agentSuggestions } from "@/lib/agent-suggestions";
import { useApi } from "@/lib/api";
import { listDrafts } from "@/lib/drafts";
import { date } from "@/lib/format";
import type { RunSummary, StudySummary } from "@/lib/types";

const suggestions = agentSuggestions({ context: "new" });
const suggestionIcons = [
  MessageSquare,
  GitCompareArrows,
  ScanLine,
  FlaskConical,
];
const suggestionDescriptions = [
  "Public messages and contribution rates",
  "Private notes and trust exchange",
  "Oversight and sanction decisions",
  "Resource renewal and extraction",
];

export default function Home() {
  const navigate = useNavigate();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const studies = useApi<StudySummary[]>("/studies", true);
  const runs = useApi<RunSummary[]>("/runs", true);
  const [params, setParams] = useSearchParams();
  const context = params.get("context") ?? "new";
  const state = useAgentComposer({
    context,
    draftKey: "jas:agent-draft:home",
    onSent: (result) => {
      // A lazy destination may keep Home mounted while navigation is pending.
      if (mounted.current && window.location.pathname === "/")
        navigate(`/agent?chat=${result.chat_id}`);
    },
  });
  function changeContext(value: string) {
    const next = new URLSearchParams(params);
    if (value === "new") next.delete("context");
    else next.set("context", value);
    setParams(next, { replace: true });
    state.send.reset();
  }
  const [drafts] = useState(() => {
    try {
      return { ...listDrafts(), error: "" };
    } catch {
      return {
        items: [],
        unreadable: [],
        error: "Drafts could not be loaded.",
      };
    }
  });
  const draft = drafts.items[0];
  const recent = [...(studies.data ?? [])]
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, 4);
  const active = (runs.data ?? [])
    .filter((run) => ["running", "queued", "pausing"].includes(run.status))
    .slice(0, 3);
  return (
    <>
      <section
        className="relative isolate grid grid-cols-1 grid-rows-[auto_1fr_1fr]"
        aria-labelledby="home-title"
      >
        <div
          aria-hidden="true"
          className="relative col-start-1 row-start-1 row-end-3 overflow-hidden border-b"
        >
          <HomeGrid />
        </div>
        <h1
          id="home-title"
          className="relative col-start-1 row-start-1 mt-16 mb-6 px-4 text-center text-2xl font-semibold tracking-tight sm:mt-20 sm:px-6 sm:text-3xl"
        >
          What would you like to test?
        </h1>
        <div className="relative col-start-1 row-start-2 row-end-4 min-w-0 px-4 sm:px-6">
          <AgentComposer
            className="mx-auto w-full max-w-2xl [&_textarea]:min-h-22"
            state={state}
            context={context}
            studies={studies.data ?? []}
            runs={runs.data ?? []}
            onContextChange={changeContext}
            placeholder={
              context === "new"
                ? "Describe an experiment you’d like to explore…"
                : context === "general"
                  ? "Ask a research question…"
                  : "Ask about the selected evidence…"
            }
          >
            {(studies.error || runs.error) && (
              <Alert variant="error">
                Some experiment contexts could not be loaded.{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    studies.refetch();
                    runs.refetch();
                  }}
                >
                  Retry
                </Button>
              </Alert>
            )}
          </AgentComposer>
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <section
          aria-label="Experiment suggestions"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {suggestions.map(({ title, prompt }, index) => {
            const Icon = suggestionIcons[index];
            return (
              <Button
                key={title}
                variant="outline"
                className="h-auto items-start justify-start gap-3 p-4 whitespace-normal text-left"
                disabled={state.send.isPending}
                onClick={() => {
                  changeContext("new");
                  state.setQuestion(prompt);
                  state.composer.current?.focus();
                }}
              >
                <Icon data-icon="inline-start" aria-hidden="true" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span>{title}</span>
                  <span className="text-xs font-normal leading-relaxed text-muted-foreground">
                    {suggestionDescriptions[index]}
                  </span>
                </span>
              </Button>
            );
          })}
        </section>
        {active.length > 0 && (
          <section
            aria-labelledby="active-runs-title"
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="active-runs-title" className="text-base font-medium">
                In progress
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/runs">
                  View runs
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <ItemGroup>
              {active.map((run) => (
                <Item key={run.id} variant="outline" size="sm" asChild>
                  <Link to={`/runs/${run.id}`}>
                    <ItemMedia variant="icon">
                      <Play />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="max-w-full">
                        <span className="truncate">{run.study_title}</span>
                      </ItemTitle>
                      <ItemDescription>
                        {run.condition} · Round {run.round} / {run.total_rounds}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Status value={run.status} />
                    </ItemActions>
                  </Link>
                </Item>
              ))}
            </ItemGroup>
          </section>
        )}
        {(draft || drafts.error || drafts.unreadable.length > 0) && (
          <section
            aria-label="Continue working"
            className="flex flex-col gap-3"
          >
            {draft && (
              <Item variant="outline" asChild>
                <Link to={draft.path}>
                  <ItemMedia variant="icon">
                    <PenLine />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="max-w-full">
                      <span className="truncate">
                        {draft.title || "Untitled experiment"}
                      </span>
                    </ItemTitle>
                    <ItemDescription>
                      Continue draft
                      {Number.isFinite(Date.parse(draft.updated))
                        ? ` · Edited ${date(draft.updated)}`
                        : ""}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="outline">Draft</Badge>
                  </ItemActions>
                </Link>
              </Item>
            )}
            {(drafts.error || drafts.unreadable.length > 0) && (
              <Alert variant="error">
                {drafts.error || "Some drafts could not be read."}{" "}
                <Link to="/studies" className="underline underline-offset-4">
                  Review drafts
                </Link>
              </Alert>
            )}
          </section>
        )}
        <section
          aria-labelledby="recent-experiments-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="recent-experiments-title" className="text-base font-medium">
              Recent experiments
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" asChild>
                <Link to="/new">
                  <Plus data-icon="inline-start" />
                  New experiment
                </Link>
              </Button>
            </div>
          </div>
          {studies.error ? (
            <ErrorState error={studies.error} onRetry={studies.refetch} />
          ) : !studies.data ? (
            <Loading />
          ) : recent.length ? (
            <ItemGroup>
              {recent.map((study) => (
                <Item key={study.id} size="sm" asChild>
                  <Link to={`/studies/${study.id}`}>
                    <ItemMedia variant="icon">
                      <FlaskConical />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="max-w-full">
                        <span className="truncate">{study.title}</span>
                      </ItemTitle>
                      <ItemDescription>
                        {study.completed_runs} / {study.run_count} runs complete
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Status value={study.status} />
                    </ItemActions>
                  </Link>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <Empty title="Your experiments will appear here" />
          )}
          {recent.length > 0 && (
            <Button className="self-end" variant="ghost" size="sm" asChild>
              <Link to="/studies">
                View all experiments
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
