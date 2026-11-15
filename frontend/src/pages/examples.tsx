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
import type { Starter } from "@/lib/types";

const sections = [
  { setting: "work", title: "Work & evidence" },
  { setting: "game", title: "Cooperation & decisions" },
] as const;

export default function Examples() {
  const examples = useApi<Starter[]>("/starters");
  return (
    <>
      <RecordListTitle title="Examples" icon={Blocks} className="mb-6" />
      {examples.error && (
        <ErrorState error={examples.error} onRetry={examples.refetch} />
      )}
      <div className="@container flex flex-col gap-8">
        {!examples.data && !examples.error && (
          <div
            role="status"
            aria-label="Loading examples"
            className="grid grid-cols-1 gap-3 @2xl:grid-cols-2"
          >
            {["a", "b", "c", "d", "e", "f"].map((id) => (
              <Skeleton
                key={id}
                className="h-44 rounded-xl"
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
                  className="flex flex-col gap-3"
                >
                  <h2
                    id={`examples-${setting}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {title}
                  </h2>
                  <div
                    data-slot="example-grid"
                    className="grid grid-cols-1 gap-3 @2xl:grid-cols-2"
                  >
                    {entries.map((example) => (
                      <article
                        key={example.id}
                        aria-labelledby={`example-${example.id}`}
                        className="min-w-0"
                      >
                        <Card className="h-full">
                          <CardHeader className="grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 gap-y-1">
                            <EnvironmentMark
                              environment={example.design.environment}
                              size={44}
                              className="row-span-2"
                            />
                            <CardTitle>
                              <h3 id={`example-${example.id}`}>
                                {example.design.title}
                              </h3>
                            </CardTitle>
                            <CardDescription className="col-start-2">
                              {example.design.question}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
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
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Scripted demo
                            </span>
                          </CardContent>
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
