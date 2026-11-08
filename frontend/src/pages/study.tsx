import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Download, Pause, Play, Settings2 } from "lucide-react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ExperimentCheck } from "@/components/experiment-check";
import { RunTable } from "@/components/run-table";
import {
  ErrorState,
  Json,
  Loading,
  PageHeading,
  Status,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Empty, Table } from "@/components/ui/data";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, invalidateResources, useApi } from "@/lib/api";
import type { StudyDetail } from "@/lib/types";
import { label, metric, money } from "@/lib/utils";

export default function Study() {
  const { id } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const path = `/studies/${id}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`;
  const query = useApi<StudyDetail>(path, true);
  const client = useQueryClient();
  const control = useMutation({
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
      <div className="experiment-meta">
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
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="design">Protocol</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ExperimentCheck report={study.preflight} />
          <div className="study-overview">
            <section>
              <div className="section-heading">
                <div>
                  <h2>Condition comparison</h2>
                </div>
              </div>
              {!study.results.length ? (
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
                <div className="table-frame">
                  <Table className="table results-table">
                    <thead>
                      <tr>
                        <th>Measurement</th>
                        {study.design.conditions.map((c) => (
                          <th key={c.key}>{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((key) => (
                        <tr key={key}>
                          <td>{label(key)}</td>
                          {study.design.conditions.map((c) => {
                            const result = study.results.find(
                              (r) =>
                                r.condition_key === c.key && r.metric === key,
                            );
                            return (
                              <td key={c.key} className="numeric">
                                {metric(key, result?.mean)}
                                <span className="table-secondary">
                                  {result?.runs ?? 0} eligible runs ·{" "}
                                  {result?.seeds ?? 0} seeds
                                  {result?.interval &&
                                    ` · ${metric(key, result.interval[0])}–${metric(key, result.interval[1])}`}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="table-note">
                    Ranges: 95% seed-level percentile bootstrap intervals,
                    available with ≥3 independent seeds. Repetitions are
                    averaged within seed; turns are not independent
                    replications.
                  </div>
                </div>
              )}
            </section>
            <Disclosure className="disclosure study-protocol-summary">
              <DisclosureTrigger>Question & protocol</DisclosureTrigger>
              <DisclosureContent>
                <p className="protocol-question">{study.design.question}</p>
                <dl className="key-values">
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
                  <div className="limitations">
                    <h3>Interpret with care</h3>
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
          {study.effects?.length > 0 && (
            <Disclosure className="disclosure section-space">
              <DisclosureTrigger>Matched-seed effects</DisclosureTrigger>
              <DisclosureContent>
                <div className="table-frame">
                  <Table className="table">
                    <thead>
                      <tr>
                        <th>Comparison</th>
                        <th>Measurement</th>
                        <th>Difference</th>
                        <th>Independent seeds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {study.effects.map((effect) => (
                        <tr key={`${effect.condition}-${effect.metric}`}>
                          <td>
                            {effect.condition} − {effect.baseline}
                          </td>
                          <td>{label(effect.metric)}</td>
                          <td className="numeric">
                            {effect.mean > 0 ? "+" : ""}
                            {metric(effect.metric, effect.mean)}
                            <span className="table-secondary">
                              {effect.interval
                                ? `${metric(effect.metric, effect.interval[0])}–${metric(effect.metric, effect.interval[1])} · 95% CI`
                                : "Too few seeds for an interval"}
                            </span>
                          </td>
                          <td className="numeric">
                            {effect.seeds}
                            <span className="table-secondary">
                              {effect.pairs} matched run pairs
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="table-note">
                    Treatment minus the first condition. Repetitions are
                    averaged within each seed; intervals bootstrap independent
                    seeds. A difference is not proof of human behavior or
                    general causal validity.
                  </div>
                </div>
              </DisclosureContent>
            </Disclosure>
          )}
        </TabsContent>
        <TabsContent value="runs">
          <RunTable runs={study.runs} selectable />
        </TabsContent>
        <TabsContent value="design">
          <div className="protocol-layout">
            <section>
              <h2>Population</h2>
              <div className="table-frame">
                <Table className="table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Role</th>
                      <th>Private goal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {study.design.profiles.map((p) => (
                      <tr key={p.key}>
                        <td>{p.name}</td>
                        <td>{p.role}</td>
                        <td className="wrapping-cell">{p.goal}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </section>
            <section>
              <h2>Immutable specification</h2>
              {study.plan_id && (
                <Link to={`/new?plan=${study.plan_id}`}>
                  View protocol proposal
                </Link>
              )}
              <p className="muted">
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
