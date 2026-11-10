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
import type { Catalog, Design, EnvironmentId } from "@/lib/types";

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
  const environment = catalog.environments.find(
    (item) => item.key === design.environment,
  );
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
          onChange={(event) => update("title", event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="question">Research question</FieldLabel>
        <Textarea
          id="question"
          rows={3}
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
            if (value !== design.environment) onEnvironmentChange(value);
          }}
          options={catalog.environments.map((item) => ({
            value: item.key,
            label: item.name,
          }))}
        />
        <FieldDescription>{environment?.description}</FieldDescription>
      </Field>
      <Disclosure>
        <DisclosureTrigger>Hypothesis and analysis plan</DisclosureTrigger>
        <DisclosureContent className="pt-4">
          <Field>
            <FieldLabel htmlFor="hypothesis">
              Hypothesis and analysis plan
            </FieldLabel>
            <Textarea
              id="hypothesis"
              placeholder="Exploratory questions and evidence to retain, or a hypothesis and comparison plan"
              rows={4}
              maxLength={2000}
              value={design.hypothesis}
              onChange={(event) => update("hypothesis", event.target.value)}
            />
            <FieldDescription>
              Exploration can describe trajectories without a primary scalar
              outcome. For confirmation, define outcomes and comparisons before
              trials. Agents do not receive this plan.
            </FieldDescription>
          </Field>
        </DisclosureContent>
      </Disclosure>
      <Disclosure>
        <DisclosureTrigger>Scenario context</DisclosureTrigger>
        <DisclosureContent className="pt-4">
          <Field>
            <FieldLabel htmlFor="context">
              Scenario context (optional)
            </FieldLabel>
            <Textarea
              id="context"
              rows={3}
              placeholder="Describe the setting. The environment defines the rules."
              value={design.context}
              onChange={(event) => update("context", event.target.value)}
            />
          </Field>
        </DisclosureContent>
      </Disclosure>
    </FieldGroup>
  );
}
