import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/types";
export function ProfileOverridesEditor({
  id,
  name,
  profiles,
  overrides,
  onChange,
}: {
  id: string;
  name: string;
  profiles: Profile[];
  overrides: Profile[];
  onChange: (overrides: Profile[]) => void;
}) {
  return (
    <Disclosure className="min-w-0">
      <DisclosureTrigger>
        Roles and goals for this condition
        {overrides.length > 0 && ` · ${overrides.length} modified`}
      </DisclosureTrigger>
      <DisclosureContent className="pt-4">
        <FieldGroup>
          {profiles.map((base) => {
            const resolved = overrides.find((p) => p.key === base.key) ?? base;
            function updateOverride(changes: Partial<Profile>) {
              const edited = { ...resolved, ...changes };
              onChange([
                ...overrides.filter((p) => p.key !== base.key),
                edited,
              ]);
            }
            return (
              <FieldSet key={base.key}>
                <FieldLegend variant="label">{base.name}</FieldLegend>
                <Field>
                  <FieldLabel htmlFor={`${id}-${base.key}-role`}>
                    Role
                  </FieldLabel>
                  <Input
                    id={`${id}-${base.key}-role`}
                    aria-label={`${name} role for ${base.name}`}
                    value={resolved.role}
                    onChange={(e) => updateOverride({ role: e.target.value })}
                    maxLength={80}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-${base.key}-goal`}>
                    Private goal
                  </FieldLabel>
                  <Textarea
                    id={`${id}-${base.key}-goal`}
                    value={resolved.goal}
                    onChange={(e) => updateOverride({ goal: e.target.value })}
                    maxLength={2000}
                    rows={2}
                  />
                </Field>
                {overrides.some((p) => p.key === base.key) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      onChange(overrides.filter((p) => p.key !== base.key))
                    }
                  >
                    Use baseline profile
                  </Button>
                )}
              </FieldSet>
            );
          })}
        </FieldGroup>
      </DisclosureContent>
    </Disclosure>
  );
}
