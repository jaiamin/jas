import { Field, FieldGroup, FieldLabel, Input } from "@/components/ui/input";
import type { EnvironmentId, Parameters, Profile } from "@/lib/types";

const groups = {
  institution: {
    key: "institution",
    numbers: [
      ["oversight", "Oversight probability", 0, 1, 0.1],
      ["sanction_cap", "Maximum sanction", 0, 20, 1],
    ],
    toggles: [
      ["transparent", "Public sanction records"],
      ["appeal", "Allow appeals"],
    ],
  },
  bargaining: {
    key: "bargaining",
    numbers: [
      ["discount", "Surplus retained each round", 0.1, 1, 0.05],
      ["outside_option", "Exit payoff per agent", 0, 50, 1],
    ],
    toggles: [],
  },
  information: {
    key: "information",
    numbers: [
      ["accuracy", "Private evidence accuracy", 0.5, 1, 0.05],
      ["correct_reward", "Correct choice reward", 1, 100, 1],
    ],
    toggles: [["reveal_outcome", "Reveal outcomes after each round"]],
  },
  renewable_resource: {
    key: "resource",
    numbers: [
      ["capacity", "Carrying capacity", 2, 500, 1],
      ["regeneration", "Regeneration rate", 0, 1, 0.05],
      ["extraction_limit", "Extraction limit per agent", 1, 100, 1],
    ],
    toggles: [],
  },
} as const;

export function MechanismFields({
  environment,
  parameters,
  profiles,
  id,
  onChange,
}: {
  environment: EnvironmentId;
  parameters: Parameters;
  profiles: Profile[];
  id: string;
  onChange: (patch: Partial<Parameters>) => void;
}) {
  if (!(environment in groups)) return null;
  const config = groups[environment as keyof typeof groups];
  const values = parameters[config.key];
  const change = (key: string, value: number | boolean | string[]) =>
    onChange({ [config.key]: { ...values, [key]: value } });
  return (
    <FieldGroup className="condition-fields mechanism-fields">
      {config.numbers.map(([key, label, min, max, step]) => (
        <Field key={key}>
          <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
          <Input
            id={`${id}-${key}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(values[key as keyof typeof values])}
            onChange={(e) => change(key, Number(e.target.value))}
          />
        </Field>
      ))}
      {config.toggles.map(([key, label]) => (
        <Field key={key} className="mechanism-toggle">
          <input
            id={`${id}-${key}`}
            type="checkbox"
            checked={Boolean(values[key as keyof typeof values])}
            onChange={(e) => change(key, e.target.checked)}
          />
          <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
        </Field>
      ))}
      {environment === "institution" && (
        <fieldset className="agent-permissions">
          <legend>Authorities</legend>
          {profiles.map((profile) => (
            <label key={profile.key}>
              <input
                type="checkbox"
                checked={parameters.institution.authorities.includes(
                  profile.key,
                )}
                onChange={(e) =>
                  change(
                    "authorities",
                    e.target.checked
                      ? [...parameters.institution.authorities, profile.key]
                      : parameters.institution.authorities.filter(
                          (key) => key !== profile.key,
                        ),
                  )
                }
              />
              {profile.name}
            </label>
          ))}
        </fieldset>
      )}
    </FieldGroup>
  );
}
