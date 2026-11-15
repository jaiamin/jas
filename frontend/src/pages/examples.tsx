import { Fragment } from "react";
import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { Empty } from "@/components/feedback";
import { Play } from "@/components/icons";
import { ErrorState, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/api";
import type { Starter } from "@/lib/types";

export default function Examples() {
  const examples = useApi<Starter[]>("/starters");
  return (
    <>
      <PageHeading
        title="Examples"
        description="Watch a scripted demonstration, then reuse its protocol. Recordings use no keys or model calls and aren’t evidence of model behavior."
      />
      {examples.error && (
        <ErrorState error={examples.error} onRetry={examples.refetch} />
      )}
      {!examples.data && !examples.error && (
        <div
          role="status"
          aria-label="Loading examples"
          className="flex flex-col"
        >
          {["a", "b", "c"].map((id) => (
            <div
              key={id}
              className="flex items-center gap-3 py-5"
              aria-hidden="true"
            >
              <Skeleton className="size-10 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-4 w-96 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {examples.data &&
        (examples.data.length ? (
          <ItemGroup className="gap-0">
            <Separator />
            {examples.data.map((example) => (
              <Fragment key={example.id}>
                <article aria-labelledby={`example-${example.id}`}>
                  <Item className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-none border-0 px-0 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                    <ItemMedia className="group-has-data-[slot=item-description]/item:self-center group-has-data-[slot=item-description]/item:translate-y-0">
                      <EnvironmentMark
                        environment={example.design.environment}
                      />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="max-w-full line-clamp-none">
                        <h2 id={`example-${example.id}`}>
                          {example.design.title}
                        </h2>
                      </ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        {example.design.question}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="col-start-2 flex-wrap sm:col-start-auto">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to={`/watch/${example.id}`}
                          aria-label={`Watch ${example.design.title}`}
                        >
                          <Play data-icon="inline-start" aria-hidden="true" />
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
                    </ItemActions>
                  </Item>
                </article>
                <Separator />
              </Fragment>
            ))}
          </ItemGroup>
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
    </>
  );
}
