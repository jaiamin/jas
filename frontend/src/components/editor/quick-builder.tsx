import { useState } from "react";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { Plus, X } from "@/components/icons";
import { ModelPicker } from "@/components/model-picker";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addProfile,
  canRemoveProfile,
  maximumParticipants,
  removeProfile,
} from "@/lib/design";
import { label, modelLabel } from "@/lib/format";
import type { Catalog, Design, EnvironmentId, Treatment } from "@/lib/types";

type Factor =
  | "model"
  | "memory"
  | "communication"
  | "incentive"
  | "accuracy"
  | "regeneration"
  | "materials"
  | "oversight";
function initialFactor(design: Design): Factor {
  if (new Set(design.conditions.map((condition) => condition.model)).size > 1)
    return "model";
  if (
    new Set(design.conditions.map((condition) => condition.parameters.memory))
      .size > 1
  )
    return "memory";
  if (
    new Set(
      design.conditions.map((condition) => condition.parameters.endowment),
    ).size > 1
  )
    return "incentive";
  for (const factor of [
    "accuracy",
    "regeneration",
    "materials",
    "oversight",
  ] as const) {
    if (
      new Set(
        design.conditions.map((condition) => factorValue(condition, factor)),
      ).size > 1
    )
      return factor;
  }
  return new Set(
    design.conditions.map((condition) =>
      condition.parameters.communication_channels.join(","),
    ),
  ).size > 1
    ? "communication"
    : "model";
}

function factorValue(condition: Treatment, factor: Factor): number {
  const parameters = condition.parameters;
  if (factor === "accuracy") return parameters.information.accuracy;
  if (factor === "regeneration") return parameters.resource.regeneration;
  if (factor === "materials") return parameters.workflow?.resource_stock ?? 0;
  if (factor === "oversight") return parameters.institution.oversight;
  return parameters.endowment;
}

const factorLabels = {
  incentive: "Endowment",
  accuracy: "Signal accuracy",
  regeneration: "Regeneration",
  materials: "Material units",
  oversight: "Oversight",
};

export function QuickBuilder({
  design,
  catalog,
  onChange,
  onEnvironmentChange,
  seedsInput,
  disabled,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
  onEnvironmentChange: (environment: EnvironmentId) => void;
  seedsInput: { value: string; onChange: (value: string) => void };
  disabled: boolean;
}) {
  const [factor, setFactor] = useState<Factor>(() => initialFactor(design));
  const [worldOpen, setWorldOpen] = useState(false);
  const environment = catalog.environments.find(
    (value) => value.key === design.environment,
  );
  function condition(index: number, value: Partial<Treatment>) {
    onChange({
      ...design,
      conditions: design.conditions.map((condition, current) =>
        current === index ? { ...condition, ...value } : condition,
      ),
    });
  }
  return (
    <FieldGroup className="gap-6">
      <Field>
        <FieldLabel htmlFor="quick-question">Question</FieldLabel>
        <Input
          id="quick-question"
          value={design.question}
          required
          maxLength={1000}
          onChange={(event) =>
            onChange({
              ...design,
              question: event.target.value,
              title: event.target.value.slice(0, 100),
            })
          }
        />
      </Field>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Field>
          <FieldLabel>World</FieldLabel>
          <Popover open={worldOpen} onOpenChange={setWorldOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start gap-3 whitespace-normal py-3"
              >
                <EnvironmentMark environment={design.environment} size={32} />
                <span className="text-left">
                  <span className="block">
                    {environment?.name ?? label(design.environment)}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {environment?.description}
                  </span>
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-80 w-80 overflow-y-auto p-2">
              <fieldset disabled={disabled} className="grid gap-1">
                {catalog.environments.map((world) => (
                  <Button
                    key={world.key}
                    type="button"
                    variant="ghost"
                    className="h-auto justify-start gap-3 whitespace-normal text-left"
                    onClick={() => {
                      setWorldOpen(false);
                      requestAnimationFrame(() =>
                        onEnvironmentChange(world.key),
                      );
                    }}
                  >
                    <EnvironmentMark environment={world.key} size={28} />
                    <span>{world.name}</span>
                  </Button>
                ))}
              </fieldset>
            </PopoverContent>
          </Popover>
        </Field>
        <Field>
          <FieldLabel>Agents & setup</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {design.profiles.map((profile) => (
              <Popover key={profile.key}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto max-w-full flex-col items-start gap-0.5 py-2"
                  >
                    <span>{profile.name}</span>
                    <span className="max-w-52 truncate text-xs font-normal text-muted-foreground">
                      {modelLabel(
                        profile.model ?? design.conditions[0]?.model ?? "",
                      )}{" "}
                      · {label(design.conditions[0]?.parameters.memory ?? "")}{" "}
                      memory
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <FieldSet disabled={disabled} className="gap-3">
                    <Field>
                      <FieldLabel htmlFor={`quick-agent-${profile.key}`}>
                        Name
                      </FieldLabel>
                      <Input
                        id={`quick-agent-${profile.key}`}
                        value={profile.name}
                        onChange={(event) =>
                          onChange({
                            ...design,
                            profiles: design.profiles.map((value) =>
                              value.key === profile.key
                                ? { ...value, name: event.target.value }
                                : value,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Model override</FieldLabel>
                      <ModelPicker
                        label={`Model for ${profile.name}`}
                        value={profile.model ?? ""}
                        models={catalog.models}
                        onChange={(model) =>
                          onChange({
                            ...design,
                            profiles: design.profiles.map((value) =>
                              value.key === profile.key
                                ? {
                                    ...value,
                                    model:
                                      model === "inherit" || !model
                                        ? null
                                        : model,
                                  }
                                : value,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canRemoveProfile(design, profile.key)}
                      onClick={() =>
                        onChange(removeProfile(design, profile.key))
                      }
                    >
                      Remove agent
                    </Button>
                  </FieldSet>
                </PopoverContent>
              </Popover>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                design.profiles.length >=
                maximumParticipants(design.environment)
              }
              onClick={() => onChange(addProfile(design))}
            >
              <Plus />
              Add agent
            </Button>
          </div>
        </Field>
      </div>
      <FieldGroup className="gap-3">
        <Field className="max-w-72">
          <FieldLabel htmlFor="quick-factor">What varies</FieldLabel>
          <OptionSelect
            id="quick-factor"
            label="What varies"
            value={factor}
            onValueChange={setFactor}
            options={[
              { value: "model", label: "Model" },
              { value: "memory", label: "Memory" },
              { value: "communication", label: "Communication" },
              { value: "incentive", label: "Incentive (endowment)" },
              ...(design.environment === "information"
                ? [{ value: "accuracy" as const, label: "Signal accuracy" }]
                : []),
              ...(design.environment === "renewable_resource"
                ? [
                    {
                      value: "regeneration" as const,
                      label: "Resource regeneration",
                    },
                  ]
                : []),
              ...(design.environment === "institutional_workflow"
                ? [{ value: "materials" as const, label: "Material stock" }]
                : []),
              ...(design.environment === "institution"
                ? [{ value: "oversight" as const, label: "Oversight" }]
                : []),
            ]}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {design.conditions.map((value, index) => (
            <div
              key={value.key}
              className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  aria-label={`Condition ${index + 1} name`}
                  className="h-8"
                  value={value.name}
                  onChange={(event) =>
                    condition(index, { name: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${value.name}`}
                  disabled={design.conditions.length <= 1}
                  onClick={() =>
                    onChange({
                      ...design,
                      conditions: design.conditions.filter(
                        (item) => item.key !== value.key,
                      ),
                    })
                  }
                >
                  <X />
                </Button>
              </div>
              {factor === "model" && (
                <ModelPicker
                  label={`Model for ${value.name}`}
                  value={value.model}
                  models={catalog.models}
                  onChange={(model) => {
                    if (model !== "inherit") condition(index, { model });
                  }}
                />
              )}
              {factor === "memory" && (
                <OptionSelect
                  label={`Memory for ${value.name}`}
                  value={value.parameters.memory}
                  onValueChange={(memory) =>
                    condition(index, {
                      parameters: { ...value.parameters, memory },
                    })
                  }
                  options={[
                    { value: "none", label: "No memory" },
                    { value: "notes", label: "Private notes" },
                    { value: "episodic", label: "Recorded experiences" },
                  ]}
                />
              )}
              {factor === "communication" && (
                <OptionSelect
                  label={`Messages for ${value.name}`}
                  value={
                    value.parameters.communication_channels.includes(
                      "messages",
                    ) && value.parameters.communication
                      ? "on"
                      : "off"
                  }
                  onValueChange={(enabled) =>
                    condition(index, {
                      parameters: {
                        ...value.parameters,
                        communication: true,
                        communication_channels: [
                          ...value.parameters.communication_channels.filter(
                            (channel) => channel !== "messages",
                          ),
                          ...(enabled === "on" ? ["messages" as const] : []),
                        ],
                      },
                    })
                  }
                  options={[
                    { value: "on", label: "Messages enabled" },
                    { value: "off", label: "Messages disabled" },
                  ]}
                />
              )}
              {factor !== "model" &&
                factor !== "memory" &&
                factor !== "communication" && (
                  <Input
                    type="number"
                    aria-label={`${factorLabels[factor]} for ${value.name}`}
                    min={factor === "incentive" ? 1 : 0}
                    max={
                      factor === "accuracy" ||
                      factor === "regeneration" ||
                      factor === "oversight"
                        ? 1
                        : undefined
                    }
                    step={
                      factor === "accuracy" ||
                      factor === "regeneration" ||
                      factor === "oversight"
                        ? 0.1
                        : 1
                    }
                    value={factorValue(value, factor)}
                    onChange={(event) => {
                      const amount = Number(event.target.value);
                      condition(index, {
                        parameters: {
                          ...value.parameters,
                          ...(factor === "incentive"
                            ? { endowment: amount }
                            : {}),
                          ...(factor === "accuracy"
                            ? {
                                information: {
                                  ...value.parameters.information,
                                  accuracy: amount,
                                },
                              }
                            : {}),
                          ...(factor === "regeneration"
                            ? {
                                resource: {
                                  ...value.parameters.resource,
                                  regeneration: amount,
                                },
                              }
                            : {}),
                          ...(factor === "materials" &&
                          value.parameters.workflow
                            ? {
                                workflow: {
                                  ...value.parameters.workflow,
                                  resource_stock: amount,
                                },
                              }
                            : {}),
                          ...(factor === "oversight"
                            ? {
                                institution: {
                                  ...value.parameters.institution,
                                  oversight: amount,
                                },
                              }
                            : {}),
                        },
                      });
                    }}
                  />
                )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={design.conditions.length >= 6}
          onClick={() => {
            const base = design.conditions[0];
            if (!base) return;
            const key = `condition-${crypto.randomUUID().slice(0, 8)}`;
            onChange({
              ...design,
              conditions: [
                ...design.conditions,
                {
                  ...structuredClone(base),
                  key,
                  name: `Condition ${design.conditions.length + 1}`,
                },
              ],
            });
          }}
        >
          <Plus />
          Add level
        </Button>
        <p className="text-xs text-muted-foreground">
          Checks identify other differences preserved from Advanced.
        </p>
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="quick-seeds">Seeds</FieldLabel>
          <Input
            id="quick-seeds"
            value={seedsInput.value}
            onChange={(event) => seedsInput.onChange(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quick-repeats">Repeats</FieldLabel>
          <Input
            id="quick-repeats"
            type="number"
            min={1}
            max={10}
            value={design.repetitions}
            onChange={(event) =>
              onChange({ ...design, repetitions: Number(event.target.value) })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quick-rounds">Rounds</FieldLabel>
          <Input
            id="quick-rounds"
            type="number"
            min={1}
            value={design.rounds}
            onChange={(event) =>
              onChange({ ...design, rounds: Number(event.target.value) })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quick-budget">Max spend (USD)</FieldLabel>
          <Input
            id="quick-budget"
            type="number"
            min={0}
            step="any"
            value={design.budget_usd}
            onChange={(event) =>
              onChange({ ...design, budget_usd: Number(event.target.value) })
            }
          />
        </Field>
      </div>
    </FieldGroup>
  );
}
