import { cn } from "cn";
import { useId, useRef, useState } from "react";
import { FlaskConical, Play, Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { FieldSet } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunSummary, StudySummary } from "@/lib/types";

export function messageContext(row: {
  purpose: string;
  study_id: string | null;
  run_id: string | null;
}) {
  return row.run_id
    ? `run:${row.run_id}`
    : row.study_id
      ? `study:${row.study_id}`
      : "general";
}

export function contextLabel(
  context: string,
  studies: StudySummary[],
  runs: RunSummary[],
) {
  if (context === "general") return "Add context";
  const [kind, id] = context.split(":");
  if (kind === "study")
    return (
      studies.find((study) => study.id === id)?.title ?? `Experiment ${id}`
    );
  const run = runs.find((item) => item.id === id);
  return run
    ? `${run.condition} · seed ${run.seed} · rep ${run.repetition} · ${run.id.slice(0, 6)}`
    : `Run ${id}`;
}

export function AgentContext({
  value,
  onChange,
  studies,
  runs,
  disabled,
  loading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  studies: StudySummary[];
  runs: RunSummary[];
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const known =
    value === "general" ||
    studies.some((study) => value === `study:${study.id}`) ||
    runs.some((run) => value === `run:${run.id}`);
  const selected = value !== "general";
  const Icon = !selected
    ? Plus
    : value.startsWith("run:")
      ? Play
      : FlaskConical;
  function choose(context: string) {
    onChange(context === value ? "general" : context);
    setOpen(false);
  }
  return (
    <FieldSet
      aria-label="Message context controls"
      className={cn(
        "min-w-0 max-w-[calc(100%-3rem)] flex-row items-center gap-0 rounded-lg",
        selected && "gap-0.5 pr-1",
        selected && !disabled && "hover:bg-muted",
      )}
    >
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            role="combobox"
            aria-expanded={open && !disabled}
            aria-haspopup="dialog"
            aria-controls={open ? popupId : undefined}
            aria-label="Message context"
            variant="ghost"
            disabled={disabled}
            className={cn(
              "min-w-0 shrink justify-start border-0 px-1.5 has-data-[icon=inline-start]:pl-1.5",
              !selected && "pr-2",
              selected &&
                "pr-0 hover:bg-transparent dark:hover:bg-transparent aria-expanded:bg-transparent",
            )}
            title={
              selected
                ? contextLabel(value, studies, runs)
                : "Add experiment or run context"
            }
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            <span className="truncate font-normal">
              {selected ? contextLabel(value, studies, runs) : "Add context"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          id={popupId}
          aria-label="Choose context"
          align="start"
          collisionPadding={16}
          className="w-[26rem] max-w-[calc(100vw-2rem)] gap-0 p-0"
        >
          <Command
            defaultValue={selected ? value : undefined}
            label="Search context"
            filter={(_value, search, keywords = []) =>
              search
                .toLocaleLowerCase()
                .trim()
                .split(/\s+/)
                .every((word) =>
                  keywords.some((keyword) =>
                    keyword.toLocaleLowerCase().includes(word),
                  ),
                )
                ? 1
                : 0
            }
          >
            <CommandInput placeholder="Search experiments and runs…" />
            <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3rem))]">
              {!loading && (
                <CommandEmpty>
                  {studies.length || runs.length || !known
                    ? "No matching context."
                    : "No saved experiments or runs."}
                </CommandEmpty>
              )}
              {!known && (
                <CommandGroup heading="Selected context">
                  <CommandItem
                    value={value}
                    data-checked="true"
                    keywords={[contextLabel(value, studies, runs)]}
                    onSelect={() => choose(value)}
                  >
                    <Icon aria-hidden="true" />
                    <span className="min-w-0 truncate">
                      {contextLabel(value, studies, runs)}
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
              {studies.length > 0 && (
                <CommandGroup heading="Experiments">
                  {studies.map((study) => (
                    <CommandItem
                      key={study.id}
                      value={`study:${study.id}`}
                      keywords={[study.title, study.id]}
                      data-checked={value === `study:${study.id}`}
                      onSelect={() => choose(`study:${study.id}`)}
                      title={study.title}
                    >
                      <FlaskConical aria-hidden="true" />
                      <span className="min-w-0 truncate">{study.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {studies.length > 0 && runs.length > 0 && (
                <CommandSeparator className="mx-3" />
              )}
              {runs.length > 0 && (
                <CommandGroup heading="Runs">
                  {runs.map((run) => (
                    <CommandItem
                      key={run.id}
                      value={`run:${run.id}`}
                      keywords={[
                        run.study_title,
                        contextLabel(`run:${run.id}`, studies, runs),
                        `Version ${run.revision}`,
                      ]}
                      data-checked={value === `run:${run.id}`}
                      onSelect={() => choose(`run:${run.id}`)}
                      title={`${run.study_title} · Version ${run.revision} · ${contextLabel(`run:${run.id}`, studies, runs)}`}
                      aria-label={`${run.study_title} · Version ${run.revision} · ${contextLabel(`run:${run.id}`, studies, runs)}`}
                    >
                      <Play aria-hidden="true" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate">{run.study_title}</span>
                        <span className="text-xs text-muted-foreground whitespace-normal">
                          {run.condition} · Seed {run.seed} · Rep{" "}
                          {run.repetition}
                          {run.revision > 1 && ` · Version ${run.revision}`}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {loading && (
                <div
                  role="status"
                  aria-label="Loading experiments and runs"
                  className="flex flex-col gap-2 p-2"
                >
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-6 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
          aria-label="Clear context"
          title="Clear context"
          disabled={disabled}
          onClick={() => {
            trigger.current?.focus();
            onChange("general");
          }}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </FieldSet>
  );
}
