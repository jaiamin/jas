import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAssistantPageContext } from "@/components/agent/assistant-workspace";
import { ComparisonEvidence } from "@/components/comparison-evidence";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ExperimentOverview } from "@/components/experiment/experiment-overview";
import { ExperimentResults } from "@/components/experiment/experiment-results";
import { PublishExperiment } from "@/components/experiment/publish-experiment";
import { RunGrid } from "@/components/experiment/run-grid";
import { VersionDiff } from "@/components/experiment/version-diff";
import { ExperimentCheck } from "@/components/experiment-check";
import { ExposureInspection } from "@/components/exposure-inspection";
import { Alert } from "@/components/feedback";
import {
  Download,
  ExperimentIcon,
  Pause,
  Play,
  Settings2,
} from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import {
  RecordDetailHeading,
  RecordFacts,
  RecordSectionTabs,
} from "@/components/record-detail";
import { RecordSearch } from "@/components/record-list-heading";
import { ResearchFindings } from "@/components/research-findings";
import { RunTable } from "@/components/run-table";
import { ErrorState, Json, Loading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useRecordFilters } from "@/hooks/use-record-filters";
import { api, invalidateResources, useApi } from "@/lib/api";
import { label, modelLabel, money } from "@/lib/format";
import type { StudyDetail } from "@/lib/types";

export default function Study() {
  const { id } = useParams();
  const runFilters = useRecordFilters();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const path = `/studies/${id}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`;
  const query = useApi<StudyDetail>(
    path,
    (data) =>
      data?.runs.some((run) =>
        ["running", "queued", "pausing"].includes(run.status),
      ) ?? false,
  );
  useAssistantPageContext(
    query.data && !query.error
      ? {
          context: `study:${query.data.id}`,
          title: query.data.design.title,
          revision: query.data.revision,
        }
      : null,
  );
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
    ["overview", "results", "runs", "design", "publish"].find(
      (value) => value === params.get("tab"),
    ) ?? "overview";
  const isOld = study.revision !== study.revisions[0]?.number;
  const showCheck =
    study.preflight.status === "blocked" ||
    !!study.preflight.adjudications?.length;
  function experimentStatus() {
    if (active) return "running";
    if (complete) return "complete";
    if (study.runs.some((run) => run.status === "failed")) return "failed";
    if (study.runs.some((run) => run.status === "paused")) return "paused";
    return "ready";
  }
  return (
    <div
      className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6"
      data-slot="experiment-detail"
    >
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/experiments" className="text-link">
          Experiments
        </Link>
      </nav>
      <RecordDetailHeading
        title={study.design.title}
        icon={ExperimentIcon}
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
          size="icon-sm"
          aria-label="Export experiment"
          asChild
        >
          <a href={`/api/studies/${id}/export?download=true`}>
            <Download />
          </a>
        </Button>
        {!complete && !isOld && (
          <Button
            size="sm"
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
      </RecordDetailHeading>
      <RecordFacts
        items={[
          { label: "Status", value: <Status value={experimentStatus()} /> },
          { label: "Environment", value: label(study.design.environment) },
          {
            label: "Runs complete",
            value: `${study.runs.filter((run) => run.status === "complete").length} / ${study.runs.length}`,
          },
          {
            label: "Usage / limit",
            value: (
              <>
                {money(study.usage.cost_usd)} / {money(study.design.budget_usd)}
                {study.usage.partial && " · unresolved"}
              </>
            ),
          },
          {
            label: "Version",
            value: (
              <Select
                label="Design version"
                className="min-w-max"
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
                  label: `Version ${r.number}`,
                }))}
              />
            ),
          },
        ]}
      />
      {control.error && <Alert variant="error">{control.error.message}</Alert>}
      {location.state?.notice && <Alert>{location.state.notice}</Alert>}
      {isOld && (
        <Alert>
          This is a preserved design version. Tune it to create a new one; its
          recorded runs remain available.
        </Alert>
      )}
      <Tabs
        className="gap-0"
        value={tab}
        onValueChange={(v) =>
          setParams({ ...Object.fromEntries(params), tab: v })
        }
      >
        <RecordSectionTabs
          label="Experiment sections"
          sections={[
            { value: "overview", label: "Overview" },
            { value: "results", label: "Results" },
            { value: "runs", label: "Runs" },
            { value: "design", label: "Design" },
            { value: "publish", label: "Publish" },
          ]}
        />
        <TabsContent value="overview" className="pt-6">
          {showCheck && (
            <ExperimentCheck report={study.preflight} design={study.design} />
          )}
          <ExperimentOverview study={study} activeRun={activeRun} />
          <Disclosure className="mt-8 min-w-0 border-t pt-4">
            <DisclosureTrigger>
              Checks &amp; detailed findings
            </DisclosureTrigger>
            <DisclosureContent className="flex min-w-0 flex-col gap-6 pt-4">
              {!showCheck && (
                <ExperimentCheck
                  report={study.preflight}
                  design={study.design}
                />
              )}
              {study.preflight.research && (
                <ResearchFindings
                  studyId={study.id}
                  revision={study.revision}
                  active={active}
                />
              )}
            </DisclosureContent>
          </Disclosure>
        </TabsContent>
        <TabsContent value="results" className="pt-6">
          <ExperimentResults study={study} />
          <Disclosure className="mt-8 min-w-0 border-t pt-4">
            <DisclosureTrigger>Comparison &amp; evidence</DisclosureTrigger>
            <DisclosureContent className="flex min-w-0 flex-col gap-6 pt-3">
              <ComparisonEvidence report={study} />
              <ExposureInspection
                path={`/studies/${id}/exposure?revision=${study.revision}`}
              />
            </DisclosureContent>
          </Disclosure>
        </TabsContent>
        <TabsContent value="runs" className="pt-6">
          {study.comparison.cells.length <= 120 ? (
            <>
              <RunGrid study={study} />
              <Disclosure className="mt-5">
                <DisclosureTrigger>Run table</DisclosureTrigger>
                <DisclosureContent className="pt-4">
                  <div className="mb-3 w-full sm:max-w-72">
                    <RecordSearch
                      label="Search runs"
                      value={runFilters.search}
                      onChange={runFilters.setSearch}
                    />
                  </div>
                  <RunTable runs={study.runs} filters={runFilters} selectable />
                </DisclosureContent>
              </Disclosure>
            </>
          ) : (
            <>
              <div className="mb-3 w-full sm:max-w-72">
                <RecordSearch
                  label="Search runs"
                  value={runFilters.search}
                  onChange={runFilters.setSearch}
                />
              </div>
              <RunTable runs={study.runs} filters={runFilters} selectable />
            </>
          )}
        </TabsContent>
        <TabsContent value="design" className="flex flex-col gap-6 pt-6">
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-sm font-medium">Conditions</h2>
            <div className="divide-y">
              {study.design.conditions.map((condition) => (
                <div
                  key={condition.key}
                  className="flex min-w-0 flex-col gap-2 py-4 first:pt-0 last:pb-0"
                >
                  <p className="text-sm font-medium wrap-anywhere">
                    {condition.name}
                  </p>
                  <p className="text-xs text-muted-foreground wrap-anywhere">
                    {condition.harness.kind === "scripted"
                      ? "Non-model control"
                      : modelLabel(condition.model)}{" "}
                    · {label(condition.parameters.memory)} memory
                  </p>
                  <Disclosure>
                    <DisclosureTrigger
                      aria-label={`Configuration for ${condition.name}`}
                    >
                      Configuration
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <Json value={condition} />
                    </DisclosureContent>
                  </Disclosure>
                </div>
              ))}
            </div>
          </section>
          <Separator />
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-sm font-medium">Run plan</h2>
            <RecordFacts
              items={[
                { label: "Rounds per run", value: study.design.rounds },
                {
                  label: "Seeds",
                  value: (
                    <span className="wrap-anywhere">
                      {study.design.seeds.join(", ")}
                    </span>
                  ),
                },
                {
                  label: "Repetitions per seed",
                  value: study.design.repetitions,
                },
              ]}
            />
            <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
              Measurements:{" "}
              {study.design.measures.map(label).join(", ") || "None selected"}.
            </p>
          </section>
          <Separator />
          {(study.design.hypothesis || study.design.context) && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">Research plan</h2>
              {study.design.hypothesis && (
                <div className="max-w-prose text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Private hypothesis
                  </p>
                  <p className="whitespace-pre-wrap wrap-anywhere">
                    {study.design.hypothesis}
                  </p>
                </div>
              )}
              {study.design.context && (
                <div className="max-w-prose text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Shared context
                  </p>
                  <p className="whitespace-pre-wrap wrap-anywhere">
                    {study.design.context}
                  </p>
                </div>
              )}
            </section>
          )}
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-sm font-medium">Agents</h2>
            <div className="divide-y">
              {study.design.profiles.map((profile) => (
                <div
                  key={profile.key}
                  className="grid min-w-0 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] sm:gap-6"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-medium wrap-anywhere">{profile.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">
                      {profile.role}
                    </p>
                  </div>
                  <p className="max-w-prose text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap wrap-anywhere">
                    {profile.goal}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <Separator />
          <Disclosure>
            <DisclosureTrigger>Version history</DisclosureTrigger>
            <DisclosureContent className="pt-4">
              <VersionDiff key={study.revision} study={study} />
            </DisclosureContent>
          </Disclosure>
          <Disclosure>
            <DisclosureTrigger>Immutable specification</DisclosureTrigger>
            <DisclosureContent className="pt-4">
              {study.plan_id && (
                <Link
                  className="text-link text-sm"
                  to={`/new?plan=${study.plan_id}`}
                >
                  View protocol proposal
                </Link>
              )}
              <p className="text-xs text-muted-foreground">
                Version {study.revision} · SHA-256{" "}
                <code>{study.sha256.slice(0, 16)}</code>
              </p>
              <Json value={study.design} />
            </DisclosureContent>
          </Disclosure>
        </TabsContent>
        <TabsContent value="publish" className="pt-6">
          <PublishExperiment
            key={`${study.id}:${study.revision}`}
            study={study}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
