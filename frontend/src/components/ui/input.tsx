import type * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("input", className)} {...props} />;
}
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return <textarea className={cn("textarea", className)} {...props} />;
}
export function FieldGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("field-group", className)} {...props} />;
}
export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("field", className)} {...props} />;
}
export function FieldLabel({
  htmlFor,
  children,
  ...props
}: React.ComponentProps<"label">) {
  return htmlFor ? (
    <label htmlFor={htmlFor} className="field-label" {...props}>
      {children}
    </label>
  ) : (
    <span className="field-label" {...props}>
      {children}
    </span>
  );
}
export function FieldDescription(props: React.ComponentProps<"p">) {
  return <p className="field-description" {...props} />;
}
