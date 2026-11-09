import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { removeTask } from "@/lib/design";
import type { Design } from "@/lib/types";

export function TaskFields({
  design,
  onChange,
  hidden,
}: {
  design: Design;
  onChange: (design: Design) => void;
  hidden: boolean;
}) {
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    onChange({ ...design, [key]: value });
  }
  function updateTask(index: number, patch: Partial<Design["tasks"][number]>) {
    update(
      "tasks",
      design.tasks.map((task, i) =>
        i === index ? { ...task, ...patch } : task,
      ),
    );
  }

  return (
    <>
      {design.environment === "coordination" && (
        <section className="mb-6 flex flex-col gap-6" hidden={hidden}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
            <div>
              <h2 className="text-base font-semibold">Task graph</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={design.tasks.length >= 30}
              onClick={() => {
                let n = design.tasks.length + 1;
                while (design.tasks.some((t) => t.key === `task-${n}`)) n++;
                update("tasks", [
                  ...design.tasks,
                  {
                    key: `task-${n}`,
                    name: `Work package ${n}`,
                    effort: 2,
                    dependencies: [],
                  },
                ]);
              }}
            >
              <Plus data-icon="inline-start" />
              Add task
            </Button>
          </div>
          {!design.tasks.length ? (
            <p className="text-muted-foreground">
              Using the environment’s default dependency graph. Add a task to
              define your own graph.
            </p>
          ) : (
            <FieldGroup>
              {design.tasks.map((task, index) => (
                <Field key={task.key}>
                  <FieldLabel htmlFor={`task-name-${task.key}`}>
                    <code>{task.key}</code>
                  </FieldLabel>
                  <div className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)_auto] gap-2">
                    <Input
                      id={`task-name-${task.key}`}
                      value={task.name}
                      maxLength={100}
                      onChange={(e) =>
                        updateTask(index, { name: e.target.value })
                      }
                    />
                    <Input
                      aria-label={`Effort for ${task.key}`}
                      type="number"
                      min={1}
                      max={20}
                      value={task.effort}
                      onChange={(e) =>
                        updateTask(index, { effort: Number(e.target.value) })
                      }
                    />
                    <Input
                      aria-label={`Prerequisites for ${task.key}`}
                      placeholder="Prerequisites, e.g. task-1"
                      key={task.dependencies.join(",")}
                      defaultValue={task.dependencies.join(", ")}
                      onBlur={(e) =>
                        updateTask(index, {
                          dependencies: e.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${task.key}`}
                      onClick={() =>
                        onChange({
                          ...design,
                          tasks: removeTask(design.tasks, task.key),
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Field>
              ))}
            </FieldGroup>
          )}
        </section>
      )}
    </>
  );
}
