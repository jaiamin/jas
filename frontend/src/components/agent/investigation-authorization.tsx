import { useEffect, useId, useState } from "react";
import { Alert } from "@/components/feedback";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApi } from "@/lib/api";
import type { Catalog, InvestigationAllowance } from "@/lib/types";

const defaults: InvestigationAllowance = {
  researcher_model: "openai:gpt-6.1-sol",
  participant_model: "openai:gpt-6-luna",
  environments: ["artifact_workspace"],
  harnesses: ["direct_action"],
  budget_usd: 1,
  study_budget_usd: 1,
  max_requests: 24,
  max_runs: 2,
  max_turns: 14,
  max_agents: 1,
  max_rounds: 7,
  max_operations: 32,
  max_design_attempts: 2,
  intent: "exploratory",
  pilot: false,
  adapt_after_pilot: false,
  stopping: "scope_ambiguity_allowance_or_failure",
};

const numericFields = [
  ["budget_usd", "Investigation ceiling ($)", 0, 10, 0.01],
  ["study_budget_usd", "Study ceiling ($)", 0, 10, 0.01],
  ["max_requests", "Model requests", 1, 256, 1],
  ["max_runs", "Runs, including pilots", 1, 48, 1],
  ["max_turns", "Participant turns", 1, 1000, 1],
  ["max_agents", "Active participants", 1, 12, 1],
  ["max_rounds", "Rounds per run", 1, 100, 1],
  ["max_operations", "Research operations", 1, 256, 1],
  ["max_design_attempts", "Protocol revisions", 1, 4, 1],
] as const;

function savedAllowance(key: string): InvestigationAllowance {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (stored && typeof stored === "object") {
      // Restore only known controls; fixed model/stopping identities remain explicit.
      const restored = { ...defaults };
      const values = stored as Record<string, unknown>;
      for (const [name] of numericFields) {
        const number = values[name];
        if (typeof number === "number" && Number.isFinite(number))
          restored[name] = number;
      }
      if ("intent" in stored && stored.intent === "confirmatory")
        restored.intent = "confirmatory";
      if ("pilot" in stored && typeof stored.pilot === "boolean")
        restored.pilot = stored.pilot;
      if (
        "adapt_after_pilot" in stored &&
        typeof stored.adapt_after_pilot === "boolean"
      )
        restored.adapt_after_pilot = stored.adapt_after_pilot;
      if (
        "environments" in stored &&
        Array.isArray(stored.environments) &&
        typeof stored.environments[0] === "string"
      )
        restored.environments = [stored.environments[0]];
      if (
        "harnesses" in stored &&
        Array.isArray(stored.harnesses) &&
        stored.harnesses[0] === "tool_using"
      )
        restored.harnesses = ["tool_using"];
      return restored;
    }
  } catch {
    /* The message draft has its own visible persistence warning. */
  }
  return { ...defaults };
}

export function InvestigationAuthorization({
  question,
  draftKey,
  disabled,
  pending,
  error,
  onInvestigate,
}: {
  question: string;
  draftKey: string;
  disabled: boolean;
  pending: boolean;
  error: Error | null;
  onInvestigate: (allowance: InvestigationAllowance) => void;
}) {
  const [open, setOpen] = useState(false);
  const [allowance, setAllowance] = useState(() =>
    savedAllowance(`${draftKey}:investigation`),
  );
  const [draftError, setDraftError] = useState(false);
  const id = useId();
  const catalog = useApi<Catalog>("/catalog");
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `${draftKey}:investigation`,
        JSON.stringify(allowance),
      );
    } catch {
      setDraftError(true);
    }
  }, [draftKey, allowance]);
  useEffect(() => {
    if (!question.trim()) setOpen(false);
  }, [question]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || !question.trim()}
        >
          Investigate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Authorize investigation</DialogTitle>
          <DialogDescription>
            Design, checks, optional exploratory pilot, participant trials and
            read-only analysis within these allowances.
          </DialogDescription>
        </DialogHeader>
        <p className="break-words">{question}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onInvestigate(allowance);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-world`}>World</FieldLabel>
              <OptionSelect
                id={`${id}-world`}
                label="Investigation world"
                value={allowance.environments[0]}
                onValueChange={(world) =>
                  setAllowance((value) => ({ ...value, environments: [world] }))
                }
                options={(catalog.data?.environments ?? []).map((world) => ({
                  value: world.key,
                  label: world.name,
                }))}
              />
              {catalog.error && (
                <Alert variant="error">
                  Could not load worlds.{" "}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => catalog.refetch()}
                  >
                    Retry
                  </Button>
                </Alert>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-intent`}>Intent</FieldLabel>
              <OptionSelect
                id={`${id}-intent`}
                label="Investigation intent"
                value={allowance.intent}
                onValueChange={(intent) =>
                  setAllowance((value) => ({ ...value, intent }))
                }
                options={[
                  { value: "exploratory", label: "Exploratory" },
                  {
                    value: "confirmatory",
                    label: "Confirmatory · freeze before trials",
                  },
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-harness`}>
                Participant harness
              </FieldLabel>
              <OptionSelect
                id={`${id}-harness`}
                label="Investigation harness"
                value={allowance.harnesses[0]}
                onValueChange={(harness) =>
                  setAllowance((value) => ({ ...value, harnesses: [harness] }))
                }
                options={[
                  { value: "direct_action", label: "Direct action · 1.0.0" },
                  { value: "tool_using", label: "Tool using · 2.0.0" },
                ]}
              />
              <FieldDescription>
                Researcher: GPT-6.1 Sol. Participants: GPT-6 Luna. Each nested
                request counts against all applicable ceilings; unknown usage
                retains its reservation.
              </FieldDescription>
            </Field>
            <FieldGroup className="grid grid-cols-2 gap-3">
              {numericFields.map(([name, label, min, max, step]) => (
                <Field key={name}>
                  <FieldLabel htmlFor={`${id}-${name}`}>{label}</FieldLabel>
                  <Input
                    id={`${id}-${name}`}
                    type="number"
                    required
                    min={min}
                    max={max}
                    step={step}
                    value={
                      Number.isFinite(allowance[name]) ? allowance[name] : ""
                    }
                    onChange={(event) =>
                      setAllowance((value) => ({
                        ...value,
                        [name]: event.target.valueAsNumber,
                      }))
                    }
                  />
                </Field>
              ))}
            </FieldGroup>
            <Field orientation="horizontal">
              <Checkbox
                id={`${id}-pilot`}
                checked={allowance.pilot}
                onCheckedChange={(checked) =>
                  setAllowance((value) => ({
                    ...value,
                    pilot: checked === true,
                    adapt_after_pilot:
                      checked === true && value.adapt_after_pilot,
                  }))
                }
              />
              <FieldLabel htmlFor={`${id}-pilot`}>
                Include an exploratory pilot revision
              </FieldLabel>
            </Field>
            {allowance.pilot && (
              <Field orientation="horizontal">
                <Checkbox
                  id={`${id}-adapt`}
                  checked={allowance.adapt_after_pilot}
                  onCheckedChange={(checked) =>
                    setAllowance((value) => ({
                      ...value,
                      adapt_after_pilot: checked === true,
                    }))
                  }
                />
                <FieldLabel htmlFor={`${id}-adapt`}>
                  Allow a checked adaptation after the pilot
                </FieldLabel>
              </Field>
            )}
            <p className="text-xs text-muted-foreground">
              Stops for material ambiguity, changed scope, exhausted allowance
              or failure. Pilot revisions and failed attempts stay recorded.
              Confirmation freezes exact decisions before its trials. Completion
              is not a validity or intelligence pass.
            </p>
            {draftError && (
              <Alert>
                Investigation controls could not be kept in this browser.
              </Alert>
            )}
            {error && (
              <Alert variant="error">
                {error.message} Your question and allowances are kept.
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  disabled || pending || !catalog.data || !!catalog.error
                }
              >
                Investigate · up to ${allowance.budget_usd}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
