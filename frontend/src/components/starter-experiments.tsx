import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { Play } from "@/components/icons";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/api";
import { money } from "@/lib/format";
import type { Starter } from "@/lib/types";

export function StarterExperiments() {
  const starters = useApi<Starter[]>("/starters");
  return (
    <section aria-labelledby="starter-title" className="flex flex-col gap-3">
      <h2 id="starter-title" className="text-sm font-medium">
        Starter experiments
      </h2>
      {starters.error && (
        <ErrorState error={starters.error} onRetry={starters.refetch} />
      )}
      {!starters.data && !starters.error && (
        <div
          role="status"
          aria-label="Loading starter experiments"
          className="grid gap-3 sm:grid-cols-2"
        >
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {starters.data && (
        <ItemGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {starters.data.slice(0, 3).map((starter) => (
            <Item
              key={starter.id}
              variant="outline"
              className="h-full flex-col items-stretch gap-4 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <EnvironmentMark
                  environment={starter.design.environment}
                  size={32}
                />
                <span className="text-xs text-muted-foreground">
                  {starter.setting === "work"
                    ? "Work setting"
                    : "Abstract game"}
                </span>
              </div>
              <ItemContent className="gap-2">
                <ItemTitle>
                  <Link
                    to={`/new?starter=${starter.id}`}
                    className="hover:underline"
                  >
                    {starter.design.title}
                  </Link>
                </ItemTitle>
                <ItemDescription className="line-clamp-none">
                  {starter.design.question}
                </ItemDescription>
              </ItemContent>
              <p className="text-xs text-muted-foreground">
                About {Math.max(1, Math.round(starter.estimated_seconds / 60))}{" "}
                min ·{" "}
                {starter.estimate.upper_usd == null
                  ? "Cost unknown"
                  : `up to ${money(starter.estimate.upper_usd)}`}
                <span className="sr-only">
                  . Conservative estimate; model speed varies.
                </span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 justify-start self-start"
                asChild
              >
                <Link
                  to={`/watch/${starter.id}`}
                  aria-label={`Watch a recorded run: ${starter.design.title}`}
                >
                  <Play data-icon="inline-start" />
                  Watch a recorded run
                </Link>
              </Button>
            </Item>
          ))}
        </ItemGroup>
      )}
    </section>
  );
}
