import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Design } from "@/lib/types";

export function ScenarioFields({
  design,
  onChange,
}: {
  design: Design;
  onChange: (value: Design) => void;
}) {
  const rules = design.conditions[0]?.parameters.coordination;
  const artifacts = design.conditions[0]?.parameters.artifacts;
  if (design.environment !== "distributed_coordination" || !rules || !artifacts)
    return null;
  const scenarios = design.scenarios ?? [];
  const mismatch =
    scenarios.length > 0 &&
    (scenarios.length !== design.seeds.length ||
      scenarios.some((s) => !design.seeds.includes(s.seed)));
  return (
    <Disclosure>
      <DisclosureTrigger>Matched value scenarios</DisclosureTrigger>
      <DisclosureContent className="flex flex-col gap-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Seeds alone do not vary these fixed tables. Explicit cases replace the
          same local values in every condition. Rotating alternative labels
          counterbalances which option pays best; it does not sample a
          population of problems or rotate roles/order.
        </p>
        {mismatch && (
          <Alert>
            Seeds changed. Review or recreate scenarios so each seed has exactly
            one case before saving.
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!design.seeds.length}
            onClick={() =>
              onChange({
                ...design,
                scenarios: design.seeds.map((seed, index) => ({
                  version: 1,
                  seed,
                  name: `Value case ${index + 1}`,
                  values: Object.fromEntries(
                    Object.values(rules.information).map((key) => {
                      const table =
                        artifacts.objects.find((o) => o.key === key)?.content ??
                        {};
                      return [
                        key,
                        Object.fromEntries(
                          rules.alternatives.map((a, i) => [
                            a,
                            Number(
                              table[
                                rules.alternatives[
                                  (i + index) % rules.alternatives.length
                                ]
                              ],
                            ),
                          ]),
                        ),
                      ];
                    }),
                  ),
                })),
              })
            }
          >
            {scenarios.length
              ? "Recreate rotated scenarios"
              : "Create rotated scenarios"}
          </Button>
          {scenarios.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange({ ...design, scenarios: [] })}
            >
              Use fixed tables
            </Button>
          )}
        </div>
        {scenarios.map((scenario, index) => (
          <Disclosure key={scenario.seed}>
            <DisclosureTrigger>
              {scenario.name} · Seed {scenario.seed}
            </DisclosureTrigger>
            <DisclosureContent className="pt-4">
              <FieldGroup>
                {Object.entries(scenario.values).map(([artifact, values]) => (
                  <FieldGroup
                    key={artifact}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                  >
                    {Object.entries(values).map(([alternative, value]) => (
                      <Field key={alternative}>
                        <FieldLabel
                          htmlFor={`scenario-${index}-${artifact}-${alternative}`}
                        >
                          {artifact} · {alternative}
                        </FieldLabel>
                        <Input
                          id={`scenario-${index}-${artifact}-${alternative}`}
                          type="number"
                          min={-100}
                          max={100}
                          step={1}
                          value={value}
                          onChange={(e) =>
                            onChange({
                              ...design,
                              scenarios: scenarios.map((s, i) =>
                                i === index
                                  ? {
                                      ...s,
                                      values: {
                                        ...s.values,
                                        [artifact]: {
                                          ...values,
                                          [alternative]: Number(e.target.value),
                                        },
                                      },
                                    }
                                  : s,
                              ),
                            })
                          }
                        />
                      </Field>
                    ))}
                  </FieldGroup>
                ))}
                <FieldDescription>
                  Immutable local integer payoffs only. Permissions, treatment,
                  models and match bonus retain their declared settings.
                </FieldDescription>
              </FieldGroup>
            </DisclosureContent>
          </Disclosure>
        ))}
      </DisclosureContent>
    </Disclosure>
  );
}
