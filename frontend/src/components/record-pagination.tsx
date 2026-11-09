import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

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
  const visible = [...new Set([0, page - 1, page, page + 1, pages - 1])]
    .filter((value) => value >= 0 && value < pages)
    .sort((left, right) => left - right);
  const controls = visible.flatMap((value, index) => {
    const previous = visible[index - 1];
    const item = (
      <PaginationItem key={value}>
        <Button
          variant={page === value ? "outline" : "ghost"}
          size="icon"
          aria-label={`Go to ${noun} page ${value + 1}`}
          aria-current={page === value ? "page" : undefined}
          onClick={() => onPageChange(value)}
        >
          {value + 1}
        </Button>
      </PaginationItem>
    );
    return previous !== undefined && value - previous > 1
      ? [
          <PaginationItem key={`gap-${value}`}>
            <PaginationEllipsis />
          </PaginationItem>,
          item,
        ]
      : [item];
  });
  return (
    <Pagination
      aria-label={`${noun === "experiment" ? "Experiment" : "Run"} pages`}
      className="justify-end px-4 py-3 sm:px-6 lg:px-8"
    >
      <PaginationContent className="flex-wrap justify-end">
        <PaginationItem>
          <Button
            variant="ghost"
            className="gap-0.5"
            disabled={page === 0}
            aria-label={`Previous ${noun} page`}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft data-icon="inline-start" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
        </PaginationItem>
        {controls}
        <PaginationItem>
          <Button
            variant="ghost"
            className="gap-0.5"
            disabled={page + 1 >= pages}
            aria-label={`Next ${noun} page`}
            onClick={() => onPageChange(page + 1)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
