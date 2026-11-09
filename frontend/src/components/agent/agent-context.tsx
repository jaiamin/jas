import { FlaskConical, Globe, Play, Plus } from "@/components/icons";
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
      : row.purpose === "design"
        ? "new"
        : "general";
}

export function contextLabel(
  context: string,
  studies: StudySummary[],
  runs: RunSummary[],
) {
  if (context === "new") return "New experiment";
  if (context === "general") return "General";
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
}: {
  value: string;
  onChange: (value: string) => void;
  studies: StudySummary[];
  runs: RunSummary[];
  disabled?: boolean;
}) {
  const known =
    value === "general" ||
    value === "new" ||
    studies.some((study) => value === `study:${study.id}`) ||
    runs.some((run) => value === `run:${run.id}`);
  const Icon =
    value === "general" ? Globe : value === "new" ? Plus : FlaskConical;
  return (
    <SelectRoot value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className="min-w-0 max-w-[calc(100%-3rem)]"
        aria-label="Message context"
      >
        <Icon aria-hidden="true" />
        <SelectValue>{contextLabel(value, studies, runs)}</SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        className="w-[26rem] max-w-[calc(100vw-2rem)]"
      >
        <SelectGroup>
          <SelectItem value="general">
            <Globe aria-hidden="true" />
            General
          </SelectItem>
          <SelectItem value="new">
            <Plus aria-hidden="true" />
            New experiment
          </SelectItem>
        </SelectGroup>
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
                <SelectItem key={study.id} value={`study:${study.id}`}>
                  <FlaskConical aria-hidden="true" />
                  <span>{study.title}</span>
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
                    <span>{run.study_title}</span>
                    <small>
                      Rev {run.revision} ·{" "}
                      {contextLabel(`run:${run.id}`, studies, runs)}
                    </small>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </SelectRoot>
  );
}
