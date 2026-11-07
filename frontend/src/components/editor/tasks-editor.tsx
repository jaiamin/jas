import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { removeTask } from "@/lib/design";
import type { TaskDefinition } from "@/lib/types";
export function TasksEditor({
  hidden,
  tasks,
  onChange,
}: {
  hidden: boolean;
  tasks: TaskDefinition[];
  onChange: (tasks: TaskDefinition[]) => void;
}) {
  function updateTask(index: number, patch: Partial<TaskDefinition>) {
    onChange(
      tasks.map((task, i) => (i === index ? { ...task, ...patch } : task)),
    );
  }
  return (
    <section className="form-section" hidden={hidden}>
      <div className="section-heading">
        <div>
          <h2>Task graph</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={tasks.length >= 30}
          onClick={() => {
            let n = tasks.length + 1;
            while (tasks.some((t) => t.key === `task-${n}`)) n++;
            onChange([
              ...tasks,
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
      {!tasks.length ? (
        <p className="muted">
          Using the environment’s default dependency graph. Add a task to define
          your own graph.
        </p>
      ) : (
        <FieldGroup>
          {tasks.map((task, index) => (
            <Field key={task.key}>
              <FieldLabel htmlFor={`task-name-${task.key}`}>
                <code>{task.key}</code>
              </FieldLabel>
              <div className="task-editor-row">
                <Input
                  id={`task-name-${task.key}`}
                  value={task.name}
                  maxLength={100}
                  onChange={(e) => updateTask(index, { name: e.target.value })}
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
                  onClick={() => onChange(removeTask(tasks, task.key))}
                >
                  <Trash2 />
                </Button>
              </div>
            </Field>
          ))}
        </FieldGroup>
      )}
    </section>
  );
}
