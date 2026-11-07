import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { MechanismFields } from "@/components/mechanism-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  Catalog,
  Environment,
  Parameters,
  Profile,
  Treatment,
} from "@/lib/types";
import { modelLabel } from "@/lib/utils";
import { ProfileOverridesEditor } from "./profile-overrides-editor";
import { ResourceScheduleEditor } from "./resource-schedule-editor";
export function ConditionsEditor({
  hidden,
  conditions,
  profiles,
  environment,
  models,
  rounds,
  taskCount,
  onChange,
}: {
  hidden: boolean;
  conditions: Treatment[];
  profiles: Profile[];
  environment: Environment;
  models: Catalog["models"];
  rounds: number;
  taskCount: number;
  onChange: (conditions: Treatment[]) => void;
}) {
  function updateCondition(index: number, patch: Partial<Treatment>) {
    onChange(
      conditions.map((condition, i) =>
        i === index ? { ...condition, ...patch } : condition,
      ),
    );
  }
  function updateConditionParameter<K extends keyof Parameters>(
    index: number,
    key: K,
    value: Parameters[K],
  ) {
    const condition = conditions[index];
    if (condition)
      updateCondition(index, {
        parameters: { ...condition.parameters, [key]: value },
      });
  }
  return (
    <section className="form-section" hidden={hidden}>
      <div className="section-heading">
        <div>
          <h2>
            Conditions <span className="muted">{conditions.length}</span>
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={conditions.length >= 6}
          onClick={() => {
            let n = conditions.length + 1;
            while (conditions.some((c) => c.key === `condition-${n}`)) n++;
            const base = conditions[0];
            if (!base) return;
            onChange([
              ...conditions,
              structuredClone({
                ...base,
                key: `condition-${n}`,
                name: `Condition ${n}`,
              }),
            ]);
          }}
        >
          <Plus data-icon="inline-start" />
          Add condition
        </Button>
      </div>
      <div className="condition-list">
        {conditions.map((c, i) => (
          <Disclosure className="condition-disclosure" key={c.key}>
            <DisclosureTrigger indicator={false} className="condition-summary">
              <span className="condition-index" data-series={i % 6}>
                {String.fromCharCode(65 + i)}
              </span>
              <strong>{c.name || "Unnamed condition"}</strong>
              <span>{modelLabel(c.model)}</span>
              <ChevronDown />
            </DisclosureTrigger>
            <DisclosureContent>
              <div className="condition-editor">
                <div className="condition-heading">
                  <span className="condition-index" data-series={i % 6}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Input
                    aria-label={`Condition ${i + 1} name`}
                    value={c.name}
                    onChange={(e) =>
                      updateCondition(i, { name: e.target.value })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove condition ${i + 1}`}
                    disabled={conditions.length <= 1}
                    onClick={() =>
                      onChange(conditions.filter((_, index) => index !== i))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <FieldGroup className="condition-fields">
                  <Field>
                    <FieldLabel>Model</FieldLabel>
                    <Select
                      label={`Condition ${i + 1} model`}
                      value={c.model}
                      onValueChange={(v) => updateCondition(i, { model: v })}
                      options={models.map((m) => ({
                        value: m.id,
                        label: modelLabel(m.id),
                      }))}
                    />
                  </Field>
                  {environment.parameters.includes("endowment") && (
                    <>
                      <Field>
                        <FieldLabel htmlFor={`endowment-${c.key}`}>
                          Credits per round
                        </FieldLabel>
                        <Input
                          id={`endowment-${c.key}`}
                          type="number"
                          min={2}
                          max={100}
                          value={c.parameters.endowment}
                          onChange={(e) =>
                            updateConditionParameter(
                              i,
                              "endowment",
                              Number(e.target.value),
                            )
                          }
                        />
                      </Field>
                      {environment.parameters.includes("multiplier") && (
                        <Field>
                          <FieldLabel htmlFor={`multiplier-${c.key}`}>
                            Return multiplier
                          </FieldLabel>
                          <Input
                            id={`multiplier-${c.key}`}
                            type="number"
                            min={1}
                            max={5}
                            step={0.1}
                            value={c.parameters.multiplier}
                            onChange={(e) =>
                              updateConditionParameter(
                                i,
                                "multiplier",
                                Number(e.target.value),
                              )
                            }
                          />
                        </Field>
                      )}
                    </>
                  )}
                  {environment.key === "coordination" && (
                    <Field>
                      <FieldLabel htmlFor={`tasks-${c.key}`}>
                        Task count
                      </FieldLabel>
                      <Input
                        id={`tasks-${c.key}`}
                        type="number"
                        min={3}
                        max={30}
                        disabled={taskCount > 0}
                        value={taskCount || c.parameters.task_count}
                        onChange={(e) =>
                          updateConditionParameter(
                            i,
                            "task_count",
                            Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>Retained memory</FieldLabel>
                    <Select
                      label={`Condition ${i + 1} memory`}
                      value={c.parameters.memory}
                      onValueChange={(v) =>
                        updateConditionParameter(i, "memory", v)
                      }
                      options={[
                        {
                          value: "episodic",
                          label: "Experiences + notes",
                        },
                        {
                          value: "notes",
                          label: "Notes + public history",
                        },
                        {
                          value: "history",
                          label: "Public history only",
                        },
                        {
                          value: "none",
                          label: "No retained history",
                        },
                      ]}
                    />
                  </Field>
                </FieldGroup>
                {c.parameters.communication && (
                  <fieldset className="agent-permissions">
                    <legend>Communication channels</legend>
                    {(["messages", "reports", "promises"] as const)
                      .filter(
                        (channel) =>
                          channel !== "promises" ||
                          ["commons", "trust_exchange"].includes(
                            environment.key,
                          ),
                      )
                      .map((channel) => (
                        <FieldLabel
                          key={channel}
                          htmlFor={`channel-${c.key}-${channel}`}
                        >
                          <Checkbox
                            id={`channel-${c.key}-${channel}`}
                            checked={c.parameters.communication_channels.includes(
                              channel,
                            )}
                            onCheckedChange={(checked) =>
                              updateConditionParameter(
                                i,
                                "communication_channels",
                                checked === true
                                  ? [
                                      ...c.parameters.communication_channels,
                                      channel,
                                    ]
                                  : c.parameters.communication_channels.filter(
                                      (key) => key !== channel,
                                    ),
                              )
                            }
                          />
                          {channel === "reports"
                            ? "Factual reports"
                            : channel === "promises"
                              ? "Promises"
                              : "Messages"}
                        </FieldLabel>
                      ))}
                  </fieldset>
                )}
                <MechanismFields
                  environment={environment.key}
                  parameters={c.parameters}
                  profiles={profiles}
                  id={c.key}
                  onChange={(patch) =>
                    updateCondition(i, {
                      parameters: { ...c.parameters, ...patch },
                    })
                  }
                />
                {environment.parameters.includes("resource_schedule") && (
                  <ResourceScheduleEditor
                    id={c.key}
                    schedule={c.parameters.resource_schedule}
                    rounds={rounds}
                    onChange={(schedule) =>
                      updateConditionParameter(i, "resource_schedule", schedule)
                    }
                  />
                )}
                <ProfileOverridesEditor
                  id={c.key}
                  name={c.name}
                  profiles={profiles}
                  overrides={c.profile_overrides}
                  onChange={(overrides) =>
                    updateCondition(i, { profile_overrides: overrides })
                  }
                />
                <div className="condition-switches">
                  <FieldLabel htmlFor={`communication-${c.key}`}>
                    <Checkbox
                      id={`communication-${c.key}`}
                      checked={c.parameters.communication}
                      onCheckedChange={(checked) =>
                        updateConditionParameter(
                          i,
                          "communication",
                          checked === true,
                        )
                      }
                    />
                    Communication
                  </FieldLabel>
                  <FieldLabel htmlFor={`private-signal-${c.key}`}>
                    <Checkbox
                      id={`private-signal-${c.key}`}
                      checked={c.parameters.private_signal}
                      onCheckedChange={(checked) =>
                        updateConditionParameter(
                          i,
                          "private_signal",
                          checked === true,
                        )
                      }
                    />
                    Private signals
                  </FieldLabel>
                </div>
              </div>
            </DisclosureContent>
          </Disclosure>
        ))}
      </div>
    </section>
  );
}
