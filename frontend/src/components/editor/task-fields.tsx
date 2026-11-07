import { Plus, Trash2 } from "lucide-react";
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

  return (
    <>
      {design.environment === "coordination" && (
        <section className="form-section" hidden={hidden}>
          <div className="section-heading">
            <div>
              <h2>Task graph</h2>
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
            <p className="muted">
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
                  <div className="task-editor-row">
                    <Input
                      id={`task-name-${task.key}`}
                      value={task.name}
                      maxLength={100}
                      onChange={(e) =>
                        update(
                          "tasks",
                          design.tasks.map((t, j) =>
                            j === index ? { ...t, name: e.target.value } : t,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`Effort for ${task.key}`}
                      type="number"
                      min={1}
                      max={20}
                      value={task.effort}
                      onChange={(e) =>
                        update(
                          "tasks",
                          design.tasks.map((t, j) =>
                            j === index
                              ? { ...t, effort: Number(e.target.value) }
                              : t,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`Prerequisites for ${task.key}`}
                      placeholder="Prerequisites, e.g. task-1"
                      key={task.dependencies.join(",")}
                      defaultValue={task.dependencies.join(", ")}
                      onBlur={(e) =>
                        update(
                          "tasks",
                          design.tasks.map((t, j) =>
                            j === index
                              ? {
                                  ...t,
                                  dependencies: e.target.value
                                    .split(",")
                                    .map((v) => v.trim())
                                    .filter(Boolean),
                                }
                              : t,
                          ),
                        )
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
