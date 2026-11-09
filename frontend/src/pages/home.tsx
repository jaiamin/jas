import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AgentComposer } from "@/components/agent/agent-composer";
import { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert } from "@/components/feedback";
import { HomeGrid } from "@/components/home-grid";
import {
  ArrowUpRight,
  FlaskConical,
  GitCompareArrows,
  MessageSquare,
  Play,
  Plus,
  Radio,
  ScanLine,
} from "@/components/icons";
import { ErrorState, Loading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { agentSuggestions } from "@/lib/agent-suggestions";
import { useApi } from "@/lib/api";
import { listDrafts } from "@/lib/drafts";
import type { RunSummary, StudySummary } from "@/lib/types";

const suggestions = [
  ...agentSuggestions({ context: "new" }),
  {
    title: "Information & accuracy",
    prompt:
      "Design an information-decision experiment testing how signal accuracy affects decision accuracy. Vary only signal accuracy, keeping information visibility, rewards and other rules identical. Use matched seeds, a compact pilot and a $3 spending ceiling; distinguish recorded choices from inferred beliefs.",
  },
];
const suggestionIcons = [
  MessageSquare,
  GitCompareArrows,
  ScanLine,
  FlaskConical,
  Radio,
];
const suggestionDescriptions = [
  "Test how public messages change contributions.",
  "Compare private notes with history-only memory.",
  "Explore how oversight changes sanction decisions.",
  "Study extraction as resource renewal changes.",
  "Compare decisions under different signal accuracy.",
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
  const state = useAgentComposer({
    context: "general",
    draftKey: "jas:agent-draft:home",
    onSent: (result) => {
      // A lazy destination may keep Home mounted while navigation is pending.
      if (mounted.current && window.location.pathname === "/")
        navigate(`/agent?chat=${result.chat_id}`);
    },
  });
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
        className="relative isolate grid grid-cols-1 grid-rows-[auto_3fr_2fr]"
        aria-labelledby="home-title"
      >
        <div
          data-slot="home-backdrop"
          className="relative col-start-1 row-start-1 row-end-3 overflow-hidden border-b"
        >
          <HomeGrid />
        </div>
        <h1
          id="home-title"
          className="relative col-start-1 row-start-1 mt-20 mb-6 px-4 text-center text-2xl font-semibold tracking-tight sm:mt-24 sm:px-6 sm:text-3xl"
        >
          What would you like to test?
        </h1>
        <div className="relative col-start-1 row-start-2 row-end-4 min-w-0 px-4 sm:px-6">
          <AgentComposer
            className="mx-auto w-full max-w-2xl [&_textarea]:min-h-22 [&_[data-slot=input-group]]:shadow-lg"
            state={state}
            context="general"
            placeholder="Ask a question or describe an experiment…"
          />
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <section
          aria-label="Experiment suggestions"
          className="flex flex-col gap-3"
        >
          <h2 className="text-base font-medium">Suggestions</h2>
          <ItemGroup className="gap-0 overflow-hidden rounded-xl border xl:flex-row">
            {suggestions.map(({ title, prompt }, index) => {
              const Icon = suggestionIcons[index];
              return (
                <div
                  key={title}
                  className="flex min-w-0 flex-1 flex-col xl:flex-row"
                >
                  <Button
                    variant="ghost"
                    className="h-full w-full items-start justify-start gap-4 rounded-none p-5 whitespace-normal text-left focus-visible:ring-inset has-data-[icon=inline-start]:pl-5 xl:flex-col"
                    disabled={state.send.isPending}
                    onClick={() => {
                      state.setQuestion(prompt);
                      state.composer.current?.focus();
                    }}
                  >
                    <Icon data-icon="inline-start" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="text-base leading-snug">{title}</span>
                      <span className="text-sm font-normal leading-relaxed text-muted-foreground">
                        {suggestionDescriptions[index]}
                      </span>
                    </span>
                  </Button>
                  {index < suggestions.length - 1 && (
                    <>
                      <Separator className="xl:hidden" />
                      <Separator
                        orientation="vertical"
                        className="hidden xl:block"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </ItemGroup>
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
                  New
                </Link>
              </Button>
            </div>
          </div>
          {(draft || drafts.error || drafts.unreadable.length > 0) && (
            <section
              aria-label="Continue working"
              className="flex flex-col gap-2"
            >
              {draft && (
                <Item size="xs" asChild>
                  <Link to={draft.path}>
                    <ItemContent className="min-w-0">
                      <ItemDescription className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0">Continue draft</span>
                        <span className="truncate text-foreground">
                          {draft.title || "Untitled experiment"}
                        </span>
                      </ItemDescription>
                    </ItemContent>
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
            <Empty>
              <EmptyHeader>
                <EmptyDescription>
                  Your experiments will appear here
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
