import { OptionSelect as Select } from "@/components/option-select";
import { Button } from "@/components/ui/button";
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
import { newResource } from "@/lib/design";
import type { CompositionRules, Profile, ResourcePrimitive } from "@/lib/types";

const numbers = [
  ["capacity", "Capacity", 1, 500, 1],
  ["initial_stock", "Initial stock", 0, 500, 1],
  ["replenishment", "Replenishment per round", 0, 100, 1],
  ["action_limit", "Units per action", 1, 100, 1],
  ["need", "Need per agent per round", 0, 20, 1],
  ["consumption_value", "Utility per consumed unit", 0, 20, 0.5],
  ["shortfall_penalty", "Penalty per unmet unit", 0, 20, 0.5],
  ["terminal_value", "Terminal inventory value", 0, 20, 0.5],
] as const;

export function CompositionFields({
  rules,
  profiles,
  id,
  onChange,
}: {
  rules: CompositionRules;
  profiles: Profile[];
  id: string;
  onChange: (rules: CompositionRules) => void;
}) {
  const patch = (index: number, update: Partial<ResourcePrimitive>) =>
    onChange({
      ...rules,
      resources: rules.resources.map((r, i) =>
        i === index ? { ...r, ...update } : r,
      ),
    });
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h3 className="text-sm font-medium">Resource mechanics</h3>
          <p className="text-muted-foreground">
            One action per agent per round. Needs consume inventory after
            everyone acts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={rules.resources.length >= 4}
          onClick={() => {
            let index = rules.resources.length + 1;
            while (rules.resources.some((r) => r.key === `resource-${index}`))
              index++;
            onChange({
              ...rules,
              resources: [...rules.resources, newResource(index)],
            });
          }}
        >
          Add resource
        </Button>
      </div>
      <Field orientation="horizontal" className="flex-row items-center gap-3">
        <Checkbox
          id={`${id}-priority`}
          checked={rules.controllers_first}
          onCheckedChange={(value) =>
            onChange({ ...rules, controllers_first: value === true })
          }
        />
        <FieldLabel htmlFor={`${id}-priority`}>
          Controllers act first
        </FieldLabel>
      </Field>
      {rules.resources.map((r, index) => (
        <FieldSet
          aria-label="Resource"
          key={r.key}
          className="flex min-w-0 flex-col gap-4"
        >
          <FieldLegend>{r.name || `Resource ${index + 1}`}</FieldLegend>
          <FieldGroup className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${id}-${index}-name`}>
                Resource name
              </FieldLabel>
              <Input
                id={`${id}-${index}-name`}
                value={r.name}
                maxLength={60}
                onChange={(e) => patch(index, { name: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-${index}-key`}>
                Resource key
              </FieldLabel>
              <Input
                id={`${id}-${index}-key`}
                defaultValue={r.key}
                maxLength={24}
                onBlur={(e) => patch(index, { key: e.target.value })}
              />
            </Field>
            {numbers.map(([key, title, min, max, step]) => (
              <Field key={key}>
                <FieldLabel htmlFor={`${id}-${index}-${key}`}>
                  {title}
                </FieldLabel>
                <Input
                  id={`${id}-${index}-${key}`}
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={r[key]}
                  onChange={(e) =>
                    patch(index, { [key]: Number(e.target.value) })
                  }
                />
              </Field>
            ))}
            <Field>
              <FieldLabel htmlFor={`${id}-${index}-stock`}>
                Stock visibility
              </FieldLabel>
              <Select
                label="Stock visibility"
                value={r.stock_visibility}
                options={[
                  { value: "public", label: "Everyone" },
                  { value: "controllers", label: "Controllers only" },
                ]}
                onValueChange={(value) =>
                  patch(index, {
                    stock_visibility:
                      value as ResourcePrimitive["stock_visibility"],
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-${index}-allocation`}>
                Allocation visibility
              </FieldLabel>
              <Select
                label="Allocation visibility"
                value={r.allocation_visibility}
                options={[
                  { value: "public", label: "Public receipts & inventories" },
                  { value: "parties", label: "Parties only" },
                ]}
                onValueChange={(value) =>
                  patch(index, {
                    allocation_visibility:
                      value as ResourcePrimitive["allocation_visibility"],
                  })
                }
              />
            </Field>
          </FieldGroup>
          <FieldSet className="col-span-full flex flex-wrap gap-4">
            <FieldLegend>Allocation controllers</FieldLegend>
            <p className="text-muted-foreground">
              With none selected, everyone may extract. Controllers may allocate
              to one agent or split a total equally.
            </p>
            {profiles.map((profile) => (
              <FieldLabel
                key={profile.key}
                htmlFor={`${id}-${index}-${profile.key}`}
              >
                <Checkbox
                  id={`${id}-${index}-${profile.key}`}
                  checked={r.controllers.includes(profile.key)}
                  onCheckedChange={(checked) =>
                    patch(index, {
                      controllers:
                        checked === true
                          ? [...r.controllers, profile.key]
                          : r.controllers.filter((key) => key !== profile.key),
                    })
                  }
                />
                {profile.name}
              </FieldLabel>
            ))}
          </FieldSet>
          <Field
            orientation="horizontal"
            className="flex-row items-center gap-3"
          >
            <Checkbox
              id={`${id}-${index}-transfers`}
              checked={r.transfers}
              onCheckedChange={(value) =>
                patch(index, { transfers: value === true })
              }
            />
            <FieldLabel htmlFor={`${id}-${index}-transfers`}>
              Allow personal inventory transfers
            </FieldLabel>
          </Field>
          <FieldDescription>
            Private records still allow inference from receipts and messages.
            Public allocation visibility also reveals current inventories.
          </FieldDescription>
          <Button
            variant="ghost"
            size="sm"
            disabled={rules.resources.length === 1}
            onClick={() =>
              onChange({
                ...rules,
                resources: rules.resources.filter((_, i) => i !== index),
              })
            }
          >
            Remove resource
          </Button>
        </FieldSet>
      ))}
    </section>
  );
}
