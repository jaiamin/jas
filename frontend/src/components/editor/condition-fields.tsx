import { useRef, useState } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { HarnessFields } from "@/components/editor/harness-fields";
import { ProfileOverridesEditor } from "@/components/editor/profile-overrides-editor";
import { ResourceScheduleEditor } from "@/components/editor/resource-schedule-editor";
import { Plus, Trash2 } from "@/components/icons";
import { MechanismFields } from "@/components/mechanism-fields";
import { OptionSelect as Select } from "@/components/option-select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { modelLabel } from "@/lib/format";
import type {
  Catalog,
  Design,
  ModelId,
  Parameters,
  Treatment,
} from "@/lib/types";

export function ConditionFields({
  design,
  catalog,
  onChange,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
}) {
  const [open, setOpen] = useState<string[]>([design.conditions[0]?.key ?? ""]);
  const addedInput = useRef<string | null>(null);
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    onChange({ ...design, [key]: value });
  }
  const environment = catalog.environments.find(
    (e) => e.key === design.environment,
  );
  if (!environment) return null;
  function condition(index: number, value: Partial<Treatment>) {
    update(
      "conditions",
      design.conditions.map((c, i) => (i === index ? { ...c, ...value } : c)),
    );
  }
  function parameter<K extends keyof Parameters>(
    index: number,
    key: K,
    value: Parameters[K],
  ) {
    const c = design.conditions[index];
    if (c) condition(index, { parameters: { ...c.parameters, [key]: value } });
  }
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">
            Conditions{" "}
            <span className="text-muted-foreground">
              {design.conditions.length}
            </span>
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={design.conditions.length >= 6}
          onClick={() => {
            let n = design.conditions.length + 1;
            while (design.conditions.some((c) => c.key === `condition-${n}`))
              n++;
            const base = design.conditions[0];
            if (!base) return;
            addedInput.current = `condition-condition-${n}-name`;
            setOpen((open) => [...open, `condition-${n}`]);
            update("conditions", [
              ...design.conditions,
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
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        {design.conditions.map((c, i) => (
          <AccordionItem value={c.key} key={c.key}>
            <AccordionTrigger className="min-w-0 items-center justify-start gap-3 hover:no-underline">
              <Badge variant="outline" className="shrink-0">
                {String.fromCharCode(65 + i)}
              </Badge>
              <span
                title={c.name}
                className="min-w-0 flex-1 truncate font-medium"
              >
                {c.name || "Unnamed condition"}
              </span>
              <span className="ml-auto hidden max-w-48 truncate text-xs font-normal text-muted-foreground sm:inline">
                {modelLabel(c.model)}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex min-w-0 flex-col gap-6 pb-2 pt-2">
                <FieldGroup className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`condition-${c.key}-name`}>
                      Condition name
                    </FieldLabel>
                    <Input
                      id={`condition-${c.key}-name`}
                      ref={(element) => {
                        if (element && addedInput.current === element.id) {
                          addedInput.current = null;
                          element.focus();
                        }
                      }}
                      aria-label={`Condition ${i + 1} name`}
                      value={c.name}
                      maxLength={80}
                      onChange={(event) =>
                        condition(i, { name: event.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`model-${c.key}`}>Model</FieldLabel>
                    <Select
                      id={`model-${c.key}`}
                      label={`Condition ${i + 1} model`}
                      value={c.model}
                      onValueChange={(v) =>
                        condition(i, { model: v as ModelId })
                      }
                      options={catalog.models.map((m) => ({
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
                            parameter(i, "endowment", Number(e.target.value))
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
                              parameter(i, "multiplier", Number(e.target.value))
                            }
                          />
                        </Field>
                      )}
                    </>
                  )}
                  {design.environment === "coordination" && (
                    <Field>
                      <FieldLabel htmlFor={`tasks-${c.key}`}>
                        Task count
                      </FieldLabel>
                      <Input
                        id={`tasks-${c.key}`}
                        type="number"
                        min={3}
                        max={30}
                        disabled={design.tasks.length > 0}
                        value={design.tasks.length || c.parameters.task_count}
                        onChange={(e) =>
                          parameter(i, "task_count", Number(e.target.value))
                        }
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor={`memory-${c.key}`}>
                      Retained memory
                    </FieldLabel>
                    <Select
                      id={`memory-${c.key}`}
                      label={`Condition ${i + 1} memory`}
                      value={c.parameters.memory}
                      onValueChange={(v) =>
                        parameter(i, "memory", v as Parameters["memory"])
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
                <HarnessFields
                  id={c.key}
                  index={i}
                  value={c.harness}
                  artifacts={[
                    "artifact_workspace",
                    "distributed_coordination",
                  ].includes(design.environment)}
                  onChange={(harness) => condition(i, { harness })}
                />
                <div className="flex flex-wrap gap-5">
                  {environment.parameters.includes("communication") && (
                    <FieldLabel htmlFor={`communication-${c.key}`}>
                      <Checkbox
                        id={`communication-${c.key}`}
                        checked={c.parameters.communication}
                        onCheckedChange={(checked) =>
                          parameter(i, "communication", checked === true)
                        }
                      />
                      Communication
                    </FieldLabel>
                  )}
                  {environment.parameters.includes("private_signal") && (
                    <FieldLabel htmlFor={`private-signal-${c.key}`}>
                      <Checkbox
                        id={`private-signal-${c.key}`}
                        checked={c.parameters.private_signal}
                        onCheckedChange={(checked) =>
                          parameter(i, "private_signal", checked === true)
                        }
                      />
                      Private signals
                    </FieldLabel>
                  )}
                </div>
                {environment.parameters.includes("communication_channels") &&
                  c.parameters.communication && (
                    <FieldSet className="col-span-full flex flex-wrap gap-4">
                      <FieldLegend>Communication channels</FieldLegend>
                      {(["messages", "reports", "promises"] as const)
                        .filter(
                          (channel) =>
                            channel !== "promises" ||
                            ["commons", "trust_exchange"].includes(
                              design.environment,
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
                                parameter(
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
                    </FieldSet>
                  )}
                <MechanismFields
                  environment={design.environment}
                  parameters={c.parameters}
                  profiles={design.profiles}
                  id={c.key}
                  onChange={(patch) =>
                    condition(i, {
                      parameters: { ...c.parameters, ...patch },
                    })
                  }
                />
                {environment.parameters.includes("resource_schedule") && (
                  <ResourceScheduleEditor
                    id={c.key}
                    schedule={c.parameters.resource_schedule}
                    rounds={design.rounds}
                    onChange={(schedule) =>
                      parameter(i, "resource_schedule", schedule)
                    }
                  />
                )}
                <Disclosure>
                  <DisclosureTrigger>Condition notes</DisclosureTrigger>
                  <DisclosureContent className="pt-4">
                    <Field>
                      <FieldLabel htmlFor={`condition-${c.key}-description`}>
                        Description (optional)
                      </FieldLabel>
                      <Textarea
                        id={`condition-${c.key}-description`}
                        rows={2}
                        value={c.description}
                        maxLength={1000}
                        onChange={(event) =>
                          condition(i, { description: event.target.value })
                        }
                      />
                    </Field>
                  </DisclosureContent>
                </Disclosure>
                <ProfileOverridesEditor
                  id={c.key}
                  name={c.name}
                  profiles={design.profiles}
                  overrides={c.profile_overrides}
                  onChange={(overrides) =>
                    condition(i, { profile_overrides: overrides })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  aria-label={`Remove condition ${i + 1}`}
                  disabled={design.conditions.length <= 1}
                  onClick={() =>
                    update(
                      "conditions",
                      design.conditions.filter((_, index) => index !== i),
                    )
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  Remove condition
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
