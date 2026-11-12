import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { label } from "@/lib/format";
import type { AnalysisPlan, Design, PlannedOutcome } from "@/lib/types";

export function AnalysisPlanFields({
  design,
  metrics,
  onChange,
}: {
  design: Design;
  metrics: string[];
  onChange: (design: Design) => void;
}) {
  const plan = design.analysis_plan;
  function update(value: AnalysisPlan | null) {
    onChange({ ...design, analysis_plan: value });
  }
  function outcome(index: number, value: PlannedOutcome) {
    if (plan)
      update({
        ...plan,
        outcomes: plan.outcomes.map((o, i) => (i === index ? value : o)),
      });
  }
  if (!plan)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Prose remains a research intention. Declare calculations to produce
          results automatically; label unsupported interpretations as manual.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            update({
              version: 1,
              intent: "exploratory",
              target: "This protocol and its declared scenarios only.",
              sampling_unit: "trajectory",
              allocation:
                "Fixed matched condition × seed × repetition matrix; no random allocation.",
              exclusions: "retain_all",
              uncertainty: "descriptive",
              outcomes: [
                {
                  key: "decisions",
                  calculation: "turn_count",
                  metric: null,
                  manual_reason: "",
                },
              ],
            })
          }
        >
          Declare analysis plan
        </Button>
      </div>
    );
  const calculations: PlannedOutcome["calculation"][] = [
    "metric",
    "turn_count",
    "request_count",
    "cost_usd",
    "message_count",
    ...(design.environment === "distributed_coordination"
      ? (["wait_count", "coordination_regret"] as const)
      : []),
    "manual",
  ];
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="analysis-intent">Research intent</FieldLabel>
        <OptionSelect
          id="analysis-intent"
          label="Research intent"
          value={plan.intent}
          options={[
            { value: "exploratory", label: "Exploratory" },
            { value: "confirmatory", label: "Confirmatory" },
          ]}
          onValueChange={(intent) => update({ ...plan, intent })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="analysis-target">
          Target of the conclusion
        </FieldLabel>
        <Textarea
          id="analysis-target"
          value={plan.target}
          maxLength={600}
          onChange={(e) => update({ ...plan, target: e.target.value })}
        />
        <FieldDescription>
          Describe the tasks, models and settings the result concerns. More
          decisions do not create independent samples.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="analysis-unit">Declared sampling unit</FieldLabel>
        <OptionSelect
          id="analysis-unit"
          label="Declared sampling unit"
          value={plan.sampling_unit}
          options={[
            { value: "trajectory", label: "Whole team trajectory" },
            { value: "scenario", label: "Explicit scenario" },
          ]}
          onValueChange={(sampling_unit) => update({ ...plan, sampling_unit })}
        />
        <FieldDescription>
          This declaration does not establish statistical independence. Matching
          remains seed × repetition.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="analysis-allocation">
          Sampling and allocation procedure
        </FieldLabel>
        <Textarea
          id="analysis-allocation"
          value={plan.allocation}
          maxLength={600}
          onChange={(e) => update({ ...plan, allocation: e.target.value })}
        />
      </Field>
      {plan.outcomes.map((o, index) => (
        <FieldGroup key={o.key} className="rounded-lg border p-4">
          <Field>
            <FieldLabel htmlFor={`outcome-${index}`}>
              Outcome {index + 1} identifier
            </FieldLabel>
            <Input
              id={`outcome-${index}`}
              defaultValue={o.key}
              maxLength={32}
              onBlur={(e) => outcome(index, { ...o, key: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`calculation-${index}`}>
              Calculation
            </FieldLabel>
            <OptionSelect
              id={`calculation-${index}`}
              label={`Outcome ${index + 1} calculation`}
              value={o.calculation}
              options={calculations.map((value) => ({
                value,
                label: label(value),
              }))}
              onValueChange={(calculation) =>
                outcome(index, {
                  ...o,
                  calculation,
                  metric:
                    calculation === "metric" ? (metrics[0] ?? null) : null,
                  manual_reason:
                    calculation === "manual" ? o.manual_reason : "",
                })
              }
            />
          </Field>
          {o.calculation === "metric" && (
            <Field>
              <FieldLabel htmlFor={`metric-${index}`}>
                Registered metric
              </FieldLabel>
              <OptionSelect
                id={`metric-${index}`}
                label={`Outcome ${index + 1} metric`}
                value={o.metric ?? ""}
                options={metrics.map((value) => ({
                  value,
                  label: label(value),
                }))}
                onValueChange={(metric) => outcome(index, { ...o, metric })}
              />
            </Field>
          )}
          {o.calculation === "manual" && (
            <Field>
              <FieldLabel htmlFor={`manual-${index}`}>
                Manual coding or assessment procedure
              </FieldLabel>
              <Textarea
                id={`manual-${index}`}
                value={o.manual_reason}
                maxLength={400}
                onChange={(e) =>
                  outcome(index, { ...o, manual_reason: e.target.value })
                }
              />
              <FieldDescription>
                Shown as uncomputed until independently assessed. Prose is not
                certified by numerical checks.
              </FieldDescription>
            </Field>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={plan.outcomes.length === 1}
            onClick={() =>
              update({
                ...plan,
                outcomes: plan.outcomes.filter((_, i) => i !== index),
              })
            }
          >
            Remove outcome {index + 1}
          </Button>
        </FieldGroup>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={plan.outcomes.length >= 12}
          onClick={() =>
            update({
              ...plan,
              outcomes: [
                ...plan.outcomes,
                {
                  key: `outcome_${plan.outcomes.length + 1}`,
                  calculation: "turn_count",
                  metric: null,
                  manual_reason: "",
                },
              ],
            })
          }
        >
          Add outcome
        </Button>
        <Button type="button" variant="ghost" onClick={() => update(null)}>
          Remove analysis plan
        </Button>
      </div>
      <FieldDescription>
        All planned runs stay in the denominator. Means use eligible terminal
        outcomes; missingness stays visible. Confidence intervals are withheld.
        Saving pins the plan to a new immutable revision and never runs models.
      </FieldDescription>
    </FieldGroup>
  );
}
