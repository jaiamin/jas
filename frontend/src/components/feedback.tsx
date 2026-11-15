import type * as React from "react";
import { CircleAlert } from "@/components/icons";
import {
  AlertDescription,
  Alert as AlertRoot,
  AlertTitle,
} from "@/components/ui/alert";
import {
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  Empty as EmptyRoot,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export function Alert({
  children,
  title,
  variant = "default",
  action,
}: {
  children: React.ReactNode;
  title?: string;
  variant?: "default" | "error";
  action?: React.ReactNode;
}) {
  return (
    <AlertRoot
      role={variant === "error" ? "alert" : "status"}
      variant={variant === "error" ? "destructive" : "default"}
      className={cn(
        "my-4 min-w-0",
        variant === "error" && "max-w-2xl gap-y-1 p-4",
      )}
    >
      {variant === "error" && <CircleAlert aria-hidden="true" />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="min-w-0 wrap-anywhere">
        <div className="max-w-prose">{children}</div>
      </AlertDescription>
      {action && (
        <div
          className={cn(
            "mt-2 flex min-w-0 flex-wrap items-center gap-2",
            variant === "error" && "col-start-2",
          )}
        >
          {action}
        </div>
      )}
    </AlertRoot>
  );
}

export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <EmptyRoot>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </EmptyRoot>
  );
}
