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
      <Item asChild className="gap-3 rounded-none border-0 px-3 py-4">
        <Link
          to={href}
          aria-label={`Explore ${environment.name}`}
          aria-describedby={`environment-description-${environment.key}`}
          onClick={(event) => onExplore(event.currentTarget)}
        >
          <ItemMedia className="group-has-data-[slot=item-description]/item:self-center group-has-data-[slot=item-description]/item:translate-y-0">
            <EnvironmentMark environment={environment.key} />
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
    <Item aria-hidden="true" className="gap-3 rounded-none border-0 px-3 py-4">
      <ItemMedia className="group-has-data-[slot=item-description]/item:self-center group-has-data-[slot=item-description]/item:translate-y-0">
        <Skeleton className="size-10" />
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
