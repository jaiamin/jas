import { OptionSelect } from "@/components/option-select";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  ArtifactRules,
  CommitmentOpportunity,
  CommitmentRules,
  DistributedRules,
  Profile,
} from "@/lib/types";

export function CommitmentAssumptions({ rules }: { rules: CommitmentRules }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm break-words">
      <p>
        Promising and relying are voluntary. Reliance grants the promisor read
        access to the recipient-owned artifact irrevocably for this run, and
        accepts the declared recipient effect. Role descriptions and prose grant
        no access.
      </p>
      {rules.opportunities.map((o) => (
        <p key={o.key}>
          {o.key}: {o.promisor} → {o.recipient} · promise {o.alternative} ·
          opening {o.opens_at}, deadline {o.deadline} · entrust {o.artifact} ·
          recipient effect: fulfilled {o.fulfilled_value}, otherwise{" "}
          {o.unfulfilled_value}
        </p>
      ))}
      <p className="text-muted-foreground">
        Fulfillment requires a final choice at opening ≤ decision time &lt;
        deadline. Infeasible promises and absent opportunities are recorded
        separately. Ending before a deadline leaves it unresolved, with no
        settled effect. A breach is a mechanical result; intent remains
        unassessed. Choices are final; later messages, reads and waits remain
        possible until withdrawal or the horizon.
      </p>
    </div>
  );
}

export function CommitmentFields({
  rules,
  coordination,
  artifacts,
  profiles,
  id,
  onChange,
}: {
  rules: CommitmentRules;
  coordination: DistributedRules;
  artifacts: ArtifactRules;
  profiles: Profile[];
  id: string;
  onChange: (rules: CommitmentRules) => void;
}) {
  const patch = (index: number, update: Partial<CommitmentOpportunity>) =>
    onChange({
      opportunities: rules.opportunities.map((o, i) =>
        i === index ? { ...o, ...update } : o,
      ),
    });
  return (
    <FieldSet className="min-w-0">
      <FieldLegend>Voluntary reliance and commitments</FieldLegend>
      <FieldDescription>
        Declare opportunities, real alternatives and independent recipient
        effects. Nobody is assigned to promise, rely or breach. The promise
        communication control removes actual promise and reliance actions. Add
        or remove opportunity entries in Specification.
      </FieldDescription>
      {rules.opportunities.map((o, index) => (
        <FieldSet key={o.key} className="min-w-0">
          <FieldLegend>{o.key}</FieldLegend>
          <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
            {(["promisor", "recipient"] as const).map((field) => (
              <Field key={field}>
                <FieldLabel htmlFor={`${id}-${o.key}-${field}`}>
                  {field === "promisor" ? "Promisor" : "Recipient"}
                </FieldLabel>
                <OptionSelect
                  id={`${id}-${o.key}-${field}`}
                  label={`${o.key} ${field}`}
                  value={o[field]}
                  options={profiles.map((p) => ({
                    value: p.key,
                    label: p.name,
                  }))}
                  onValueChange={(value) => patch(index, { [field]: value })}
                />
              </Field>
            ))}
            <Field>
              <FieldLabel htmlFor={`${id}-${o.key}-artifact`}>
                Entrusted artifact
              </FieldLabel>
              <OptionSelect
                id={`${id}-${o.key}-artifact`}
                label={`${o.key} entrusted artifact`}
                value={o.artifact}
                options={artifacts.objects.map((obj) => ({
                  value: obj.key,
                  label: `${obj.name} · ${obj.key}`,
                }))}
                onValueChange={(artifact) => patch(index, { artifact })}
              />
              <FieldDescription>
                Must be recipient-owned and initially unreadable by the
                promisor. Review checks the actual ACLs below.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-${o.key}-alternative`}>
                Promised alternative
              </FieldLabel>
              <OptionSelect
                id={`${id}-${o.key}-alternative`}
                label={`${o.key} promised alternative`}
                value={o.alternative}
                options={coordination.alternatives.map((value) => ({
                  value,
                  label: value,
                }))}
                onValueChange={(alternative) => patch(index, { alternative })}
              />
            </Field>
            {(
              [
                ["opens_at", "Opening (logical ticks)", "opening", 0, 1200],
                ["deadline", "Deadline (logical ticks)", "deadline", 1, 1200],
                [
                  "fulfilled_value",
                  "Recipient effect when fulfilled",
                  "fulfilled effect",
                  -100,
                  100,
                ],
                [
                  "unfulfilled_value",
                  "Recipient effect otherwise",
                  "unfulfilled effect",
                  -100,
                  100,
                ],
              ] as const
            ).map(([field, title, accessible, min, max]) => (
              <Field key={field}>
                <FieldLabel htmlFor={`${id}-${o.key}-${field}`}>
                  {title}
                </FieldLabel>
                <Input
                  id={`${id}-${o.key}-${field}`}
                  aria-label={`${o.key} ${accessible}`}
                  type="number"
                  min={min}
                  max={max}
                  step={1}
                  value={o[field]}
                  onChange={(e) =>
                    patch(index, { [field]: Number(e.target.value) })
                  }
                />
              </Field>
            ))}
          </FieldGroup>
        </FieldSet>
      ))}
      <CommitmentAssumptions rules={rules} />
    </FieldSet>
  );
}
