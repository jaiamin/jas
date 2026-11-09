import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AgentComposer } from "@/components/agent/agent-composer";
import { useAgentComposer } from "@/components/agent/use-agent-composer";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { DraftList } from "@/components/draft-list";
import { Alert } from "@/components/feedback";
import { HomeGrid } from "@/components/home-grid";
import {
  ArrowUpRight,
  Ellipsis,
  FlaskConical,
  Play,
  Plus,
} from "@/components/icons";
import { ErrorState, Loading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { useNow } from "@/hooks/use-now";
import { agentSuggestions } from "@/lib/agent-suggestions";
import { useApi } from "@/lib/api";
import { listDrafts, removeDraft } from "@/lib/drafts";
import { date, relativeTime } from "@/lib/format";
import type { RunSummary, StudySummary } from "@/lib/types";

const suggestions = agentSuggestions({ context: "new" });
const suggestionIllustrations = [
  "communication",
  "memory",
  "oversight",
  "resources",
];
const recordTriggerClassName =
  "border-0 px-0 hover:bg-transparent aria-expanded:bg-transparent aria-expanded:hover:bg-transparent dark:hover:bg-transparent dark:aria-expanded:hover:bg-transparent";
const suggestionDescriptions = [
  "Compare contributions to a shared pool with public messages enabled or disabled.",
  "Compare return rates with private notes versus history alone, under the same rules.",
  "Change the chance of oversight and compare sanction use under the same limits.",
  "Vary resource renewal and compare extraction, remaining stock, and survival.",
];

export default function Home() {
  const now = useNow();
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
  const [drafts, setDrafts] = useState(() => {
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
  const recentDrafts = drafts.items.slice(0, 3);
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
          <span className="home-heading relative isolate inline-block">
            What would you like to test?
          </span>
        </h1>
        <div className="relative col-start-1 row-start-2 row-end-4 min-w-0 px-4 sm:px-6">
          <AgentComposer
            className="mx-auto w-full max-w-2xl [&_[data-slot=input-group]]:shadow-xl"
            state={state}
            placeholder="Ask a question or describe an experiment…"
          />
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8">
        <section
          aria-label="Experiment suggestions"
          className="flex flex-col gap-3"
        >
          <h2 className="text-xs font-medium">Suggestions</h2>
          <ItemGroup className="gap-0 overflow-hidden rounded-xl border xl:flex-row">
            {suggestions.map(({ title, prompt }, index) => {
              return (
                <Fragment key={title}>
                  <Button
                    variant="ghost"
                    className="h-auto w-full min-w-0 flex-1 items-center justify-start gap-3 rounded-none border-0 p-4 whitespace-normal text-left focus-visible:ring-inset has-data-[icon=inline-start]:pl-4 xl:flex-col xl:items-start"
                    disabled={state.send.isPending}
                    onClick={() => {
                      state.setQuestion(prompt);
                      state.composer.current?.focus();
                    }}
                  >
                    <img
                      src={`/illustrations/suggestions/${suggestionIllustrations[index]}.webp`}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 object-contain object-left"
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[0.9375rem] leading-5 font-semibold">
                        {title}
                      </span>
                      <span className="text-[0.8125rem] leading-4.5 font-normal text-foreground/60">
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
                </Fragment>
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
              <h2 id="active-runs-title" className="text-sm font-medium">
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
        {(recentDrafts.length > 0 ||
          drafts.error ||
          drafts.unreadable.length > 0) && (
          <section
            aria-labelledby="drafts-title"
            className="flex flex-col gap-3"
          >
            <Disclosure defaultOpen className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="drafts-title"
                  className="min-w-0 flex-1 text-sm font-medium"
                >
                  <DisclosureTrigger
                    size="default"
                    indicatorPosition="end"
                    className={recordTriggerClassName}
                  >
                    Drafts
                  </DisclosureTrigger>
                </h2>
                {drafts.items.length > recentDrafts.length && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/studies#drafts">
                      View all drafts
                      <ArrowUpRight data-icon="inline-end" />
                    </Link>
                  </Button>
                )}
              </div>
              <DisclosureContent className="flex flex-col">
                <Separator />
                {(drafts.error || drafts.unreadable.length > 0) && (
                  <Alert variant="error">
                    {drafts.error || "Some drafts could not be read."}{" "}
                    <Link
                      to="/studies"
                      className="underline underline-offset-4"
                    >
                      Review drafts
                    </Link>
                  </Alert>
                )}
                {recentDrafts.length > 0 && (
                  <DraftList
                    drafts={recentDrafts}
                    onDelete={(path) => {
                      removeDraft(path);
                      setDrafts((current) => ({
                        ...current,
                        items: current.items.filter(
                          (draft) => draft.path !== path,
                        ),
                      }));
                    }}
                  />
                )}
              </DisclosureContent>
            </Disclosure>
          </section>
        )}
        <section
          aria-labelledby="recent-experiments-title"
          className="flex flex-col gap-3"
        >
          <Disclosure defaultOpen className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="recent-experiments-title"
                className="min-w-0 flex-1 text-sm font-medium"
              >
                <DisclosureTrigger
                  size="default"
                  indicatorPosition="end"
                  className={recordTriggerClassName}
                >
                  Recent experiments
                </DisclosureTrigger>
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" asChild>
                  <Link to="/new">
                    <Plus data-icon="inline-start" />
                    New
                  </Link>
                </Button>
                {recent.length > 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/studies">View all</Link>
                  </Button>
                )}
              </div>
            </div>
            <DisclosureContent className="flex flex-col">
              <Separator />
              {studies.error ? (
                <ErrorState error={studies.error} onRetry={studies.refetch} />
              ) : !studies.data ? (
                <Loading />
              ) : recent.length ? (
                <ItemGroup className="has-data-[size=sm]:gap-0">
                  {recent.map((study, index) => (
                    <Fragment key={study.id}>
                      <div className="flex min-w-0 items-center gap-2.5 pl-1.75 transition-colors hover:bg-muted/50">
                        <Item
                          size="sm"
                          className="min-w-0 flex-1 rounded-none border-0 px-0 py-3 [a]:hover:bg-transparent"
                          asChild
                        >
                          <Link to={`/studies/${study.id}`}>
                            <ItemMedia
                              variant="icon"
                              className="group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center [&_svg:not([class*='size-'])]:size-3.5"
                            >
                              <FlaskConical />
                            </ItemMedia>
                            <ItemContent className="min-w-0 flex-row items-center gap-3">
                              <ItemTitle className="min-w-0 flex-1 font-normal">
                                <span className="truncate" title={study.title}>
                                  {study.title}
                                </span>
                              </ItemTitle>
                              <ItemDescription className="shrink-0 text-xs text-foreground/60 whitespace-nowrap">
                                <time
                                  dateTime={study.created}
                                  title={`Created ${new Date(study.created).toLocaleString()}`}
                                >
                                  {relativeTime(study.created, now)}
                                </time>
                              </ItemDescription>
                            </ItemContent>
                          </Link>
                        </Item>
                        <ItemActions>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-foreground/60 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent [&_svg:not([class*='size-'])]:size-3.5"
                                aria-label={`More options for ${study.title}`}
                              >
                                <Ellipsis aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="flex flex-col gap-1">
                                  Created
                                  <time
                                    dateTime={study.created}
                                    className="font-normal"
                                  >
                                    {date(study.created)}
                                  </time>
                                </DropdownMenuLabel>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </ItemActions>
                      </div>
                      {index < recent.length - 1 && (
                        <ItemSeparator className="my-0" />
                      )}
                    </Fragment>
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
            </DisclosureContent>
          </Disclosure>
        </section>
      </div>
    </>
  );
}
