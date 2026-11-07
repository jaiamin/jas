import type * as React from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("badge", className)} {...props} />;
}
export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="table-scroll">
      <table className={cn("table", className)} {...props} />
    </div>
  );
}
export function Separator() {
  return <hr className="separator" />;
}
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
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
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("alert", variant === "error" && "alert-error")}
    >
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
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
    <div className="empty">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
