import { OptionSelect } from "@/components/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { DistributedRules, Profile } from "@/lib/types";

export function CoordinationAssumptions({
  rules,
}: {
  rules: DistributedRules;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm break-words">
      <p>
        {rules.timing === "sequential" ? "Sequential" : "Phased simultaneous"} ·{" "}
        {rules.delivery_delay} logical ticks of message delay
      </p>
      <p>Activation order: {rules.turn_order.join(" → ")}</p>
      <p>Conflict priority: {rules.conflict_order.join(" → ")}</p>
      <p>
        Alternatives: {rules.alternatives.join(", ")} · all-match bonus:{" "}
        {rules.match_bonus}
      </p>
      <p>
        Directed delivery order:{" "}
        {rules.routes.map((r) => `${r.sender} → ${r.recipient}`).join("; ") ||
          "No routes"}
      </p>
      <p className="text-muted-foreground">
        Directory names and roles are public assumptions. Evidence uses explicit
        access rules. Phased inputs freeze until the barrier; requests may be
        sampled serially. Provider speed grants no priority. Stop abstains
        personally; agreement is optional.
      </p>
    </div>
  );
}

export function DistributedFields({
  rules,
  profiles,
  id,
  onChange,
}: {
  rules: DistributedRules;
  profiles: Profile[];
  id: string;
  onChange: (rules: DistributedRules) => void;
}) {
  const orders =
    profiles.length === 3
      ? profiles.flatMap((a) =>
          profiles
            .filter((b) => b.key !== a.key)
            .map((b) => [
              a.key,
              b.key,
              profiles.find((c) => c.key !== a.key && c.key !== b.key)?.key ??
                "",
            ]),
        )
      : [rules.turn_order];
  return (
    <FieldSet className="min-w-0">
      <FieldLegend>Coordination and delivery</FieldLegend>
      <FieldDescription>
        Three participants have independent choices and local values. Shared
        information is controlled by evidence readers below. Structural
        alternative and information bindings are editable in the specification.
      </FieldDescription>
      <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-timing`}>Logical timing</FieldLabel>
          <OptionSelect
            id={`${id}-timing`}
            label="Logical timing"
            value={rules.timing}
            options={[
              { value: "sequential", label: "Sequential" },
              { value: "phased_simultaneous", label: "Phased simultaneous" },
            ]}
            onValueChange={(timing) => onChange({ ...rules, timing })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-delay`}>
            Message delay in logical ticks
          </FieldLabel>
          <Input
            id={`${id}-delay`}
            type="number"
            min={1}
            max={12}
            value={rules.delivery_delay}
            onChange={(e) =>
              onChange({ ...rules, delivery_delay: Number(e.target.value) })
            }
          />
        </Field>
        {(["turn_order", "conflict_order"] as const).map((field) => (
          <Field key={field}>
            <FieldLabel htmlFor={`${id}-${field}`}>
              {field === "turn_order"
                ? "Activation order"
                : "Conflict priority"}
            </FieldLabel>
            <OptionSelect
              id={`${id}-${field}`}
              label={
                field === "turn_order"
                  ? "Activation order"
                  : "Conflict priority"
              }
              value={rules[field].join(",")}
              options={orders.map((order) => ({
                value: order.join(","),
                label: order.join(" → "),
              }))}
              onValueChange={(value) =>
                onChange({ ...rules, [field]: value.split(",") })
              }
            />
          </Field>
        ))}
        <Field>
          <FieldLabel htmlFor={`${id}-bonus`}>All-match bonus</FieldLabel>
          <Input
            id={`${id}-bonus`}
            type="number"
            min={0}
            max={100}
            value={rules.match_bonus}
            onChange={(e) =>
              onChange({ ...rules, match_bonus: Number(e.target.value) })
            }
          />
        </Field>
      </FieldGroup>
      <FieldSet>
        <FieldLegend>Addressed message routes</FieldLegend>
        <FieldDescription>
          Each checked route permits one direction. Routes deliver in their
          listed order at equal logical time. Readding a route places it last;
          the specification permits direct reordering.
        </FieldDescription>
        <FieldGroup className="grid gap-3 sm:grid-cols-2">
          {profiles.flatMap((sender) =>
            profiles
              .filter((p) => p.key !== sender.key)
              .map((recipient) => {
                const index = rules.routes.findIndex(
                  (r) =>
                    r.sender === sender.key && r.recipient === recipient.key,
                );
                const key = `${sender.key}-${recipient.key}`;
                return (
                  <Field key={key} orientation="horizontal">
                    <Checkbox
                      id={`${id}-route-${key}`}
                      checked={index >= 0}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...rules,
                          routes:
                            checked === true
                              ? [
                                  ...rules.routes,
                                  {
                                    sender: sender.key,
                                    recipient: recipient.key,
                                  },
                                ]
                              : rules.routes.filter(
                                  (r) =>
                                    r.sender !== sender.key ||
                                    r.recipient !== recipient.key,
                                ),
                        })
                      }
                    />
                    <FieldLabel htmlFor={`${id}-route-${key}`}>
                      {sender.name} → {recipient.name}
                      {index >= 0 ? ` · order ${index + 1}` : ""}
                    </FieldLabel>
                  </Field>
                );
              }),
          )}
        </FieldGroup>
      </FieldSet>
      <CoordinationAssumptions rules={rules} />
    </FieldSet>
  );
}
