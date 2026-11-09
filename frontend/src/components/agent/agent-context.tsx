import { cn } from "cn";
import { useId, useRef } from "react";
import { FlaskConical, Globe, Play, Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  Select as SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  if (context === "general") return "Ask anything";
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
  const trigger = useRef<HTMLButtonElement>(null);
  const generalDescription = useId();
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
  return (
    <div className="flex min-w-0 max-w-[calc(100%-3rem)] items-center">
      <SelectRoot value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          ref={trigger}
          className={cn(
            "min-w-0 flex-1 border-0 px-1.5 shadow-none hover:bg-muted dark:bg-transparent dark:hover:bg-muted [&>svg:last-child]:hidden",
            selected && "pr-0",
          )}
          aria-label="Message context"
          title={
            selected
              ? contextLabel(value, studies, runs)
              : "Add experiment or run context"
          }
        >
          <Icon aria-hidden="true" />
          <SelectValue className="min-w-0">
            <span className="truncate">
              {selected ? contextLabel(value, studies, runs) : "Add context"}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          className="max-h-[min(20rem,var(--radix-select-content-available-height))] w-[26rem] max-w-[calc(100vw-2rem)] [&_[data-slot=select-item]>span:last-child]:min-w-0"
        >
          <SelectGroup>
            <SelectItem
              value="general"
              aria-describedby={generalDescription}
              textValue="Ask anything"
            >
              <Globe aria-hidden="true" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>Ask anything</span>
                <span
                  id={generalDescription}
                  aria-hidden="true"
                  className="text-xs text-muted-foreground whitespace-normal"
                >
                  Ask a question or plan a new experiment.
                </span>
              </span>
            </SelectItem>
          </SelectGroup>
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
          {!known && (
            <SelectGroup>
              <SelectItem value={value}>
                {contextLabel(value, studies, runs)}
              </SelectItem>
            </SelectGroup>
          )}
          {studies.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Experiments</SelectLabel>
                {studies.map((study) => (
                  <SelectItem
                    key={study.id}
                    value={`study:${study.id}`}
                    textValue={study.title}
                  >
                    <FlaskConical aria-hidden="true" />
                    <span className="truncate">{study.title}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
          {runs.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Runs</SelectLabel>
                {runs.map((run) => (
                  <SelectItem key={run.id} value={`run:${run.id}`}>
                    <Play aria-hidden="true" />
                    <span className="flex min-w-0 flex-col gap-1 [&_small]:text-muted-foreground">
                      <span className="truncate">{run.study_title}</span>
                      <small className="whitespace-normal">
                        Rev {run.revision} ·{" "}
                        {contextLabel(`run:${run.id}`, studies, runs)}
                      </small>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
          {!loading && studies.length === 0 && runs.length === 0 && known && (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              Saved experiments and runs will appear here.
            </p>
          )}
        </SelectContent>
      </SelectRoot>
      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
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
    </div>
  );
}
