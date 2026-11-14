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
import { Download, Pause, Play, Settings2 } from "@/components/icons";
import { OptionSelect as Select } from "@/components/option-select";
import { ProtocolEstimate } from "@/components/protocol-estimate";
import { RecordSearch } from "@/components/record-list-heading";
import { ResearchFindings } from "@/components/research-findings";
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
import { label, money } from "@/lib/format";
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
          <a href={`/api/studies/${id}/export?download=true`}>
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
          label="Design version"
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
      </div>
      {!complete && !isOld && !active && (
        <div className="mb-5">
          <ProtocolEstimate design={study.design} value={study.estimate} />
        </div>
      )}
      {control.error && <Alert variant="error">{control.error.message}</Alert>}
      {location.state?.notice && <Alert>{location.state.notice}</Alert>}
      {isOld && (
        <Alert>
          This is a preserved design version. Tune it to create a new one; its
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
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {!!study.preflight.adjudications?.length && (
            <ExperimentCheck report={study.preflight} design={study.design} />
          )}
          <ExperimentOverview study={study} activeRun={activeRun} />
          <Disclosure className="mt-6 min-w-0">
            <DisclosureTrigger>
              Checks &amp; detailed findings
            </DisclosureTrigger>
            <DisclosureContent className="flex min-w-0 flex-col gap-6 pt-4">
              {!study.preflight.adjudications?.length && (
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
        <TabsContent value="results">
          <ExperimentResults study={study} />
          <Disclosure className="mt-6 min-w-0">
            <DisclosureTrigger>Comparison &amp; evidence</DisclosureTrigger>
            <DisclosureContent className="flex min-w-0 flex-col gap-6 pt-3">
              <ComparisonEvidence report={study} />
              <ExposureInspection
                path={`/studies/${id}/exposure?revision=${study.revision}`}
              />
            </DisclosureContent>
          </Disclosure>
        </TabsContent>
        <TabsContent value="runs">
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
        <TabsContent value="design">
          <div className="mb-8">
            <VersionDiff key={study.revision} study={study} />
          </div>
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
                Version {study.revision} · SHA-256{" "}
                <code>{study.sha256.slice(0, 16)}</code>
              </p>
              <Json value={study.design} />
            </section>
          </div>
        </TabsContent>
        <TabsContent value="publish">
          <PublishExperiment
            key={`${study.id}:${study.revision}`}
            study={study}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
