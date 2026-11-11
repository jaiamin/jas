import { useState } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { label } from "@/lib/format";
import type { Design, SavedEnvironment } from "@/lib/types";

export function EnvironmentExamples({
  design,
  source,
  disabled,
  onApply,
}: {
  design: Design;
  source: SavedEnvironment;
  disabled: boolean;
  onApply: (example: string, bindings: Record<string, string>) => void;
}) {
  const examples = source.definition.examples;
  const [selected, setSelected] = useState(examples[0].key);
  const example = examples.find((item) => item.key === selected) ?? examples[0];
  function initialBindings(roles: string[]) {
    return Object.fromEntries(
      roles.map((role, index) => [role, design.profiles[index]?.key ?? ""]),
    );
  }
  const [bindings, setBindings] = useState(() =>
    initialBindings(example.roles),
  );
  return (
    <Disclosure>
      <DisclosureTrigger>Configuration examples</DisclosureTrigger>
      <DisclosureContent className="pt-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="environment-example">
              Configuration example
            </FieldLabel>
            <OptionSelect
              id="environment-example"
              label="Configuration example"
              value={selected}
              disabled={disabled}
              options={examples.map((item) => ({
                value: item.key,
                label: item.name,
              }))}
              onValueChange={(key) => {
                setSelected(key);
                setBindings(
                  initialBindings(
                    examples.find((item) => item.key === key)?.roles ?? [],
                  ),
                );
              }}
            />
            <FieldDescription>
              Apply mechanics to the current conditions. Your question, agents
              and run plan stay in place.
            </FieldDescription>
          </Field>
          {example.roles.map((role) => (
            <Field key={role}>
              <FieldLabel htmlFor={`binding-${role}`}>
                Participant for {label(role)}
              </FieldLabel>
              <OptionSelect
                id={`binding-${role}`}
                label={`Participant for ${label(role)}`}
                disabled={disabled}
                value={bindings[role] ?? ""}
                options={design.profiles.map((profile) => ({
                  value: profile.key,
                  label: profile.name,
                }))}
                onValueChange={(key) =>
                  setBindings((current) => ({ ...current, [role]: key }))
                }
              />
            </Field>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onApply(example.key, bindings)}
            >
              Apply configuration
            </Button>
          </div>
        </FieldGroup>
      </DisclosureContent>
    </Disclosure>
  );
}
