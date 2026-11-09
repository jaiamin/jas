import type { ComponentProps } from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Keep record content inset while stock row dividers span the entire surface. */
export function RecordTable({
  className,
  ...props
}: ComponentProps<typeof Table>) {
  return (
    <Table
      className={cn(
        "[&_tr>:first-child]:pl-4 [&_tr>:last-child]:pr-4 sm:[&_tr>:first-child]:pl-6 sm:[&_tr>:last-child]:pr-6 lg:[&_tr>:first-child]:pl-8 lg:[&_tr>:last-child]:pr-8",
        className,
      )}
      {...props}
    />
  );
}
