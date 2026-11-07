import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Design, Environment } from "@/lib/types";
import { label } from "@/lib/utils";

type ExecutionPlan = Pick<
  Design,
  | "rounds"
  | "budget_usd"
  | "seeds"
  | "repetitions"
  | "measures"
  | "openai_reasoning_effort"
  | "response_tokens"
  | "limitations"
>;
export function ExecutionEditor({
  hidden,
  plan,
  agentCount,
  environment,
  onChange,
  onError,
}: {
  hidden: boolean;
  plan: ExecutionPlan;
  agentCount: number;
  environment: Environment;
  onChange: (patch: Partial<ExecutionPlan>) => void;
  onError: (error: string) => void;
}) {
  function update<K extends keyof ExecutionPlan>(
    key: K,
    value: ExecutionPlan[K],
  ) {
    onChange({ [key]: value });
  }
  return (
    <section className="form-section" hidden={hidden}>
      <h2>Run plan</h2>
      <FieldGroup className="matrix-fields">
        <Field>
          <FieldLabel htmlFor="rounds">Rounds per run</FieldLabel>
          <Input
            id="rounds"
            type="number"
            min={1}
            max={100}
            value={plan.rounds}
            onChange={(e) => update("rounds", Number(e.target.value))}
          />
          <FieldDescription>
            A round contains up to {agentCount} agent turns.
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
            value={plan.budget_usd}
            onChange={(e) => update("budget_usd", Number(e.target.value))}
          />
        </Field>
      </FieldGroup>
      <Disclosure className="disclosure">
        <DisclosureTrigger>
          Replication · {plan.seeds.length} seed
          {plan.seeds.length !== 1 && "s"} × {plan.repetitions} repetition
          {plan.repetitions !== 1 && "s"}
        </DisclosureTrigger>
        <DisclosureContent>
          <FieldGroup className="matrix-fields">
            {" "}
            <Field>
              <FieldLabel htmlFor="seeds">Matched seeds</FieldLabel>
              <Input
                id="seeds"
                defaultValue={plan.seeds.join(", ")}
                onBlur={(e) => {
                  const parts = e.target.value
                    .split(",")
                    .map((v) =>
                      v.trim() === "" ? Number.NaN : Number(v.trim()),
                    );
                  if (parts.some((n) => !Number.isInteger(n) || n < 0)) {
                    update("seeds", []);
                    onError(
                      "Seeds must be nonnegative integers, separated by commas.",
                    );
                  } else {
                    update("seeds", parts);
                    onError("");
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
                value={plan.repetitions}
                onChange={(e) => update("repetitions", Number(e.target.value))}
              />
            </Field>
          </FieldGroup>
        </DisclosureContent>
      </Disclosure>
      <Disclosure className="disclosure">
        <DisclosureTrigger>
          Measurements · {plan.measures.length} selected
        </DisclosureTrigger>
        <DisclosureContent>
          <fieldset className="measure-picker">
            <legend>Measurements</legend>
            {environment?.measures.map((key) => (
              <FieldLabel key={key} htmlFor={`measure-${key}`}>
                <Checkbox
                  id={`measure-${key}`}
                  checked={plan.measures.includes(key)}
                  onCheckedChange={(checked) =>
                    update(
                      "measures",
                      checked === true
                        ? [...plan.measures, key]
                        : plan.measures.filter((m) => m !== key),
                    )
                  }
                />
                {label(key)}
              </FieldLabel>
            ))}
          </fieldset>
        </DisclosureContent>
      </Disclosure>
      <Disclosure className="disclosure">
        <DisclosureTrigger>Model settings & limitations</DisclosureTrigger>
        <DisclosureContent>
          <FieldGroup>
            <Field>
              <FieldLabel>OpenAI reasoning effort</FieldLabel>
              <Select
                label="OpenAI reasoning effort"
                value={plan.openai_reasoning_effort ?? "default"}
                onValueChange={(v) =>
                  update("openai_reasoning_effort", v === "default" ? null : v)
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
                value={plan.response_tokens}
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
                value={plan.limitations.join("\n")}
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
