import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Skeleton } from "@/components/ui/data";
import { cn, label } from "@/lib/utils";

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <Badge className={cn("status", `status-${value}`)}>
      <span className="status-dot" />
      {label(value)}
    </Badge>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-20" />
      <Skeleton className="h-48" />
    </div>
  );
}
export function ErrorState({ error }: { error: Error }) {
  const client = useQueryClient();
  return (
    <Alert variant="error" title="Could not load this view">
      {error.message}
      <Button
        variant="outline"
        size="sm"
        onClick={() => client.invalidateQueries()}
      >
        Retry
      </Button>
    </Alert>
  );
}
export function Json({ value }: { value: unknown }) {
  return <pre className="json-view">{JSON.stringify(value, null, 2)}</pre>;
}
