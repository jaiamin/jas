import type { ComponentProps } from "react";
import { X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Table } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
}: {
  count: number;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <ButtonGroup aria-label="Selection" className="h-7 shrink-0">
      <ButtonGroupText
        asChild
        className="border-input text-[0.8125rem] font-normal text-muted-foreground tabular-nums"
      >
        <span role="status" aria-atomic="true">
          {count} selected
        </span>
      </ButtonGroupText>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="border-input text-muted-foreground"
              aria-label="Clear selection"
              onClick={onClear}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </ButtonGroup>
  );
}
