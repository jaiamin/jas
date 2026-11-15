import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { OptionSelect } from "@/components/option-select";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { environmentSummary } from "@/lib/environments";
import type { Catalog, Design, EnvironmentId } from "@/lib/types";
import { AnalysisPlanFields } from "./analysis-plan-fields";

export function QuestionFields({
  design,
  catalog,
  onChange,
  onEnvironmentChange,
  disabled,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
  onEnvironmentChange: (value: EnvironmentId) => void;
  disabled: boolean;
}) {
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    onChange({ ...design, [key]: value });
  }
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="title">Experiment name</FieldLabel>
        <Input
          id="title"
          value={design.title}
          maxLength={100}
          required
          onChange={(event) => update("title", event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="question">Question</FieldLabel>
        <Textarea
          id="question"
          rows={1}
          className="min-h-8 max-h-32 resize-none py-1.5"
          required
          value={design.question}
          maxLength={4000}
          onChange={(event) => update("question", event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="environment">Environment</FieldLabel>
        <OptionSelect
          id="environment"
          label="Environment"
          value={design.environment}
          disabled={disabled}
          onValueChange={(value) => {
            if (value === design.environment) return;
            // Finish Enter activation before the dialog receives focus.
            requestAnimationFrame(() => onEnvironmentChange(value));
          }}
          options={[
            ...catalog.environments,
            ...(design.environment === "sealed_relay" &&
            !catalog.environments.some(
              (item) => item.key === design.environment,
            )
              ? [
                  {
                    key: "sealed_relay" as const,
                    name: "Pinned admitted sealed relay",
                  },
                ]
              : []),
          ].map((item) => ({
            value: item.key,
            label: item.name,
            description:
              "description" in item
                ? environmentSummary(item)
                : "Explore a bounded relay with explicit permissions.",
          }))}
        />
      </Field>
    </FieldGroup>
  );
}

export function ResearchFields({
  design,
  catalog,
  onChange,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
}) {
  const environment = catalog.environments.find(
    (item) => item.key === design.environment,
  );
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="hypothesis">Hypothesis</FieldLabel>
        <Textarea
          id="hypothesis"
          rows={3}
          maxLength={2000}
          value={design.hypothesis}
          onChange={(event) =>
            onChange({ ...design, hypothesis: event.target.value })
          }
        />
        <FieldDescription>
          Private research notes; agents do not see these.
        </FieldDescription>
      </Field>
      <Disclosure>
        <DisclosureTrigger>Analysis plan</DisclosureTrigger>
        <DisclosureContent className="pt-4">
          <AnalysisPlanFields
            design={design}
            metrics={environment?.measures ?? []}
            onChange={onChange}
          />
        </DisclosureContent>
      </Disclosure>
      <Field>
        <FieldLabel htmlFor="context">Scenario context</FieldLabel>
        <Textarea
          id="context"
          rows={3}
          value={design.context}
          onChange={(event) =>
            onChange({ ...design, context: event.target.value })
          }
        />
        <FieldDescription>Setting shared with agents.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}
