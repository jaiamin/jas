import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { removeTask } from "@/lib/design";
import type { Design } from "@/lib/types";

export function TaskFields({
  design,
  onChange,
}: {
  design: Design;
  onChange: (design: Design) => void;
}) {
  if (design.environment !== "coordination") return null;
  function updateTask(index: number, patch: Partial<Design["tasks"][number]>) {
    onChange({
      ...design,
      tasks: design.tasks.map((task, i) =>
        i === index ? { ...task, ...patch } : task,
      ),
    });
  }
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">Task graph</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={design.tasks.length >= 30}
          onClick={() => {
            let n = design.tasks.length + 1;
            while (design.tasks.some((task) => task.key === `task-${n}`)) n++;
            onChange({
              ...design,
              tasks: [
                ...design.tasks,
                {
                  key: `task-${n}`,
                  name: `Work package ${n}`,
                  effort: 2,
                  dependencies: [],
                },
              ],
            });
          }}
        >
          <Plus data-icon="inline-start" />
          Add task
        </Button>
      </div>
      {!design.tasks.length ? (
        <p className="text-sm text-muted-foreground">
          Using the environment’s default dependency graph. Add tasks to define
          your own.
        </p>
      ) : (
        <FieldGroup>
          {design.tasks.map((task, index) => (
            <FieldSet key={task.key}>
              <FieldLegend variant="label">{task.key}</FieldLegend>
              <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_6rem]">
                <Field>
                  <FieldLabel htmlFor={`task-name-${task.key}`}>
                    Task name
                  </FieldLabel>
                  <Input
                    id={`task-name-${task.key}`}
                    value={task.name}
                    maxLength={100}
                    onChange={(event) =>
                      updateTask(index, { name: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`task-effort-${task.key}`}>
                    Effort
                  </FieldLabel>
                  <Input
                    id={`task-effort-${task.key}`}
                    aria-label={`Effort for ${task.key}`}
                    type="number"
                    min={1}
                    max={20}
                    value={task.effort}
                    onChange={(event) =>
                      updateTask(index, { effort: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field className="sm:col-span-full">
                  <FieldLabel htmlFor={`task-prerequisites-${task.key}`}>
                    Prerequisites
                  </FieldLabel>
                  <Input
                    id={`task-prerequisites-${task.key}`}
                    aria-label={`Prerequisites for ${task.key}`}
                    placeholder="e.g. task-1, task-2"
                    key={task.dependencies.join(",")}
                    defaultValue={task.dependencies.join(", ")}
                    onBlur={(event) =>
                      updateTask(index, {
                        dependencies: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <FieldDescription>
                    Task keys separated by commas. Leave empty for an
                    independent task.
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                aria-label={`Remove ${task.key}`}
                onClick={() =>
                  onChange({
                    ...design,
                    tasks: removeTask(design.tasks, task.key),
                  })
                }
              >
                <Trash2 data-icon="inline-start" />
                Remove task
              </Button>
            </FieldSet>
          ))}
        </FieldGroup>
      )}
    </section>
  );
}
