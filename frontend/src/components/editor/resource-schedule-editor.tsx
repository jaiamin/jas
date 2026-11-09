import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Parameters } from "@/lib/types";

type Schedule = Parameters["resource_schedule"];
export function ResourceScheduleEditor({
  id,
  schedule,
  rounds,
  onChange,
}: {
  id: string;
  schedule: Schedule;
  rounds: number;
  onChange: (schedule: Schedule) => void;
}) {
  function updateChange(index: number, patch: Partial<Schedule[number]>) {
    onChange(
      schedule.map((change, i) =>
        i === index ? { ...change, ...patch } : change,
      ),
    );
  }
  return (
    <Disclosure className="min-w-0">
      <DisclosureTrigger>
        Resource changes during the run
        {schedule.length > 0 && ` · ${schedule.length}`}
      </DisclosureTrigger>
      <DisclosureContent>
        <p className="p-4 text-xs leading-relaxed text-muted-foreground">
          Changes take effect at the start of a round and persist. Agents see
          the new budget when it changes; future changes are hidden.
        </p>
        {schedule.map((change, j) => (
          <FieldGroup
            className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2"
            key={
              // biome-ignore lint/suspicious/noArrayIndexKey: Controlled fields retain focus while the round is edited; rows are never reordered.
              `${id}-change-${j}`
            }
          >
            <Field>
              <FieldLabel htmlFor={`${id}-change-round-${j}`}>
                Starting round
              </FieldLabel>
              <Input
                id={`${id}-change-round-${j}`}
                type="number"
                min={2}
                max={rounds}
                value={change.round}
                onChange={(e) =>
                  updateChange(j, {
                    round: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-change-credits-${j}`}>
                Credits per round
              </FieldLabel>
              <Input
                id={`${id}-change-credits-${j}`}
                type="number"
                min={2}
                max={100}
                value={change.endowment}
                onChange={(e) =>
                  updateChange(j, {
                    endowment: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Button
              variant="ghost"
              onClick={() => onChange(schedule.filter((_, k) => k !== j))}
            >
              Remove change
            </Button>
          </FieldGroup>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={rounds < 2 || schedule.length >= 12}
          onClick={() =>
            onChange([
              ...schedule,
              {
                round: Math.max(2, Math.ceil(rounds / 2)),
                endowment: 3,
              },
            ])
          }
        >
          Add resource change
        </Button>
      </DisclosureContent>
    </Disclosure>
  );
}
