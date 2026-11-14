import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { ChevronRight } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { workSettings } from "@/lib/environments";
import { money } from "@/lib/format";
import type { Environment } from "@/lib/types";

export function EnvironmentRow({
  environment,
  href,
  onExplore,
}: {
  environment: Environment;
  href: string;
  onExplore: (trigger: HTMLAnchorElement) => void;
}) {
  return (
    <article aria-labelledby={`environment-${environment.key}`}>
      <Item
        asChild
        className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-3 rounded-none border-0 px-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]"
      >
        <Link
          to={href}
          aria-label={`Explore ${environment.name}`}
          aria-describedby={`environment-description-${environment.key}`}
          onClick={(event) => onExplore(event.currentTarget)}
        >
          <ItemMedia className="relative aspect-square max-w-full justify-self-center group-has-data-[slot=item-description]/item:self-stretch group-has-data-[slot=item-description]/item:translate-y-0">
            <EnvironmentMark
              environment={environment.key}
              className="absolute inset-0 size-full"
            />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full line-clamp-none">
              <h2 id={`environment-${environment.key}`}>{environment.name}</h2>
            </ItemTitle>
            <ItemDescription
              id={`environment-description-${environment.key}`}
              className="line-clamp-none"
            >
              {environment.description}
            </ItemDescription>
            <div className="flex flex-wrap gap-1">
              <Badge variant="metadata">
                {workSettings.includes(environment.key)
                  ? "Work setting"
                  : "Abstract game"}
              </Badge>
              {environment.example ? (
                <>
                  <Badge variant="metadata">
                    {environment.example.agents}{" "}
                    {environment.example.agents === 1 ? "agent" : "agents"}
                  </Badge>
                  <Badge variant="metadata">
                    {environment.example.runs}-run example
                  </Badge>
                  <Badge variant="metadata">
                    {environment.example.upper_usd == null
                      ? "Cost unknown"
                      : `Up to ${money(environment.example.upper_usd)}`}
                  </Badge>
                </>
              ) : (
                <Badge variant="metadata">Estimate in builder</Badge>
              )}
            </div>
          </ItemContent>
          <ItemActions
            className="shrink-0 text-muted-foreground [&>svg]:size-4"
            aria-hidden="true"
          >
            <ChevronRight />
          </ItemActions>
        </Link>
      </Item>
    </article>
  );
}

export function EnvironmentRowSkeleton() {
  return (
    <Item
      aria-hidden="true"
      className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-3 rounded-none border-0 px-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]"
    >
      <ItemMedia className="justify-self-center group-has-data-[slot=item-description]/item:self-center group-has-data-[slot=item-description]/item:translate-y-0">
        <Skeleton className="size-16 sm:size-17" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <Skeleton className="h-[1.375em] w-44 max-w-full" />
        <Skeleton className="h-[3em] w-96 max-w-full sm:h-[1.5em]" />
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </ItemContent>
      <ItemActions>
        <Skeleton className="size-4" />
      </ItemActions>
    </Item>
  );
}
