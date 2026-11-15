import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { ChevronRight } from "@/components/icons";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { environmentSummary } from "@/lib/environments";
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
    <article
      className="min-w-0"
      aria-labelledby={`environment-${environment.key}`}
    >
      <Item
        asChild
        variant="outline"
        className="grid h-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 p-4"
      >
        <Link
          to={href}
          aria-label={`Explore ${environment.name}`}
          aria-describedby={`environment-description-${environment.key}`}
          onClick={(event) => onExplore(event.currentTarget)}
        >
          <ItemMedia className="group-has-data-[slot=item-description]/item:self-center group-has-data-[slot=item-description]/item:translate-y-0">
            <EnvironmentMark environment={environment.key} size={44} />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full line-clamp-none">
              <h2 id={`environment-${environment.key}`}>{environment.name}</h2>
            </ItemTitle>
            <ItemDescription
              id={`environment-description-${environment.key}`}
              className="max-w-prose line-clamp-none"
            >
              {environmentSummary(environment)}
            </ItemDescription>
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
      variant="outline"
      className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 p-4"
    >
      <ItemMedia className="justify-self-center group-has-data-[slot=item-description]/item:self-center group-has-data-[slot=item-description]/item:translate-y-0">
        <Skeleton className="size-11" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <Skeleton className="h-[1.375em] w-44 max-w-full" />
        <Skeleton className="h-[3em] w-96 max-w-full sm:h-[1.5em]" />
      </ItemContent>
      <ItemActions>
        <Skeleton className="size-4" />
      </ItemActions>
    </Item>
  );
}
