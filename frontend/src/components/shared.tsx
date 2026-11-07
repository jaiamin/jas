import {
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  Clock3,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
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
const statusIcons: Record<string, LucideIcon> = {
  complete: CircleCheck,
  running: LoaderCircle,
  queued: Clock3,
  paused: CirclePause,
  pausing: CirclePause,
  failed: CircleX,
};

export function Status({ value }: { value: string }) {
  const Icon = statusIcons[value] ?? CircleDashed;
  return (
    <Badge className={cn("status", `status-${value}`)}>
      <Icon
        aria-hidden="true"
        className={value === "running" ? "spin" : undefined}
      />
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
export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => unknown;
}) {
  return (
    <Alert variant="error" title="Could not load this view">
      {error.message}
      <Button variant="outline" size="sm" onClick={() => onRetry()}>
        Retry
      </Button>
    </Alert>
  );
}
export function Json({ value }: { value: unknown }) {
  return <pre className="json-view">{JSON.stringify(value, null, 2)}</pre>;
}
