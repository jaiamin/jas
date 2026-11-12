import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { participantHarness } from "@/lib/design";
import type {
  EnvironmentId,
  ParticipantHarness,
  ScriptedHarness,
} from "@/lib/types";

const capabilities = [
  { key: "planning", policy: "actor_plan_v1", label: "Plan artifacts" },
  { key: "memory", policy: "actor_sources_v1", label: "Source-linked memory" },
  {
    key: "investigation",
    policy: "actor_inspection_v1",
    label: "World investigation",
  },
  {
    key: "verification",
    policy: "legal_evidence_v1",
    label: "Action and source checks",
  },
] as const;

export function HarnessFields({
  id,
  index,
  value,
  artifacts = false,
  onChange,
  environment,
  onAblation,
}: {
  id: string;
  index: number;
  value: ParticipantHarness;
  artifacts?: boolean;
  onChange: (value: ParticipantHarness) => void;
  environment: EnvironmentId;
  onAblation: (choice: "memory" | "tools" | "deliberation") => void;
}) {
  return (
    <FieldSet>
      <FieldLegend>Participant harness</FieldLegend>
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-full">
          <FieldLabel htmlFor={`harness-${id}`}>Decision process</FieldLabel>
          <OptionSelect
            id={`harness-${id}`}
            label={`Condition ${index + 1} participant harness`}
            value={value.kind}
            onValueChange={(kind) =>
              onChange(
                participantHarness(
                  kind as ParticipantHarness["kind"],
                  environment,
                ),
              )
            }
            options={[
              { value: "direct_action", label: "Direct action" },
              ...(environment === "distributed_coordination"
                ? [
                    {
                      value: "event_wait",
                      label: "Direct action with event waiting",
                    },
                  ]
                : []),
              { value: "tool_using", label: "Tool using" },
              { value: "scripted", label: "Scripted control" },
            ]}
          />
          <FieldDescription>
            {value.kind === "event_wait"
              ? "Explicit policy change: repeat a model-chosen wait without inference until new input, a bounded wake-up, or the final round. Every turn still commits. Compare with ordinary direct action."
              : value.kind === "direct_action"
                ? "One request receives the current observation and proposes an action."
                : value.kind === "scripted"
                  ? "Non-model control. No provider requests."
                  : "The participant chooses capabilities, reads and an action within these limits. Each inference is charged separately."}
          </FieldDescription>
        </Field>
        {value.kind === "event_wait" && (
          <Field>
            <FieldLabel htmlFor={`wait-${id}`}>
              Maximum repeated wait turns
            </FieldLabel>
            <Input
              id={`wait-${id}`}
              type="number"
              min={1}
              max={12}
              value={value.max_wait_turns}
              onChange={(event) =>
                onChange({
                  ...value,
                  max_wait_turns: Number(event.target.value),
                })
              }
            />
            <FieldDescription>
              Per participant, after a model-chosen wait. Messages, choices and
              artifact changes wake it; clock and memory alone do not.
            </FieldDescription>
          </Field>
        )}
        {value.kind === "scripted" && (
          <Field className="sm:col-span-full">
            <FieldLabel htmlFor={`reference-${id}`}>
              Reference policy
            </FieldLabel>
            <OptionSelect
              id={`reference-${id}`}
              label={`Condition ${index + 1} reference policy`}
              value={value.policy}
              options={[
                { value: "commons_keep_v1", label: "Keep credits · commons" },
                {
                  value: "commons_half_v1",
                  label: "Half contribution · commons",
                },
                {
                  value: "private_signal_v1",
                  label: "Own private signal · information",
                },
                {
                  value: "local_value_v1",
                  label: "First readable table, local maximum · coordination",
                },
              ]}
              onValueChange={(policy) =>
                onChange({
                  ...value,
                  policy: policy as ScriptedHarness["policy"],
                })
              }
            />
            <FieldDescription>
              Keep credits contributes zero. Half contribution uses half the
              legal maximum, rounded down. Own private signal chooses the
              actor's observed signal. Local maximum reads the first permitted
              immutable table and chooses its best alternative, breaking ties in
              declared alternative order. It does not pool private tables.
              Controls read only that participant's observation and legal
              options, send no communication and retain no self-authored notes.
              The named world is required.
            </FieldDescription>
          </Field>
        )}
        {value.kind === "tool_using" && (
          <>
            <Field className="sm:col-span-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                  >
                    Apply ablation
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onAblation("memory")}>
                      Disable retained memory
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onAblation("tools")}>
                      Disable tool access
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onAblation("deliberation")}
                    >
                      Limit to one inference
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <FieldDescription>
                Applies an editable, saved configuration. One inference may
                decide immediately; choosing an auxiliary operation can exhaust
                its budget without an action.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`requests-${id}`}>
                Maximum requests per activation
              </FieldLabel>
              <Input
                id={`requests-${id}`}
                type="number"
                min={1}
                max={8}
                value={value.max_requests}
                onChange={(event) =>
                  onChange({
                    ...value,
                    max_requests: Number(event.target.value),
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`operations-${id}`}>
                Maximum tool operations per activation
              </FieldLabel>
              <Input
                id={`operations-${id}`}
                type="number"
                min={0}
                max={12}
                value={value.max_tool_operations}
                onChange={(event) =>
                  onChange({
                    ...value,
                    max_tool_operations: Number(event.target.value),
                  })
                }
              />
            </Field>
            <FieldSet className="sm:col-span-full">
              <FieldLegend>Capabilities</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {capabilities.map(({ key, policy, label }) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={`capability-${id}-${key}`}>
                      {label}
                    </FieldLabel>
                    <OptionSelect
                      id={`capability-${id}-${key}`}
                      label={`Condition ${index + 1} ${label.toLowerCase()}`}
                      value={value.capabilities[key]}
                      options={[
                        { value: policy, label: "Enabled · v1" },
                        { value: "disabled", label: "Disabled" },
                      ]}
                      onValueChange={(choice) =>
                        onChange({
                          ...value,
                          capabilities: {
                            ...value.capabilities,
                            [key]: choice,
                          },
                        })
                      }
                    />
                  </Field>
                ))}
              </FieldGroup>
              <FieldDescription>
                Use is optional. Plans are private self-reports; checks use only
                accessible evidence and legal options. Memory retention follows
                this condition's memory mode. Disabled capabilities have no
                fallback.
              </FieldDescription>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor={`context-${id}`}>
                Maximum context characters
              </FieldLabel>
              <Input
                id={`context-${id}`}
                type="number"
                min={4000}
                max={32000}
                value={value.max_context_chars}
                onChange={(event) =>
                  onChange({
                    ...value,
                    max_context_chars: Number(event.target.value),
                  })
                }
              />
              <FieldDescription>
                Full receipts remain inspectable when context is shortened.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`memory-items-${id}`}>
                Maximum memory results
              </FieldLabel>
              <Input
                id={`memory-items-${id}`}
                type="number"
                min={1}
                max={16}
                value={value.max_memory_items}
                onChange={(event) =>
                  onChange({
                    ...value,
                    max_memory_items: Number(event.target.value),
                  })
                }
              />
            </Field>
            <FieldSet className="sm:col-span-full">
              <FieldLegend>Permitted reads</FieldLegend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    "observe",
                    "rules",
                    "legal_options",
                    ...(artifacts ? ["read_artifact" as const] : []),
                  ] as const
                ).map((tool) => (
                  <FieldLabel key={tool} htmlFor={`tool-${id}-${tool}`}>
                    <Checkbox
                      id={`tool-${id}-${tool}`}
                      checked={value.tools.includes(tool)}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...value,
                          tools:
                            checked === true
                              ? [...value.tools, tool]
                              : value.tools.filter((item) => item !== tool),
                        })
                      }
                    />
                    {tool === "observe"
                      ? "Own observation"
                      : tool === "rules"
                        ? "Current rules"
                        : tool === "legal_options"
                          ? "Legal options"
                          : "Authorized artifacts"}
                  </FieldLabel>
                ))}
              </div>
              <FieldDescription>
                Reads use the active participant's permissions. Exhausting a
                limit stops the activation without a fallback action.
              </FieldDescription>
            </FieldSet>
          </>
        )}
      </FieldGroup>
    </FieldSet>
  );
}
