import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { SeedChart } from "@/components/experiment/seed-chart";
import { Alert } from "@/components/feedback";
import { OptionSelect } from "@/components/option-select";
import { PlaybackControls } from "@/components/run/playback-controls";
import { RunViewer } from "@/components/run/run-viewer";
import { ErrorState, Json, Loading } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api";
import { date, label, money } from "@/lib/format";
import type { PublicManifest, PublicRecording } from "@/lib/publication";

export default function PublicExperimentPage() {
  const { author = "", slug = "", version: versionPath = "v1" } = useParams();
  const version = /^v([1-9]\d*)$/.exec(versionPath)?.[1] ?? "invalid";
  const [params, setParams] = useSearchParams();
  const [perspective, setPerspective] = useState("researcher");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const path = `/gallery/${encodeURIComponent(author)}/${encodeURIComponent(slug)}`;
  const query = useApi<PublicManifest>(`${path}?version=${version}`);
  const selectedRun = params.get("run") ?? query.data?.description.featured_run;
  const recording = useQuery({
    queryKey: [path, version, selectedRun],
    queryFn: () =>
      api<PublicRecording>(`${path}/runs/${selectedRun}?version=${version}`),
    enabled: !!selectedRun && !!query.data,
  });
  const report = useMutation({
    mutationFn: () => api(`${path}/report?version=${version}`, { reason }),
    onSuccess: () => {
      setReason("");
      setNotice("Report sent to the gallery operator.");
    },
  });
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied.");
    } catch {
      setNotice(value);
    }
  }
  if (query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!query.data) return <Loading />;
  const record = query.data;
  const { description, experiment, publication } = record;
  const verified = record.verification.filter((run) => run.verified).length;
  const allVerified = verified > 0 && verified === record.verification.length;
  const design = experiment.design;
  const primary = experiment.headline.metric;
  const run = recording.data?.record;
  const rawTurn = Number(params.get("turn") ?? 0);
  const turn =
    Number.isInteger(rawTurn) && rawTurn >= 0
      ? Math.min(run?.summary.turn ?? 0, rawTurn)
      : 0;
  const limits = [
    ...new Set([description.notes, ...experiment.limits].filter(Boolean)),
  ];
  const command = `jas fork ${publication.author}/${publication.slug}/v${publication.version}`;
  return (
    <article className="flex min-w-0 flex-col gap-9">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {description.title}
        </h1>
        <p className="text-pretty text-lg leading-relaxed">
          {description.finding}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>@{publication.author}</span>
          <time dateTime={publication.created}>
            {date(publication.created)}
          </time>
          <span>Version {publication.version}</span>
          {publication.visibility === "unlisted" && (
            <Badge variant="outline">Unlisted</Badge>
          )}
        </div>
        <Disclosure>
          <DisclosureTrigger>
            <Badge variant={allVerified ? "secondary" : "outline"}>
              {allVerified ? "Replay verified" : "Replay incomplete"},{" "}
              {verified} of {record.verification.length} runs
            </Badge>
          </DisclosureTrigger>
          <DisclosureContent className="max-w-prose space-y-3 pt-3 text-sm text-muted-foreground">
            <p>
              Recorded actions reproduce every saved state under the recorded
              rules, with zero model calls. This does not claim the models would
              act the same way again, that prompts are valid, or that uploaded
              model identities are independently attested.
            </p>
            <p>
              Recorded external judgments are replayed as fixed inputs, not
              rejudged.
            </p>
            {record.verification.map((item) => (
              <p key={item.run_id}>
                Run {item.run_id.slice(0, 6)}:{" "}
                {item.verified
                  ? `${item.verified_turns} turns reproduced · rules ${item.rule_version}`
                  : item.reason}
              </p>
            ))}
          </DisclosureContent>
        </Disclosure>
      </header>
      {primary && (
        <section aria-label="Published results" className="max-w-3xl">
          <h2 className="text-base font-semibold">
            {label(primary)} by condition
          </h2>
          <SeedChart
            design={design}
            cells={experiment.headline.cells}
            metricKey={primary}
          />
          <p className="text-xs text-muted-foreground">
            Every eligible seed is shown; repetitions are averaged within seed.{" "}
            {
              experiment.comparison.cells.filter(
                (cell) => cell.status === "complete",
              ).length
            }{" "}
            complete / {experiment.comparison.cells.length} planned runs.
          </p>
        </section>
      )}
      <section aria-label="Published run viewer" className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Watch a run</h2>
          <OptionSelect
            label="Published run"
            value={selectedRun ?? ""}
            onValueChange={(value) => {
              setPerspective("researcher");
              setParams({ run: value, turn: "0" });
            }}
            options={experiment.runs.map((item) => ({
              value: item.id,
              label: `${item.condition} · seed ${item.seed} · repeat ${item.repetition} · ${item.status}`,
            }))}
          />
        </div>
        {recording.error ? (
          <ErrorState error={recording.error} onRetry={recording.refetch} />
        ) : !recording.data || !run ? (
          <Loading />
        ) : (
          <>
            <RunViewer
              run={run}
              turn={turn}
              evidence={recording.data.evidence[turn]}
              perspective={perspective}
              perspectiveEvidence={recording.data.evidence.findLast(
                (item) => item.number <= turn && item.actor === perspective,
              )}
              onPerspective={setPerspective}
            />
            <PlaybackControls
              key={run.summary.id}
              turn={turn}
              maxTurn={run.summary.turn}
              moments={run.key_moments}
              onTurn={(number) =>
                setParams(
                  { run: run.summary.id, turn: String(number) },
                  { replace: true },
                )
              }
            />
            <Disclosure>
              <DisclosureTrigger>Full recorded evidence</DisclosureTrigger>
              <DisclosureContent className="pt-3">
                <Json value={recording.data} />
              </DisclosureContent>
            </Disclosure>
          </>
        )}
      </section>
      <section aria-label="Published design" className="max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold">Design</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
          {[
            ["World", label(design.environment)],
            ["Agents", design.profiles.map((agent) => agent.name).join(", ")],
            [
              "Models",
              [...new Set(experiment.runs.flatMap((item) => item.models))].join(
                ", ",
              ) || "Scripted controls",
            ],
            [
              "Conditions",
              design.conditions.map((condition) => condition.name).join(", "),
            ],
            [
              "Seeds & repeats",
              `${design.seeds.join(", ")} · ${design.repetitions} repeats`,
            ],
            ["Recorded cost", money(experiment.usage.cost_usd)],
            ["JAS", record.jas_version],
            [
              "Rule versions",
              [
                ...new Set(
                  record.verification
                    .map((item) => item.rule_version)
                    .filter(Boolean),
                ),
              ].join(", ") || "Unsupported verifier",
            ],
          ].map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <Disclosure>
          <DisclosureTrigger>
            Frozen protocol and version hash
          </DisclosureTrigger>
          <DisclosureContent className="pt-3">
            <p className="break-all font-mono text-xs">{experiment.sha256}</p>
            <Json value={design} />
          </DisclosureContent>
        </Disclosure>
      </section>
      {limits.length > 0 && (
        <section className="max-w-3xl space-y-3">
          <h2 className="text-lg font-semibold">Limits</h2>
          <div className="flex flex-wrap gap-2">
            {limits.slice(0, 3).map((limit) => (
              <Badge
                key={limit}
                variant="outline"
                className="max-w-full whitespace-normal text-left font-normal"
              >
                {limit.split(/(?<=[.!?])\s+/)[0].slice(0, 160)}
              </Badge>
            ))}
          </div>
          <Disclosure>
            <DisclosureTrigger>All limits and check notes</DisclosureTrigger>
            <DisclosureContent className="pt-3">
              <ul className="space-y-3 text-sm text-muted-foreground">
                {limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </DisclosureContent>
          </Disclosure>
        </section>
      )}
      <section aria-label="Use this experiment" className="max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold">Fork, replay, build on it</h2>
        <p className="text-sm text-muted-foreground">
          Import the exact protocol into your local workspace. Forking makes no
          model calls and never installs environment code.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="max-w-full break-all rounded-md bg-muted p-3 text-xs">
            {command}
          </code>
          <Button variant="outline" onClick={() => copy(command)}>
            Copy fork command
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href={`/api${path}/record?version=${version}`} download>
              Download full record
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              copy(
                `${publication.author} (${new Date(publication.created).getFullYear()}). ${description.title}. JAS, v${publication.version}. ${publication.url} (record SHA-256 ${publication.sha256}).`,
              )
            }
          >
            Cite
          </Button>
        </div>
      </section>
      <section className="max-w-3xl space-y-3">
        <h2 className="text-lg font-semibold">Lineage</h2>
        {record.lineage ? (
          <p className="text-sm">
            Forked from{" "}
            <Link
              className="underline"
              to={`/p/${record.lineage.author}/${record.lineage.slug}/v${record.lineage.version}`}
            >
              {record.lineage.author}/{record.lineage.slug}, version{" "}
              {record.lineage.version}
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Original experiment.</p>
        )}
        {record.forks.length ? (
          <ul className="space-y-2 text-sm">
            {record.forks.map((fork) => (
              <li key={fork.id}>
                <a className="underline" href={fork.url}>
                  {fork.title} · @{fork.author}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No public forks published yet.
          </p>
        )}
      </section>
      <Disclosure className="max-w-3xl">
        <DisclosureTrigger>Report this publication</DisclosureTrigger>
        <DisclosureContent className="pt-3">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              report.mutate();
            }}
          >
            <Field>
              <FieldLabel htmlFor="report-reason">
                What should the operator review?
              </FieldLabel>
              <Textarea
                id="report-reason"
                minLength={10}
                maxLength={2000}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <Button variant="outline" disabled={report.isPending}>
              Send report
            </Button>
          </form>
          {report.error && (
            <Alert variant="error">{report.error.message}</Alert>
          )}
        </DisclosureContent>
      </Disclosure>
      {notice && (
        <p role="status" className="break-words text-sm">
          {notice}
        </p>
      )}
    </article>
  );
}
