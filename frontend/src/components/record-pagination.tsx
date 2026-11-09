import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Pagination } from "@/components/ui/pagination";

export function RecordPagination({
  page,
  pages,
  onPageChange,
  noun,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  noun: "experiment" | "run";
}) {
  if (pages <= 1) return null;
  return (
    <Pagination
      aria-label={`${noun === "experiment" ? "Experiment" : "Run"} pages`}
      className="items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8"
    >
      <span
        aria-live="polite"
        aria-atomic="true"
        className="text-xs text-muted-foreground tabular-nums"
      >
        Page {page + 1} of {pages}
      </span>
      <ButtonGroup aria-label="Page navigation">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page === 0}
          aria-label={`Previous ${noun} page`}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page + 1 >= pages}
          aria-label={`Next ${noun} page`}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </ButtonGroup>
    </Pagination>
  );
}
