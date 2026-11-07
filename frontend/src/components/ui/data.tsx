import { CircleAlert } from "lucide-react";
import type * as React from "react";
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

export { Badge } from "@/components/ui/badge";
export { Skeleton } from "@/components/ui/skeleton";
export { Table } from "@/components/ui/table";

export function Alert({
  children,
  title,
  variant = "default",
}: {
  children: React.ReactNode;
  title?: string;
  variant?: "default" | "error";
}) {
  return (
    <AlertRoot
      role={variant === "error" ? "alert" : "status"}
      variant={variant === "error" ? "destructive" : "default"}
      className="alert"
    >
      {variant === "error" && <CircleAlert aria-hidden="true" />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
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
    <EmptyRoot className="empty">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </EmptyRoot>
  );
}
