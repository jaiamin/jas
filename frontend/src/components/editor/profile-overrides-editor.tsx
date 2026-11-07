import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
    <Disclosure className="disclosure">
      <DisclosureTrigger>
        Roles & goals for this condition
        {overrides.length > 0 && ` · ${overrides.length} modified`}
      </DisclosureTrigger>
      <DisclosureContent>
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
              <Field key={base.key}>
                <FieldLabel htmlFor={`${id}-${base.key}-goal`}>
                  {base.name}
                </FieldLabel>
                <Input
                  aria-label={`${name} role for ${base.name}`}
                  value={resolved.role}
                  onChange={(e) => updateOverride({ role: e.target.value })}
                  maxLength={80}
                />
                <Textarea
                  id={`${id}-${base.key}-goal`}
                  value={resolved.goal}
                  onChange={(e) => updateOverride({ goal: e.target.value })}
                  maxLength={2000}
                  rows={2}
                />
                {overrides.some((p) => p.key === base.key) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange(overrides.filter((p) => p.key !== base.key))
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
  );
}
