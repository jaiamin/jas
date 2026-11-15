import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/feedback";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, invalidateResources } from "@/lib/api";
import type { ProviderConfiguration } from "@/lib/types";

export function ProviderForm({
  provider,
}: {
  provider?: ProviderConfiguration;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(provider?.id ?? "local");
  const [kind, setKind] = useState<ProviderConfiguration["kind"]>(
    provider?.kind ?? "compatible",
  );
  const [url, setUrl] = useState(
    provider?.base_url ?? "http://localhost:11434/v1",
  );
  const [key, setKey] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api(
        `/settings/providers/${encodeURIComponent(name)}`,
        { kind, base_url: url, api_key: key || null },
        "PUT",
      ),
    onSuccess: () => {
      setKey("");
      return invalidateResources(client, ["/settings", "/catalog"]);
    },
  });
  const prefix = `provider-${provider?.id ?? "new"}`;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <FieldGroup>
        {!provider && (
          <Field>
            <FieldLabel htmlFor={`${prefix}-id`}>Provider ID</FieldLabel>
            <Input
              id={`${prefix}-id`}
              disabled={save.isPending}
              value={name}
              pattern="[a-z][a-z0-9_-]{0,31}"
              required
              onChange={(event) => setName(event.target.value)}
            />
            <FieldDescription>
              Use this ID before the colon in model names.
            </FieldDescription>
          </Field>
        )}
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${prefix}-kind`}>API</FieldLabel>
            <OptionSelect
              id={`${prefix}-kind`}
              label="Provider API"
              disabled={save.isPending}
              value={kind}
              onValueChange={setKind}
              options={[
                { value: "openai", label: "OpenAI Responses" },
                { value: "anthropic", label: "Anthropic" },
                { value: "openrouter", label: "OpenRouter" },
                { value: "compatible", label: "OpenAI compatible / local" },
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${prefix}-url`}>Base URL</FieldLabel>
            <Input
              id={`${prefix}-url`}
              type="url"
              required
              disabled={save.isPending}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${prefix}-key`}>API key</FieldLabel>
          <Input
            id={`${prefix}-key`}
            type="password"
            autoComplete="new-password"
            disabled={save.isPending}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder={
              provider?.configured
                ? "Saved key · leave blank to keep"
                : "Optional for local endpoints"
            }
          />
          <FieldDescription>
            Stored on this machine with owner-only file permissions. Never
            included in experiment exports.
          </FieldDescription>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save provider"}
          </Button>
          {save.isSuccess && !save.error && (
            <p role="status" className="text-sm text-muted-foreground">
              Provider saved.
            </p>
          )}
        </div>
        {save.error && (
          <Alert variant="error" title="Provider wasn’t saved">
            {save.error.message}
          </Alert>
        )}
      </FieldGroup>
    </form>
  );
}
