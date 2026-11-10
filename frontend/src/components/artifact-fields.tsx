import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
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
import type { ArtifactObject, ArtifactRules, Profile } from "@/lib/types";

export function ArtifactFields({
  rules,
  profiles,
  id,
  onChange,
}: {
  rules: ArtifactRules;
  profiles: Profile[];
  id: string;
  onChange: (rules: ArtifactRules) => void;
}) {
  const patch = (index: number, update: Partial<ArtifactObject>) =>
    onChange({
      ...rules,
      objects: rules.objects.map((obj, i) =>
        i === index ? { ...obj, ...update } : obj,
      ),
    });
  return (
    <FieldSet className="min-w-0">
      <FieldLegend>Artifact mechanics</FieldLegend>
      <FieldDescription>
        Evidence is immutable. Accepted edits create a version and consume one
        write. Submission checks content and source references. Role
        descriptions grant no access. The protocol JSON editor also supports
        adding objects, fields and requirements.
      </FieldDescription>
      <Field>
        <FieldLabel htmlFor={`${id}-writes`}>
          Maximum artifact writes
        </FieldLabel>
        <Input
          id={`${id}-writes`}
          type="number"
          min={1}
          max={100}
          value={rules.write_limit}
          onChange={(event) =>
            onChange({ ...rules, write_limit: Number(event.target.value) })
          }
        />
      </Field>
      {rules.objects.map((obj, index) => (
        <Disclosure key={obj.key} defaultOpen={index === 0}>
          <DisclosureTrigger>
            {obj.name} · {obj.key}
          </DisclosureTrigger>
          <DisclosureContent className="pt-3">
            <FieldGroup className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-${obj.key}-name`}>
                  Artifact name
                </FieldLabel>
                <Input
                  id={`${id}-${obj.key}-name`}
                  value={obj.name}
                  maxLength={60}
                  onChange={(event) =>
                    patch(index, { name: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-${obj.key}-owner`}>
                  Owner
                </FieldLabel>
                <OptionSelect
                  id={`${id}-${obj.key}-owner`}
                  label={`${obj.name} owner`}
                  value={obj.owner ?? "none"}
                  options={[
                    { value: "none", label: "No owner" },
                    ...profiles.map((p) => ({ value: p.key, label: p.name })),
                  ]}
                  onValueChange={(owner) =>
                    patch(index, { owner: owner === "none" ? null : owner })
                  }
                />
              </Field>
              {Object.entries(obj.content).map(([field, value]) => (
                <Field key={field}>
                  <FieldLabel htmlFor={`${id}-${obj.key}-${field}`}>
                    {obj.name} · {field}
                  </FieldLabel>
                  <Input
                    id={`${id}-${obj.key}-${field}`}
                    type={typeof value === "number" ? "number" : "text"}
                    step={typeof value === "number" ? 1 : undefined}
                    value={value}
                    maxLength={typeof value === "string" ? 1000 : undefined}
                    onChange={(event) =>
                      patch(index, {
                        content: {
                          ...obj.content,
                          [field]:
                            typeof value === "number"
                              ? Number(event.target.value)
                              : event.target.value,
                        },
                      })
                    }
                  />
                </Field>
              ))}
              <FieldSet className="sm:col-span-full">
                <FieldLegend>Additional access</FieldLegend>
                <FieldDescription>
                  The owner can read and write. Writers must also be readers. No
                  owner and no writers makes an object immutable.
                </FieldDescription>
                {profiles.map((profile) => (
                  <div
                    key={profile.key}
                    className="flex flex-wrap items-center gap-4"
                  >
                    <span className="text-sm">{profile.name}</span>
                    {(["readers", "writers"] as const).map((access) => (
                      <FieldLabel
                        key={access}
                        htmlFor={`${id}-${obj.key}-${profile.key}-${access}`}
                      >
                        <Checkbox
                          id={`${id}-${obj.key}-${profile.key}-${access}`}
                          checked={obj[access].includes(profile.key)}
                          onCheckedChange={(checked) =>
                            patch(index, {
                              readers:
                                access === "writers" && checked === true
                                  ? [...new Set([...obj.readers, profile.key])]
                                  : access === "readers"
                                    ? checked === true
                                      ? [...obj.readers, profile.key]
                                      : obj.readers.filter(
                                          (key) => key !== profile.key,
                                        )
                                    : obj.readers,
                              writers:
                                access === "readers" && checked !== true
                                  ? obj.writers.filter(
                                      (key) => key !== profile.key,
                                    )
                                  : access === "writers"
                                    ? checked === true
                                      ? [...obj.writers, profile.key]
                                      : obj.writers.filter(
                                          (key) => key !== profile.key,
                                        )
                                    : obj.writers,
                            })
                          }
                        />
                        {access === "readers" ? "Read" : "Write"}
                      </FieldLabel>
                    ))}
                  </div>
                ))}
              </FieldSet>
            </FieldGroup>
          </DisclosureContent>
        </Disclosure>
      ))}
      <FieldSet>
        <FieldLegend>Submission requirements</FieldLegend>
        <FieldDescription>
          Each work field must match the cited immutable evidence version 1.
        </FieldDescription>
        {rules.requirements.map((requirement, index) => (
          <FieldGroup
            key={`${requirement.artifact}-${requirement.field}`}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {(["artifact", "field", "source", "source_field"] as const).map(
              (key) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`${id}-requirement-${index}-${key}`}>
                    {
                      [
                        "Work object",
                        "Work field",
                        "Evidence object",
                        "Evidence field",
                      ][
                        ["artifact", "field", "source", "source_field"].indexOf(
                          key,
                        )
                      ]
                    }
                  </FieldLabel>
                  <Input
                    id={`${id}-requirement-${index}-${key}`}
                    defaultValue={requirement[key]}
                    maxLength={24}
                    onBlur={(event) =>
                      onChange({
                        ...rules,
                        requirements: rules.requirements.map((r, i) =>
                          i === index ? { ...r, [key]: event.target.value } : r,
                        ),
                      })
                    }
                  />
                </Field>
              ),
            )}
          </FieldGroup>
        ))}
      </FieldSet>
    </FieldSet>
  );
}
