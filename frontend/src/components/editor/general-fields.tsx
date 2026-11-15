import { useState } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { QuestionFields } from "@/components/editor/question-fields";
import { Plus, X } from "@/components/icons";
import { ModelPicker } from "@/components/model-picker";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

export function GeneralFields({
  design,
  catalog,
  onChange,
  onEnvironmentChange,
  seedsInput,
  disabled,
  onEditAgents,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
  onEnvironmentChange: (environment: EnvironmentId) => void;
  seedsInput: { value: string; onChange: (value: string) => void };
  disabled: boolean;
  onEditAgents: () => void;
}) {
  const [factor, setFactor] = useState<Factor>(() => initialFactor(design));
  const selectedFactor = design.conditions.length === 1 ? "model" : factor;
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
      <QuestionFields
        design={design}
        catalog={catalog}
        onChange={onChange}
        onEnvironmentChange={onEnvironmentChange}
        disabled={disabled}
        basicOnly
      />
      <FieldSet className="gap-3">
        <FieldLegend>Agents</FieldLegend>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            {design.profiles.length} agents ·{" "}
            {design.profiles.map((profile) => profile.name).join(", ")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEditAgents}
          >
            Edit agents
          </Button>
        </div>
      </FieldSet>
      <FieldSet className="gap-4">
        <FieldLegend>Conditions</FieldLegend>
        {design.conditions.length > 1 && (
          <Field>
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
        )}
        <div className="flex flex-col gap-3">
          {design.conditions.map((value, index) => (
            <div
              key={value.key}
              className="flex min-w-0 flex-col gap-3 rounded-lg border p-4"
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
              {selectedFactor === "model" && (
                <ModelPicker
                  label={`Model for ${value.name}`}
                  value={value.model}
                  models={catalog.models}
                  onChange={(model) => {
                    if (model !== "inherit") condition(index, { model });
                  }}
                />
              )}
              {selectedFactor === "memory" && (
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
              {selectedFactor === "communication" && (
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
              {selectedFactor !== "model" &&
                selectedFactor !== "memory" &&
                selectedFactor !== "communication" && (
                  <Input
                    type="number"
                    aria-label={`${factorLabels[selectedFactor]} for ${value.name}`}
                    min={selectedFactor === "incentive" ? 1 : 0}
                    max={
                      selectedFactor === "accuracy" ||
                      selectedFactor === "regeneration" ||
                      selectedFactor === "oversight"
                        ? 1
                        : undefined
                    }
                    step={
                      selectedFactor === "accuracy" ||
                      selectedFactor === "regeneration" ||
                      selectedFactor === "oversight"
                        ? 0.1
                        : 1
                    }
                    value={factorValue(value, selectedFactor)}
                    onChange={(event) => {
                      const amount = Number(event.target.value);
                      condition(index, {
                        parameters: {
                          ...value.parameters,
                          ...(selectedFactor === "incentive"
                            ? { endowment: amount }
                            : {}),
                          ...(selectedFactor === "accuracy"
                            ? {
                                information: {
                                  ...value.parameters.information,
                                  accuracy: amount,
                                },
                              }
                            : {}),
                          ...(selectedFactor === "regeneration"
                            ? {
                                resource: {
                                  ...value.parameters.resource,
                                  regeneration: amount,
                                },
                              }
                            : {}),
                          ...(selectedFactor === "materials" &&
                          value.parameters.workflow
                            ? {
                                workflow: {
                                  ...value.parameters.workflow,
                                  resource_stock: amount,
                                },
                              }
                            : {}),
                          ...(selectedFactor === "oversight"
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
          Add condition
        </Button>
      </FieldSet>
      <FieldSet className="gap-5">
        <FieldLegend>Run plan</FieldLegend>
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
        <Disclosure>
          <DisclosureTrigger>Seeds and repetitions</DisclosureTrigger>
          <DisclosureContent className="pt-4">
            <FieldGroup>
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
                    onChange({
                      ...design,
                      repetitions: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </FieldGroup>
          </DisclosureContent>
        </Disclosure>
      </FieldSet>
    </FieldGroup>
  );
}
