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
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { label } from "@/lib/format";
import type { Catalog, Design } from "@/lib/types";

export function ExecutionFields({
  design,
  catalog,
  onChange,
  hidden,
  setError,
}: {
  design: Design;
  catalog: Catalog;
  onChange: (design: Design) => void;
  hidden: boolean;
  setError: (error: string) => void;
}) {
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    onChange({ ...design, [key]: value });
  }
  const environment = catalog.environments.find(
    (e) => e.key === design.environment,
  );
  return (
    <section className="mb-6 flex flex-col gap-6" hidden={hidden}>
      <h2 className="text-base font-semibold">Run plan</h2>
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rounds">Rounds per run</FieldLabel>
          <Input
            id="rounds"
            type="number"
            min={1}
            max={100}
            value={design.rounds}
            onChange={(e) => update("rounds", Number(e.target.value))}
          />
          <FieldDescription>
            A round contains up to {design.profiles.length} agent turns.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="budget">Study spending ceiling, USD</FieldLabel>
          <Input
            id="budget"
            type="number"
            min={0.05}
            max={25}
            step={0.5}
            value={design.budget_usd}
            onChange={(e) => update("budget_usd", Number(e.target.value))}
          />
        </Field>
      </FieldGroup>
      <Disclosure className="min-w-0">
        <DisclosureTrigger>
          Replication · {design.seeds.length} seed
          {design.seeds.length !== 1 && "s"} × {design.repetitions} repetition
          {design.repetitions !== 1 && "s"}
        </DisclosureTrigger>
        <DisclosureContent>
          <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {" "}
            <Field>
              <FieldLabel htmlFor="seeds">Matched seeds</FieldLabel>
              <Input
                id="seeds"
                defaultValue={design.seeds.join(", ")}
                onBlur={(e) => {
                  const parts = e.target.value
                    .split(",")
                    .map((v) =>
                      v.trim() === "" ? Number.NaN : Number(v.trim()),
                    );
                  if (parts.some((n) => !Number.isInteger(n) || n < 0)) {
                    update("seeds", []);
                    setError(
                      "Seeds must be nonnegative integers, separated by commas.",
                    );
                  } else {
                    update("seeds", parts);
                    setError("");
                  }
                }}
              />
              <FieldDescription>
                The same seeds are used in every condition.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="repetitions">
                Repetitions per seed
              </FieldLabel>
              <Input
                id="repetitions"
                type="number"
                min={1}
                max={10}
                value={design.repetitions}
                onChange={(e) => update("repetitions", Number(e.target.value))}
              />
            </Field>
          </FieldGroup>
        </DisclosureContent>
      </Disclosure>
      <Disclosure className="min-w-0">
        <DisclosureTrigger>
          Measurements · {design.measures.length} selected
        </DisclosureTrigger>
        <DisclosureContent>
          <FieldSet className="flex flex-wrap gap-4">
            <FieldLegend>Measurements</FieldLegend>
            {environment?.measures.map((key) => (
              <FieldLabel key={key} htmlFor={`measure-${key}`}>
                <Checkbox
                  id={`measure-${key}`}
                  checked={design.measures.includes(key)}
                  onCheckedChange={(checked) =>
                    update(
                      "measures",
                      checked === true
                        ? [...design.measures, key]
                        : design.measures.filter((m) => m !== key),
                    )
                  }
                />
                {label(key)}
              </FieldLabel>
            ))}
          </FieldSet>
        </DisclosureContent>
      </Disclosure>
      <Disclosure className="min-w-0">
        <DisclosureTrigger>Model settings & limitations</DisclosureTrigger>
        <DisclosureContent>
          <FieldGroup>
            <Field>
              <FieldLabel>OpenAI reasoning effort</FieldLabel>
              <Select
                label="OpenAI reasoning effort"
                value={design.openai_reasoning_effort ?? "default"}
                onValueChange={(v) =>
                  update(
                    "openai_reasoning_effort",
                    v === "default"
                      ? null
                      : (v as Design["openai_reasoning_effort"]),
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
                Applies to OpenAI agents. Anthropic uses its provider defaults.
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
                onChange={(e) =>
                  update("response_tokens", Number(e.target.value))
                }
              />
              <FieldDescription>
                Includes reasoning tokens when the model uses them.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="limitations">
                Known limitations, one per line
              </FieldLabel>
              <Textarea
                id="limitations"
                rows={3}
                value={design.limitations.join("\n")}
                onChange={(e) =>
                  update("limitations", e.target.value.split("\n"))
                }
              />
            </Field>
          </FieldGroup>
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}
