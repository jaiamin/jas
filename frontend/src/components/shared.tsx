import type { ReactNode } from "react";
import { Alert } from "@/components/feedback";
import {
  type AppIcon,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  Clock3,
  LoaderCircle,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { label } from "@/lib/format";

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
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
const statusIcons: Record<string, AppIcon> = {
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
    <Badge
      variant={
        value === "failed"
          ? "destructive"
          : value === "running"
            ? "default"
            : "secondary"
      }
    >
      <Icon
        aria-hidden="true"
        className={
          value === "running"
            ? "animate-spin motion-reduce:animate-none"
            : undefined
        }
      />
      {label(value)}
    </Badge>
  );
}
export function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-20" />
      <Skeleton className="h-48" />
    </div>
  );
}
export function ErrorState({
  error,
  onRetry,
  title = "Unable to load",
}: {
  error: Error;
  onRetry?: () => unknown;
  title?: string;
}) {
  return (
    <Alert
      variant="error"
      title={title}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={() => onRetry()}>
            Retry
          </Button>
        )
      }
    >
      {error.message}
    </Alert>
  );
}
export function Json({ value }: { value: unknown }) {
  return (
    <pre className="my-3 max-h-96 overflow-auto rounded-md border bg-background p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
