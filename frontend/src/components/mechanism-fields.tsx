import { ArtifactFields } from "@/components/artifact-fields";
import { CommitmentFields } from "@/components/commitment-fields";
import { CompositionFields } from "@/components/composition-fields";
import { DistributedFields } from "@/components/distributed-fields";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { EnvironmentId, Parameters, Profile } from "@/lib/types";

interface NumericField {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}
interface ToggleField {
  key: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function mechanismFields(
  environment: EnvironmentId,
  parameters: Parameters,
  onChange: (patch: Partial<Parameters>) => void,
): { numbers: NumericField[]; toggles: ToggleField[] } {
  switch (environment) {
    case "institution": {
      const rules = parameters.institution;
      return {
        numbers: [
          {
            key: "oversight",
            label: "Oversight probability",
            value: rules.oversight,
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (value) =>
              onChange({ institution: { ...rules, oversight: value } }),
          },
          {
            key: "sanction_cap",
            label: "Maximum sanction",
            value: rules.sanction_cap,
            min: 0,
            max: 20,
            step: 1,
            onChange: (value) =>
              onChange({ institution: { ...rules, sanction_cap: value } }),
          },
        ],
        toggles: [
          {
            key: "transparent",
            label: "Public sanction records",
            value: rules.transparent,
            onChange: (value) =>
              onChange({ institution: { ...rules, transparent: value } }),
          },
          {
            key: "appeal",
            label: "Allow appeals",
            value: rules.appeal,
            onChange: (value) =>
              onChange({ institution: { ...rules, appeal: value } }),
          },
        ],
      };
    }
    case "bargaining": {
      const rules = parameters.bargaining;
      return {
        numbers: [
          {
            key: "discount",
            label: "Surplus retained each round",
            value: rules.discount,
            min: 0.1,
            max: 1,
            step: 0.05,
            onChange: (value) =>
              onChange({ bargaining: { ...rules, discount: value } }),
          },
          {
            key: "outside_option",
            label: "Exit payoff per agent",
            value: rules.outside_option,
            min: 0,
            max: 50,
            step: 1,
            onChange: (value) =>
              onChange({ bargaining: { ...rules, outside_option: value } }),
          },
        ],
        toggles: [],
      };
    }
    case "information": {
      const rules = parameters.information;
      return {
        numbers: [
          {
            key: "accuracy",
            label: "Private evidence accuracy",
            value: rules.accuracy,
            min: 0.5,
            max: 1,
            step: 0.05,
            onChange: (value) =>
              onChange({ information: { ...rules, accuracy: value } }),
          },
          {
            key: "correct_reward",
            label: "Correct choice reward",
            value: rules.correct_reward,
            min: 1,
            max: 100,
            step: 1,
            onChange: (value) =>
              onChange({ information: { ...rules, correct_reward: value } }),
          },
        ],
        toggles: [
          {
            key: "reveal_outcome",
            label: "Reveal outcomes after each round",
            value: rules.reveal_outcome,
            onChange: (value) =>
              onChange({ information: { ...rules, reveal_outcome: value } }),
          },
        ],
      };
    }
    case "renewable_resource": {
      const rules = parameters.resource;
      return {
        numbers: [
          {
            key: "capacity",
            label: "Carrying capacity",
            value: rules.capacity,
            min: 2,
            max: 500,
            step: 1,
            onChange: (value) =>
              onChange({ resource: { ...rules, capacity: value } }),
          },
          {
            key: "regeneration",
            label: "Regeneration rate",
            value: rules.regeneration,
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (value) =>
              onChange({ resource: { ...rules, regeneration: value } }),
          },
          {
            key: "extraction_limit",
            label: "Extraction limit per agent",
            value: rules.extraction_limit,
            min: 1,
            max: 100,
            step: 1,
            onChange: (value) =>
              onChange({ resource: { ...rules, extraction_limit: value } }),
          },
        ],
        toggles: [],
      };
    }
    default:
      return { numbers: [], toggles: [] };
  }
}

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
  const config = mechanismFields(environment, parameters, onChange);
  if (
    [
      "artifact_workspace",
      "distributed_coordination",
      "reliance_commitments",
    ].includes(environment) &&
    parameters.artifacts
  ) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {["distributed_coordination", "reliance_commitments"].includes(
          environment,
        ) &&
          parameters.coordination && (
            <DistributedFields
              rules={parameters.coordination}
              profiles={profiles}
              id={id}
              onChange={(coordination) => onChange({ coordination })}
            />
          )}
        {parameters.commitments && parameters.coordination && (
          <CommitmentFields
            rules={parameters.commitments}
            coordination={parameters.coordination}
            artifacts={parameters.artifacts}
            profiles={profiles}
            id={id}
            onChange={(commitments) => onChange({ commitments })}
          />
        )}
        <ArtifactFields
          rules={parameters.artifacts}
          profiles={profiles}
          id={id}
          onChange={(artifacts) => onChange({ artifacts })}
        />
      </div>
    );
  }
  if (environment === "composed" && parameters.composition) {
    return (
      <CompositionFields
        rules={parameters.composition}
        profiles={profiles}
        id={id}
        onChange={(composition) => onChange({ composition })}
      />
    );
  }
  if (!config.numbers.length && !config.toggles.length) return null;
  return (
    <FieldGroup className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
      {config.numbers.map(({ key, label, value, min, max, step, onChange }) => (
        <Field key={key}>
          <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
          <Input
            id={`${id}-${key}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </Field>
      ))}
      {environment === "renewable_resource" && (
        <Field>
          <FieldLabel htmlFor={`${id}-initial-stock`}>Initial stock</FieldLabel>
          <Input
            id={`${id}-initial-stock`}
            type="number"
            min={1}
            max={parameters.resource.capacity}
            placeholder="Full capacity"
            value={parameters.resource.initial_stock ?? ""}
            onChange={(e) =>
              onChange({
                resource: {
                  ...parameters.resource,
                  initial_stock:
                    e.target.value === "" ? null : Number(e.target.value),
                },
              })
            }
          />
        </Field>
      )}
      {config.toggles.map(({ key, label, value, onChange }) => (
        <Field
          key={key}
          className="flex-row items-center gap-3"
          orientation="horizontal"
        >
          <Checkbox
            id={`${id}-${key}`}
            checked={value}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
        </Field>
      ))}
      {environment === "institution" && (
        <FieldSet className="col-span-full flex flex-wrap gap-4">
          <FieldLegend>Authorities</FieldLegend>
          {profiles.map((profile) => (
            <FieldLabel
              key={profile.key}
              htmlFor={`${id}-${profile.key}-authority`}
            >
              <Checkbox
                id={`${id}-${profile.key}-authority`}
                checked={parameters.institution.authorities.includes(
                  profile.key,
                )}
                onCheckedChange={(checked) =>
                  onChange({
                    institution: {
                      ...parameters.institution,
                      authorities:
                        checked === true
                          ? [...parameters.institution.authorities, profile.key]
                          : parameters.institution.authorities.filter(
                              (key) => key !== profile.key,
                            ),
                    },
                  })
                }
              />
              {profile.name}
            </FieldLabel>
          ))}
        </FieldSet>
      )}
    </FieldGroup>
  );
}
