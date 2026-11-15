import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/feedback";
import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, invalidateResources } from "@/lib/api";
import type { ModelId, Settings } from "@/lib/types";

export function WorkspaceForm({ settings }: { settings: Settings }) {
  const client = useQueryClient();
  const [preferences, setPreferences] = useState(settings.preferences);
  const [budget, setBudget] = useState(settings.budget_usd);
  const save = useMutation({
    mutationFn: () =>
      api(
        "/settings",
        {
          preferences: {
            token_budget: preferences.token_budget,
            planner_model: preferences.planner_model,
            assistant_model: preferences.assistant_model,
            planner_web_research: preferences.planner_web_research ?? false,
            developer: preferences.developer,
          },
          budget_usd: budget,
        },
        "PUT",
      ),
    onSuccess: () => invalidateResources(client, ["/settings", "/catalog"]),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <FieldGroup>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="workspace-budget">
              Workspace USD ceiling
            </FieldLabel>
            <Input
              id="workspace-budget"
              type="number"
              min={settings.charged_usd}
              max={10000}
              step="any"
              required
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="workspace-tokens">
              Workspace token ceiling
            </FieldLabel>
            <Input
              id="workspace-tokens"
              type="number"
              min={Math.max(1, settings.committed_tokens)}
              step={1}
              value={preferences.token_budget ?? ""}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  token_budget:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                })
              }
            />
          </Field>
        </FieldGroup>
        <FieldDescription>
          Ceilings include prior usage and pending reservations. Unknown dollar
          prices require a token ceiling; they are never charged as $0 in
          reports. Experiment ceilings apply as well.
        </FieldDescription>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="planner-model">
              Protocol designer model
            </FieldLabel>
            <ModelPicker
              id="planner-model"
              label="Protocol designer model"
              value={preferences.planner_model}
              models={settings.models}
              onChange={(value) =>
                setPreferences({
                  ...preferences,
                  planner_model: value as ModelId,
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="assistant-model">Assistant model</FieldLabel>
            <ModelPicker
              id="assistant-model"
              label="Assistant model"
              value={preferences.assistant_model}
              models={settings.models}
              onChange={(value) =>
                setPreferences({
                  ...preferences,
                  assistant_model: value as ModelId,
                })
              }
            />
          </Field>
        </FieldGroup>
        <Field orientation="horizontal">
          <Checkbox
            id="planner-web-research"
            checked={preferences.planner_web_research ?? false}
            onCheckedChange={(value) =>
              setPreferences({
                ...preferences,
                planner_web_research: value === true,
              })
            }
          />
          <FieldLabel htmlFor="planner-web-research">
            Allow planner web research (additional cost, supported models only)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id="developer-mode"
            checked={preferences.developer}
            onCheckedChange={(value) =>
              setPreferences({ ...preferences, developer: value === true })
            }
          />
          <FieldLabel htmlFor="developer-mode">
            Developer tools: extension candidates and raw specification
          </FieldLabel>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save workspace settings"}
          </Button>
          {save.isSuccess && !save.error && (
            <p role="status" className="text-sm text-muted-foreground">
              Workspace settings saved.
            </p>
          )}
        </div>
        {save.error && (
          <Alert variant="error" title="Settings weren’t saved">
            {save.error.message}
          </Alert>
        )}
      </FieldGroup>
    </form>
  );
}
