import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { OptionSelect as Select } from "@/components/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { label } from "@/lib/format";
import type { Catalog, Design } from "@/lib/types";
import { ScenarioFields } from "./scenario-fields";

export function ExecutionFields({
  design,
  catalog,
  onChange,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
}) {
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    onChange({ ...design, [key]: value });
  }
  const environment = catalog.environments.find(
    (item) => item.key === design.environment,
  );
  const invalidSeeds = design.seeds.length === 0;
  return (
    <FieldGroup>
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rounds">Rounds per run</FieldLabel>
          <Input
            id="rounds"
            type="number"
            min={1}
            max={100}
            value={design.rounds}
            onChange={(event) => update("rounds", Number(event.target.value))}
          />
          <FieldDescription>
            Up to {design.profiles.length} agent decisions per round.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="repetitions">Repetitions per seed</FieldLabel>
          <Input
            id="repetitions"
            type="number"
            min={1}
            max={10}
            value={design.repetitions}
            onChange={(event) =>
              update("repetitions", Number(event.target.value))
            }
          />
        </Field>
      </FieldGroup>
      <Field data-invalid={invalidSeeds || undefined}>
        <FieldLabel htmlFor="seeds">Matched seeds</FieldLabel>
        <Input
          id="seeds"
          defaultValue={design.seeds.join(", ")}
          aria-invalid={invalidSeeds || undefined}
          aria-describedby={invalidSeeds ? "seeds-error" : "seeds-description"}
          onBlur={(event) => {
            const parts = event.target.value
              .split(",")
              .map((value) =>
                value.trim() === "" ? Number.NaN : Number(value.trim()),
              );
            update(
              "seeds",
              parts.some((value) => !Number.isInteger(value) || value < 0)
                ? []
                : parts,
            );
          }}
        />
        {invalidSeeds ? (
          <FieldError id="seeds-error">
            Seeds must be nonnegative integers, separated by commas.
          </FieldError>
        ) : (
          <FieldDescription id="seeds-description">
            Use commas to separate seeds. Every condition uses the same seeds
            for matched comparisons.
          </FieldDescription>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="budget">Spending ceiling, USD</FieldLabel>
        <Input
          id="budget"
          type="number"
          min={0.05}
          max={25}
          step={0.5}
          value={design.budget_usd}
          onChange={(event) => update("budget_usd", Number(event.target.value))}
        />
        <FieldDescription>
          Total limit across all runs. Saving this experiment does not spend
          anything.
        </FieldDescription>
      </Field>
      <Separator />
      <ScenarioFields design={design} onChange={onChange} />
      <FieldSet>
        <FieldLegend>Measurements</FieldLegend>
        <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {environment?.measures.map((key) => (
            <Field key={key} orientation="horizontal">
              <Checkbox
                id={`measure-${key}`}
                checked={design.measures.includes(key)}
                onCheckedChange={(checked) =>
                  update(
                    "measures",
                    checked === true
                      ? [...design.measures, key]
                      : design.measures.filter((measure) => measure !== key),
                  )
                }
              />
              <FieldLabel htmlFor={`measure-${key}`}>{label(key)}</FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>
      <Separator />
      <Disclosure>
        <DisclosureTrigger>Model settings and limitations</DisclosureTrigger>
        <DisclosureContent className="pt-4">
          <FieldGroup>
            <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="reasoning-effort">
                  OpenAI reasoning effort
                </FieldLabel>
                <Select
                  id="reasoning-effort"
                  label="OpenAI reasoning effort"
                  value={design.openai_reasoning_effort ?? "default"}
                  onValueChange={(value) =>
                    update(
                      "openai_reasoning_effort",
                      value === "default"
                        ? null
                        : (value as Design["openai_reasoning_effort"]),
                    )
                  }
                  options={[
                    { value: "default", label: "Provider default" },
                    { value: "low", label: "Low · faster decisions" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
                <FieldDescription>
                  Applies to OpenAI agents. Other providers use their defaults.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="response-tokens">
                  Maximum response tokens
                </FieldLabel>
                <Input
                  id="response-tokens"
                  type="number"
                  min={512}
                  max={8192}
                  value={design.response_tokens}
                  onChange={(event) =>
                    update("response_tokens", Number(event.target.value))
                  }
                />
                <FieldDescription>
                  Includes reasoning tokens when used.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="limitations">Known limitations</FieldLabel>
              <Textarea
                id="limitations"
                rows={3}
                value={design.limitations.join("\n")}
                onChange={(event) =>
                  update("limitations", event.target.value.split("\n"))
                }
              />
              <FieldDescription>One limitation per line.</FieldDescription>
            </Field>
          </FieldGroup>
        </DisclosureContent>
      </Disclosure>
    </FieldGroup>
  );
}
