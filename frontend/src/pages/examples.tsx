import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { Empty } from "@/components/feedback";
import { Blocks, Play } from "@/components/icons";
import { RecordListTitle } from "@/components/record-list-heading";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/api";
import { label } from "@/lib/format";
import { conditionIdentity } from "@/lib/identity";
import type { Starter } from "@/lib/types";

const sections = [
  { setting: "work", title: "Work & evidence" },
  { setting: "game", title: "Cooperation & decisions" },
] as const;

export default function Examples() {
  const examples = useApi<Starter[]>("/starters");
  return (
    <>
      <RecordListTitle title="Examples" icon={Blocks} className="mb-8" />
      {examples.error && (
        <ErrorState error={examples.error} onRetry={examples.refetch} />
      )}
      <div className="@container flex flex-col gap-12">
        {!examples.data && !examples.error && (
          <div
            role="status"
            aria-label="Loading examples"
            className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3"
          >
            {["a", "b", "c", "d", "e", "f"].map((id) => (
              <Skeleton
                key={id}
                className="h-80 rounded-xl"
                aria-hidden="true"
              />
            ))}
          </div>
        )}
        {examples.data &&
          (examples.data.length ? (
            sections.map(({ setting, title }) => {
              const entries = examples.data.filter(
                (example) => example.setting === setting,
              );
              return entries.length ? (
                <section
                  key={setting}
                  aria-labelledby={`examples-${setting}`}
                  className="flex flex-col gap-4"
                >
                  <h2
                    id={`examples-${setting}`}
                    className="text-base font-medium"
                  >
                    {title}
                  </h2>
                  <div
                    data-slot="example-grid"
                    className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3"
                  >
                    {entries.map((example) => (
                      <article
                        key={example.id}
                        aria-labelledby={`example-${example.id}`}
                        className="min-w-0"
                      >
                        <Card className="h-full gap-5 pb-0 [--card-spacing:--spacing(6)]">
                          <CardHeader className="flex-1 gap-2">
                            <CardTitle>
                              <h3 id={`example-${example.id}`}>
                                {example.design.title}
                              </h3>
                            </CardTitle>
                            <CardDescription>
                              {example.design.question}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-wrap items-center gap-1">
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                to={`/watch/${example.id}`}
                                aria-label={`Watch ${example.design.title}`}
                              >
                                <Play
                                  data-icon="inline-start"
                                  aria-hidden="true"
                                />
                                Watch
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                to={`/new?starter=${example.id}`}
                                aria-label={`Use ${example.design.title}`}
                              >
                                Use example
                              </Link>
                            </Button>
                          </CardContent>
                          <ExamplePreview example={example} />
                        </Card>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null;
            })
          ) : (
            <Empty
              title="No examples available"
              description="This installation has no recorded examples."
            >
              <Button variant="outline" onClick={() => examples.refetch()}>
                Refresh
              </Button>
            </Empty>
          ))}
      </div>
    </>
  );
}

function ExamplePreview({ example }: { example: Starter }) {
  const { design } = example;
  return (
    <div
      aria-hidden="true"
      data-slot="example-preview"
      className="pointer-events-none ml-8 h-36 overflow-hidden rounded-tl-lg border-l border-t bg-background"
    >
      <div className="flex h-10 items-center gap-2 border-b px-3 text-xs text-muted-foreground">
        <EnvironmentMark environment={design.environment} size={22} />
        <span className="truncate">{label(design.environment)}</span>
        <span className="ml-auto shrink-0">
          {design.profiles.length}{" "}
          {design.profiles.length === 1 ? "agent" : "agents"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
        <span>Conditions</span>
        <span>
          {design.seeds.length} seeds · {design.rounds} rounds
        </span>
      </div>
      {design.conditions.map((condition) => (
        <div
          key={condition.key}
          className="flex items-center gap-2 border-b px-3 py-2.5 text-xs"
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: conditionIdentity(design, condition.key).color,
            }}
          />
          <span className="truncate">{condition.name}</span>
        </div>
      ))}
      {design.measures[0] && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Outcome: {label(design.measures[0])}
        </p>
      )}
    </div>
  );
}
