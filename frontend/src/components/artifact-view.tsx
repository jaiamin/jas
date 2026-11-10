import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Json } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RunDetail, State } from "@/lib/types";

export function ArtifactView({ run, state }: { run: RunDetail; state: State }) {
  if (!state.artifacts)
    throw new Error("Artifact checkpoint is missing objects");
  const name = (key: string) =>
    run.design.profiles.find((p) => p.key === key)?.name ?? key;
  const outcome = state.outcome;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Artifact workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Researcher view of all objects. Participant observations and tools use
          their own access permissions.
        </p>
        <p className="mt-2 text-sm tabular-nums">
          {state.writes_remaining} writes remaining
        </p>
      </div>
      {outcome && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>
              {
                {
                  success: "Submission passed",
                  failure: "Submission failed",
                  stopped: "Participant stopped",
                  horizon: "Round limit reached",
                }[outcome.status]
              }
            </CardTitle>
            <CardDescription>
              {outcome.status === "success"
                ? "Every required work field matches its cited evidence version."
                : "The run ended without a successful submission."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <Button variant="link" size="sm" asChild>
              <Link
                to={`/runs/${run.summary.id}?tab=decisions&turn=${outcome.operation}`}
              >
                Inspect terminal turn {outcome.operation}
              </Link>
            </Button>
            <Disclosure>
              <DisclosureTrigger>Recorded checks</DisclosureTrigger>
              <DisclosureContent>
                <Json value={outcome.result} />
              </DisclosureContent>
            </Disclosure>
          </CardContent>
        </Card>
      )}
      {Object.values(state.artifacts).map((obj) => (
        <section key={obj.key} aria-label={`${obj.name} versions`}>
          <Card size="sm" id={`artifact-${obj.key}`}>
            <CardHeader>
              <CardTitle className="break-words">{obj.name}</CardTitle>
              <CardDescription className="break-words">
                {obj.key} · owner: {obj.owner ? name(obj.owner) : "none"} ·
                readers: {obj.readers.map(name).join(", ") || "none"} · writers:{" "}
                {obj.writers.map(name).join(", ") || "none"}. Owners can read
                and write.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3">
              {obj.versions.map((version) => (
                <Disclosure
                  key={version.version}
                  id={`artifact-${obj.key}-v${version.version}`}
                  defaultOpen={version.version === obj.versions.length}
                >
                  <DisclosureTrigger>
                    Version {version.version} ·{" "}
                    {version.author ? name(version.author) : "Initial content"}
                  </DisclosureTrigger>
                  <DisclosureContent className="flex min-w-0 flex-col items-start gap-3 pt-3">
                    <dl className="grid w-full min-w-0 gap-2 text-sm [&>div]:grid [&>div]:gap-1 [&>div]:sm:grid-cols-2 [&_dt]:text-muted-foreground [&_dd]:break-words [&_dd]:whitespace-pre-wrap">
                      {Object.entries(version.content).map(([field, value]) => (
                        <div key={field}>
                          <dt>{field}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Sources:</span>
                      {version.sources.length ? (
                        version.sources.map((source) => (
                          <a
                            className="underline underline-offset-4"
                            key={`${source.artifact}-${source.version}`}
                            href={`#artifact-${source.artifact}-v${source.version}`}
                          >
                            {source.artifact} v{source.version}
                          </a>
                        ))
                      ) : (
                        <span>None recorded</span>
                      )}
                    </div>
                    {version.operation > 0 && (
                      <Button variant="link" size="sm" asChild>
                        <Link
                          to={`/runs/${run.summary.id}?tab=decisions&turn=${version.operation}`}
                        >
                          Inspect turn {version.operation}
                        </Link>
                      </Button>
                    )}
                  </DisclosureContent>
                </Disclosure>
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
    </section>
  );
}
