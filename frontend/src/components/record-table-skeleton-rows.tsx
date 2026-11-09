import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Only remote rows load; the table's labels and controls remain available. */
export function RecordTableSkeletonRows({
  kind,
}: {
  kind: "experiment" | "run";
}) {
  const widths =
    kind === "experiment"
      ? ["w-40", "size-4", "w-32", "w-16", "w-10", "w-24", "size-6"]
      : [
          "w-36",
          "size-4",
          "w-40",
          "w-16",
          "w-6",
          "w-6",
          "w-6",
          "w-20",
          "w-12",
          "w-32",
          "size-6",
        ];
  return Array.from({ length: 3 }, (_, row) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder rows.
    <TableRow key={row}>
      {widths.map((width, column) => (
        <TableCell
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder columns.
          key={column}
          className={cn(
            column === 0 && "min-w-48 max-w-96",
            kind === "run" && column === 2 && "min-w-40 max-w-80",
          )}
        >
          <div className="flex h-7 items-center gap-2">
            {kind === "experiment" && column === 2 && (
              <Skeleton className="size-7 shrink-0 rounded-md" />
            )}
            <Skeleton className={cn("h-4 max-w-full", width)} />
          </div>
        </TableCell>
      ))}
    </TableRow>
  ));
}
