import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ComparisonEvidence } from "@/components/comparison-evidence";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ExperimentCheck } from "@/components/experiment-check";
import { ExposureInspection } from "@/components/exposure-inspection";
import { Alert, Empty } from "@/components/feedback";
import {
  AgentIcon,
  ArrowUpRight,
  Download,
  Pause,
  Play,
  Settings2,
} from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { RecordSearch } from "@/components/record-list-heading";
import { RunTable } from "@/components/run-table";
import {
  ErrorState,
  Json,
  Loading,
  PageHeading,
  Status,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecordFilters } from "@/hooks/use-record-filters";
import { api, invalidateResources, useApi } from "@/lib/api";
import { label, metric, money } from "@/lib/format";
import type { StudyDetail } from "@/lib/types";

export default function Study() {
  const { id } = useParams();
  const runFilters = useRecordFilters();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const path = `/studies/${id}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`;
  const query = useApi<StudyDetail>(path, true);
  const client = useQueryClient();
  const control = useMutation({
    mutationKey: ["study-control", id],
    mutationFn: (action: string) => api(`/studies/${id}/control`, { action }),
    onSuccess: () =>
      invalidateResources(client, [
        "/studies",
        `/studies/${id}`,
        "/runs",
        ...(query.data?.runs.map((run) => `/runs/${run.id}`) ?? []),
      ]),
  });
  if (query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!query.data) return <Loading />;
  const study = query.data;
  const activeRun = study.runs.find((run) =>
    ["running", "queued", "pausing"].includes(run.status),
  );
  const active = !!activeRun;
  const complete = study.runs.every((r) => r.status === "complete");
  const tab =
    ["overview", "runs", "design"].find(
      (value) => value === params.get("tab"),
    ) ?? "overview";
  const metrics = study.design.measures.length
    ? study.design.measures
    : [...new Set(study.results.map((r) => r.metric))];
  const isOld = study.revision !== study.revisions[0]?.number;
  function experimentStatus() {
    if (active) return "running";
    if (complete) return "complete";
    if (study.runs.some((run) => run.status === "failed")) return "failed";
    if (study.runs.some((run) => run.status === "paused")) return "paused";
    return "ready";
  }
  return (
    <>
      <PageHeading
        title={study.design.title}
        description={study.design.question}
      >
        <Button variant="outline" size="sm" asChild>
          <Link to={`/agent?context=${encodeURIComponent(`study:${id}`)}`}>
            <AgentIcon data-icon="inline-start" />
            Ask Agent
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/new?study=${id}&revision=${study.revision}`}>
            <Settings2 data-icon="inline-start" />
            Tune
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Export experiment"
          asChild
        >
          <a href={`/api/studies/${id}/export`}>
            <Download />
          </a>
        </Button>
        {!complete && !isOld && (
          <Button
            disabled={
              control.isPending ||
              (!active && study.preflight.status === "blocked")
            }
            onClick={() => control.mutate(active ? "pause" : "start")}
          >
            {active ? (
              <Pause data-icon="inline-start" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {active ? "Pause experiment" : "Run experiment"}
          </Button>
        )}
      </PageHeading>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Status value={experimentStatus()} />
        <span>{label(study.design.environment)}</span>
        <span>
          {study.runs.filter((r) => r.status === "complete").length} /{" "}
          {study.runs.length} runs complete
        </span>
        <span>
          {money(study.usage.cost_usd)} / {money(study.design.budget_usd)}
        </span>
        <Select
          label="Design revision"
          value={String(study.revision)}
          onValueChange={(v) => {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("revision", v);
              next.set("tab", tab);
              return next;
            });
          }}
          options={study.revisions.map((r) => ({
            value: String(r.number),
            label: `Revision ${r.number}`,
          }))}
        />
      </div>
      {control.error && <Alert variant="error">{control.error.message}</Alert>}
      {location.state?.notice && <Alert>{location.state.notice}</Alert>}
      {isOld && (
        <Alert>
          This is a preserved design revision. Tune it to create a new one; its
          recorded runs remain available.
        </Alert>
      )}
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setParams({ ...Object.fromEntries(params), tab: v })
        }
      >
        <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="design">Protocol</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ExperimentCheck report={study.preflight} />
          <div className="flex min-w-0 flex-col gap-6">
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                <div>
                  <h2 className="text-base font-semibold">
                    Condition comparison
                  </h2>
                </div>
              </div>
              <ComparisonEvidence report={study} />
              <ExposureInspection
                path={`/studies/${id}/exposure?revision=${study.revision}`}
              />
              {!study.results.some((r) => r.runs > 0) ? (
                <Empty
                  title={active ? "Runs in progress" : "No results yet"}
                  description={
                    active ? "Results appear as runs finish." : undefined
                  }
                >
                  {activeRun && (
                    <Button variant="outline" asChild>
                      <Link to={`/runs/${activeRun?.id}`}>
                        Watch live
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  )}
                </Empty>
              ) : (
                <div className="min-w-0 overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Measurement</TableHead>
                        {study.design.conditions.map((c) => (
                          <TableHead key={c.key}>{c.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((key) => (
                        <TableRow key={key}>
                          <TableCell>{label(key)}</TableCell>
                          {study.design.conditions.map((c) => {
                            const result = study.results.find(
                              (r) =>
                                r.condition_key === c.key && r.metric === key,
                            );
                            return (
                              <TableCell key={c.key} className="tabular-nums">
                                {metric(key, result?.mean)}
                                <span className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground">
                                  {result?.runs ?? 0} eligible /{" "}
                                  {result?.planned ?? 0} planned runs ·{" "}
                                  {result?.seeds ?? 0} seed clusters
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 text-xs leading-relaxed text-muted-foreground">
                    Observed complete, eligible outcomes only. Repetitions are
                    averaged within seed. Seed clusters are not certified
                    independent samples; no confidence interval is identified by
                    the protocol.
                  </div>
                </div>
              )}
            </section>
            <Disclosure className="min-w-0 mt-2">
              <DisclosureTrigger>Question & protocol</DisclosureTrigger>
              <DisclosureContent>
                <p className="max-w-prose text-base leading-relaxed">
                  {study.design.question}
                </p>
                <dl className="grid gap-3 text-sm [&>div]:grid [&>div]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] [&>div]:gap-4 [&_dt]:text-muted-foreground [&_dd]:min-w-0 [&_dd]:break-words">
                  <div>
                    <dt>Hypothesis & analysis plan</dt>
                    <dd>{study.design.hypothesis || "Exploratory study"}</dd>
                  </div>
                  <div>
                    <dt>Design</dt>
                    <dd>
                      {study.design.conditions.length} conditions ·{" "}
                      {study.design.seeds.length} matched seeds ·{" "}
                      {study.design.repetitions} repetition
                      {study.design.repetitions !== 1 && "s"}
                    </dd>
                  </div>
                  <div>
                    <dt>Population</dt>
                    <dd>
                      {study.design.profiles.length} agents,{" "}
                      {study.design.rounds} rounds per run
                    </dd>
                  </div>
                  <div>
                    <dt>Rule version</dt>
                    <dd>
                      {study.runs[0] ? (
                        <Link to={`/runs/${study.runs[0].id}?tab=settings`}>
                          View execution record
                        </Link>
                      ) : (
                        "Available in each run’s record"
                      )}
                    </dd>
                  </div>
                </dl>
                {!!study.design.limitations.length && (
                  <div className="max-w-prose text-sm leading-relaxed">
                    <h3 className="text-sm font-medium">Interpret with care</h3>
                    <ul>
                      {study.design.limitations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </DisclosureContent>
            </Disclosure>
          </div>
        </TabsContent>
        <TabsContent value="runs">
          <div className="mb-3 w-full sm:max-w-72">
            <RecordSearch
              label="Search runs"
              value={runFilters.search}
              onChange={runFilters.setSearch}
            />
          </div>
          <RunTable runs={study.runs} filters={runFilters} selectable />
        </TabsContent>
        <TabsContent value="design">
          <div className="grid min-w-0 items-start gap-8 xl:grid-cols-2">
            <section>
              <h2 className="text-base font-semibold">Population</h2>
              <div className="min-w-0 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Private goal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {study.design.profiles.map((p) => (
                      <TableRow key={p.key}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.role}</TableCell>
                        <TableCell className="min-w-48 max-w-prose whitespace-normal">
                          {p.goal}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
            <section>
              <h2 className="text-base font-semibold">
                Immutable specification
              </h2>
              {study.plan_id && (
                <Link to={`/new?plan=${study.plan_id}`}>
                  View protocol proposal
                </Link>
              )}
              <p className="text-muted-foreground">
                Revision {study.revision} · SHA-256{" "}
                <code>{study.sha256.slice(0, 16)}</code>
              </p>
              <Json value={study.design} />
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
