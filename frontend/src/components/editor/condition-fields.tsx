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
import { Textarea } from "@/components/ui/textarea";
import type {
  Catalog,
  Design,
  ModelId,
  Parameters,
  Profile,
  Treatment,
} from "@/lib/types";
import { modelLabel } from "@/lib/utils";

export function ConditionFields({
  design,
  catalog,
  onChange,
  hidden,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
  hidden: boolean;
}) {
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
    <section className="form-section" hidden={hidden}>
      <div className="section-heading">
        <div>
          <h2>
            Conditions <span className="muted">{design.conditions.length}</span>
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={design.conditions.length >= 6}
          onClick={() => {
            let n = design.conditions.length + 1;
            while (design.conditions.some((c) => c.key === `condition-${n}`))
              n++;
            const base = design.conditions[0];
            if (!base) return;
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
      <div className="condition-list">
        {design.conditions.map((c, i) => (
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
                    onChange={(e) => condition(i, { name: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove condition ${i + 1}`}
                    disabled={design.conditions.length <= 1}
                    onClick={() =>
                      update(
                        "conditions",
                        design.conditions.filter((_, index) => index !== i),
                      )
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
                    <FieldLabel>Retained memory</FieldLabel>
                    <Select
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
                {c.parameters.communication && (
                  <fieldset className="agent-permissions">
                    <legend>Communication channels</legend>
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
                  </fieldset>
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
                  <Disclosure className="disclosure">
                    <DisclosureTrigger>
                      Resource changes during the run
                      {c.parameters.resource_schedule.length > 0 &&
                        ` · ${c.parameters.resource_schedule.length}`}
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <p className="table-note">
                        Changes take effect at the start of a round and persist.
                        Agents see the new budget when it changes; future
                        changes are hidden.
                      </p>
                      {c.parameters.resource_schedule.map((change, j) => (
                        <FieldGroup
                          className="condition-fields"
                          key={
                            // biome-ignore lint/suspicious/noArrayIndexKey: Controlled fields retain focus while the round is edited; rows are never reordered.
                            `${c.key}-change-${j}`
                          }
                        >
                          <Field>
                            <FieldLabel htmlFor={`${c.key}-change-round-${j}`}>
                              Starting round
                            </FieldLabel>
                            <Input
                              id={`${c.key}-change-round-${j}`}
                              type="number"
                              min={2}
                              max={design.rounds}
                              value={change.round}
                              onChange={(e) =>
                                parameter(
                                  i,
                                  "resource_schedule",
                                  c.parameters.resource_schedule.map((v, k) =>
                                    k === j
                                      ? {
                                          ...v,
                                          round: Number(e.target.value),
                                        }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel
                              htmlFor={`${c.key}-change-credits-${j}`}
                            >
                              Credits per round
                            </FieldLabel>
                            <Input
                              id={`${c.key}-change-credits-${j}`}
                              type="number"
                              min={2}
                              max={100}
                              value={change.endowment}
                              onChange={(e) =>
                                parameter(
                                  i,
                                  "resource_schedule",
                                  c.parameters.resource_schedule.map((v, k) =>
                                    k === j
                                      ? {
                                          ...v,
                                          endowment: Number(e.target.value),
                                        }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </Field>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              parameter(
                                i,
                                "resource_schedule",
                                c.parameters.resource_schedule.filter(
                                  (_, k) => k !== j,
                                ),
                              )
                            }
                          >
                            Remove change
                          </Button>
                        </FieldGroup>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          design.rounds < 2 ||
                          c.parameters.resource_schedule.length >= 12
                        }
                        onClick={() =>
                          parameter(i, "resource_schedule", [
                            ...c.parameters.resource_schedule,
                            {
                              round: Math.max(2, Math.ceil(design.rounds / 2)),
                              endowment: 3,
                            },
                          ])
                        }
                      >
                        Add resource change
                      </Button>
                    </DisclosureContent>
                  </Disclosure>
                )}
                <Disclosure className="disclosure">
                  <DisclosureTrigger>
                    Roles & goals for this condition
                    {c.profile_overrides.length > 0 &&
                      ` · ${c.profile_overrides.length} modified`}
                  </DisclosureTrigger>
                  <DisclosureContent>
                    <FieldGroup>
                      {design.profiles.map((base) => {
                        const resolved =
                          c.profile_overrides.find((p) => p.key === base.key) ??
                          base;
                        function override(changes: Partial<Profile>) {
                          const edited = { ...resolved, ...changes };
                          condition(i, {
                            profile_overrides: [
                              ...c.profile_overrides.filter(
                                (p) => p.key !== base.key,
                              ),
                              edited,
                            ],
                          });
                        }
                        return (
                          <Field key={base.key}>
                            <FieldLabel htmlFor={`${c.key}-${base.key}-goal`}>
                              {base.name}
                            </FieldLabel>
                            <Input
                              aria-label={`${c.name} role for ${base.name}`}
                              value={resolved.role}
                              onChange={(e) =>
                                override({ role: e.target.value })
                              }
                              maxLength={80}
                            />
                            <Textarea
                              id={`${c.key}-${base.key}-goal`}
                              value={resolved.goal}
                              onChange={(e) =>
                                override({ goal: e.target.value })
                              }
                              maxLength={2000}
                              rows={2}
                            />
                            {c.profile_overrides.some(
                              (p) => p.key === base.key,
                            ) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  condition(i, {
                                    profile_overrides:
                                      c.profile_overrides.filter(
                                        (p) => p.key !== base.key,
                                      ),
                                  })
                                }
                              >
                                Use baseline profile
                              </Button>
                            )}
                          </Field>
                        );
                      })}
                    </FieldGroup>
                  </DisclosureContent>
                </Disclosure>
                <div className="condition-switches">
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
                </div>
              </div>
            </DisclosureContent>
          </Disclosure>
        ))}
      </div>
    </section>
  );
}
