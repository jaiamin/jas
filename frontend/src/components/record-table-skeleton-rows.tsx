import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/** Only remote rows load; the table's labels and controls remain available. */
export function RecordTableSkeletonRows({ columns }: { columns: number }) {
  return Array.from({ length: 3 }, (_, row) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder rows.
    <TableRow key={row}>
      {Array.from({ length: columns }, (_, column) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder columns.
        <TableCell key={column}>
          <Skeleton className="h-7 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
