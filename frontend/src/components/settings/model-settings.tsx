import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, invalidateResources } from "@/lib/api";
import { money } from "@/lib/format";
import type { Settings } from "@/lib/types";

type ConnectionEstimate = {
  upper_usd: number | null;
  max_tokens: number;
  requests: number;
};
export function ModelSettings({ settings }: { settings: Settings }) {
  const client = useQueryClient();
  const [model, setModel] = useState(
    settings.models[0]?.id ?? "openai:gpt-6-luna",
  );
  const initial = settings.models.find((item) => item.id === model);
  const [inputPrice, setInputPrice] = useState(
    initial?.input_per_million?.toString() ?? "",
  );
  const [outputPrice, setOutputPrice] = useState(
    initial?.output_per_million?.toString() ?? "",
  );
  const [estimate, setEstimate] = useState<ConnectionEstimate | null>(null);
  const save = useMutation({
    mutationFn: () =>
      api(
        "/settings/models",
        {
          id: model,
          input_per_million: inputPrice === "" ? null : Number(inputPrice),
          output_per_million: outputPrice === "" ? null : Number(outputPrice),
        },
        "PUT",
      ),
    onSuccess: () => {
      setEstimate(null);
      return invalidateResources(client, ["/settings", "/catalog"]);
    },
  });
  const test = useMutation({
    mutationFn: async (execute: boolean) =>
      api<{ estimate: ConnectionEstimate; acknowledged?: boolean }>(
        "/settings/test-model",
        { model, execute, max_usd: execute ? estimate?.upper_usd : null },
      ),
    onSuccess: (data) => {
      setEstimate(data.estimate);
      return invalidateResources(client, ["/settings"]);
    },
  });
  function select(value: string) {
    setModel(value as typeof model);
    const entry = settings.models.find((item) => item.id === value);
    setInputPrice(entry?.input_per_million?.toString() ?? "");
    setOutputPrice(entry?.output_per_million?.toString() ?? "");
    setEstimate(null);
    test.reset();
    save.reset();
  }
  return (
    <FieldGroup>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="model-id">Model ID</FieldLabel>
            <ModelPicker
              id="model-id"
              label="Model ID"
              value={model}
              disabled={save.isPending || test.isPending}
              models={settings.models}
              onChange={select}
            />
            <FieldDescription>
              Search a saved model or enter any provider:model ID, including
              local models.
            </FieldDescription>
          </Field>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="input-price">
                Input USD / million tokens
              </FieldLabel>
              <Input
                id="input-price"
                disabled={save.isPending || test.isPending}
                type="number"
                min="0"
                max="10000"
                step="any"
                value={inputPrice}
                onChange={(event) => {
                  setInputPrice(event.target.value);
                  setEstimate(null);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="output-price">
                Output USD / million tokens
              </FieldLabel>
              <Input
                id="output-price"
                disabled={save.isPending || test.isPending}
                type="number"
                min="0"
                max="10000"
                step="any"
                value={outputPrice}
                onChange={(event) => {
                  setOutputPrice(event.target.value);
                  setEstimate(null);
                }}
              />
            </Field>
          </FieldGroup>
          <FieldDescription>
            Leave both prices blank for unknown cost. An explicit token cap is
            then required; a dollar cap cannot guarantee that cost. Enter zero
            only for a known free model.
          </FieldDescription>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={save.isPending}>
              Save model
            </Button>
            <p role="status" className="text-sm text-muted-foreground">
              {save.error?.message ?? (save.isSuccess ? "Model saved." : "")}
            </p>
          </div>
        </FieldGroup>
      </form>
      <div className="flex flex-col items-start gap-3">
        <Button
          variant="outline"
          type="button"
          disabled={test.isPending || save.isPending}
          onClick={() => test.mutate(false)}
        >
          Estimate connection test
        </Button>
        {estimate && (
          <>
            <p className="text-sm text-muted-foreground">
              One request · up to {estimate.max_tokens.toLocaleString()} tokens
              ·{" "}
              {estimate.upper_usd == null
                ? "unknown dollar cost, workspace token cap applies"
                : `at most ${money(estimate.upper_usd)}`}
              .
            </p>
            <Button
              type="button"
              disabled={
                test.isPending ||
                (estimate.upper_usd == null &&
                  settings.preferences.token_budget == null)
              }
              onClick={() => test.mutate(true)}
            >
              {test.isPending ? "Testing…" : "Run connection test"}
            </Button>
          </>
        )}
        <p role="status" className="text-sm text-muted-foreground">
          {test.error?.message ??
            (test.data?.acknowledged
              ? "Connection and structured response verified."
              : "")}
        </p>
      </div>
    </FieldGroup>
  );
}
