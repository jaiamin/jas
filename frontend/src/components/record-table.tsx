import type { ComponentProps } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Keep record content inset while stock row dividers span the entire surface. */
export function RecordTable({
  selection = false,
  className,
  ...props
}: ComponentProps<typeof Table> & { selection?: boolean }) {
  return (
    <Table
      className={cn(
        "[&_tr>:last-child]:pr-4 sm:[&_tr>:last-child]:pr-6 lg:[&_tr>:last-child]:pr-8",
        selection
          ? "[&_tr>:first-child]:pl-8"
          : "[&_tr>:first-child]:pl-4 sm:[&_tr>:first-child]:pl-6 lg:[&_tr>:first-child]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

/** Reveal selection in the name gutter without shifting record content. */
export function RecordSelectionCheckbox({
  className,
  ...props
}: ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      className={cn(
        "absolute top-1/2 left-2 -translate-y-1/2 after:-inset-x-1.5 data-[state=unchecked]:border-muted-foreground/60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/record:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:data-[state=checked]:opacity-100",
        className,
      )}
      {...props}
    />
  );
}
