import { EnvironmentMark } from "@/components/environments/environment-mark";
import { ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Environment } from "@/lib/types";

export function EnvironmentCard({
  environment,
  onExplore,
}: {
  environment: Environment;
  onExplore: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <Card role="article" aria-labelledby={`environment-${environment.key}`}>
      <CardHeader className="gap-3">
        <EnvironmentMark environment={environment.key} />
        <CardTitle>
          <h2 id={`environment-${environment.key}`}>{environment.name}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {environment.description}
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Explore ${environment.name}`}
          onClick={(event) => onExplore(event.currentTarget)}
        >
          Details
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function EnvironmentCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader className="gap-3">
        <Skeleton className="size-12 rounded-lg" />
        <Skeleton className="h-[22px] w-3/4" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
      <CardFooter className="justify-end">
        <Skeleton className="h-7 w-20" />
      </CardFooter>
    </Card>
  );
}
