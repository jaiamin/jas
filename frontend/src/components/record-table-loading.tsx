import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RecordTableLoading({ columns }: { columns: number }) {
  return (
    <div className="min-w-0 overflow-hidden" role="status" aria-label="Loading">
      <Table aria-hidden="true">
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }, (_, column) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder columns.
              <TableHead key={column}>
                <Skeleton className="my-2 h-4 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }, (_, row) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder rows.
            <TableRow key={row}>
              {Array.from({ length: columns }, (_, column) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed placeholder columns.
                <TableCell key={column}>
                  <Skeleton className="my-2 h-6 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
