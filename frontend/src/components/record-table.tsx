import { type ComponentProps, type ReactNode, useState } from "react";
import { Alert } from "@/components/feedback";
import { Download, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiResponse } from "@/lib/api";
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
        "absolute top-1/2 left-2 -translate-y-1/2 after:-inset-x-1.5 data-[state=unchecked]:border-muted-foreground/50",
        "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/record:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:data-[state=checked]:opacity-100 [@media(hover:hover)]:data-[state=indeterminate]:opacity-100",
        "[@media(hover:hover)]:disabled:opacity-0 [@media(hover:hover)]:group-hover/record:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Select the current page without disturbing selections outside its filter/page. */
export function RecordSelectAllCheckbox({
  ref,
  ids,
  selected,
  onSelectionChange,
  label,
  disabled,
}: {
  ref?: ComponentProps<typeof Checkbox>["ref"];
  ids: string[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  label: string;
  disabled: boolean;
}) {
  const count = ids.filter((id) => selected.includes(id)).length;
  return (
    <RecordSelectionCheckbox
      ref={ref}
      aria-label={label}
      disabled={disabled || ids.length === 0}
      checked={
        count === 0 ? false : count === ids.length ? true : "indeterminate"
      }
      onCheckedChange={(checked) =>
        onSelectionChange(
          checked === true
            ? [...new Set([...selected, ...ids])]
            : selected.filter((id) => !ids.includes(id)),
        )
      }
    />
  );
}

/** One compact selection control, shared by both record lists. */
export function RecordSelectionActions({
  count,
  onClear,
  studyIds,
  children,
}: {
  count: number;
  onClear: () => void;
  studyIds: string[];
  children?: ReactNode;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setDownloading(true);
    setError("");
    try {
      const response = await apiResponse("/exports/studies", { ids: studyIds });
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "jas-experiments.zip";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Download failed. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  }
  if (count === 0) return null;
  return (
    <TooltipProvider>
      <div className="flex min-w-0 flex-col gap-2">
        <ButtonGroup aria-label="Selection" className="h-7 shrink-0">
          <ButtonGroupText
            asChild
            className="border-input text-[0.8125rem] font-normal text-muted-foreground tabular-nums"
          >
            <span role="status" aria-atomic="true">
              {count} selected
            </span>
          </ButtonGroupText>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Download selected evidence"
                disabled={downloading || studyIds.length > 1000}
                onClick={download}
              >
                {downloading ? <Spinner /> : <Download />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {studyIds.length > 1000
                ? "Download up to 1,000 experiments at once"
                : "Download experiment evidence"}
            </TooltipContent>
          </Tooltip>
          {children}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="border-input text-muted-foreground"
                aria-label="Clear selection"
                onClick={onClear}
                disabled={downloading}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear selection</TooltipContent>
          </Tooltip>
        </ButtonGroup>
        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </TooltipProvider>
  );
}
