import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { ErrorState, Json } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import {
  mechanicsFields,
  newMechanicsDraft,
  readMechanicsDraft,
  validMechanicsLimits,
} from "@/lib/mechanics-draft";
import type {
  GenerationAuthorization as Allowance,
  ExtensionRuntime,
  FiniteExtensionProfile,
  ReviewedFiniteContract,
  Settings,
} from "@/lib/types";

export function GenerationAuthorization({
  question,
  draftKey,
  disabled,
  pending,
  error,
  settings,
  onGenerate,
}: {
  question: string;
  draftKey: string;
  disabled: boolean;
  pending: boolean;
  error: Error | null;
  settings: Settings | undefined;
  onGenerate: (allowance: Allowance) => void;
}) {
  const [open, setOpen] = useState(false);
  const key = `${draftKey}:mechanics`;
  const [loaded] = useState(() => readMechanicsDraft(key));
  const [draft, setDraft] = useState(loaded.value);
  const [draftError, setDraftError] = useState(loaded.error);
  const [storageError, setStorageError] = useState(false);
  const { text, limits } = draft;
  const validLimits = validMechanicsLimits(limits);
  const epoch = useRef(0);
  const client = useQueryClient();
  useEffect(() => {
    if (draftError) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(draft));
    } catch {
      setStorageError(true);
    }
  }, [draft, key, draftError]);
  const id = useId();
  const profile = useQuery({
    queryKey: ["/extensions/profile"],
    queryFn: () => api<FiniteExtensionProfile>("/extensions/profile"),
  });
  const runtime = useQuery({
    queryKey: ["/extensions/runtime"],
    queryFn: () => api<ExtensionRuntime>("/extensions/runtime"),
  });
  const freeze = useMutation({
    mutationFn: ({ source }: { source: string; epoch: number }) =>
      api<ReviewedFiniteContract>("/extensions/contracts", JSON.parse(source)),
    onSuccess: (result, submitted) => {
      client.setQueryData([`/extensions/contracts/${result.id}`], result);
      if (submitted.epoch !== epoch.current) return;
      setDraft((current) =>
        current.text === submitted.source
          ? {
              ...current,
              frozen: {
                id: result.id,
                sha256: result.sha256,
                text: submitted.source,
              },
            }
          : current,
      );
    },
  });
  const selected = draft.frozen;
  const contractPath = `/extensions/contracts/${selected?.id}`;
  const restored = useQuery({
    queryKey: [contractPath],
    queryFn: () => api<ReviewedFiniteContract>(contractPath),
    enabled: selected !== null,
  });
  const frozen =
    restored.data?.id === selected?.id &&
    restored.data?.sha256 === selected?.sha256 &&
    restored.data?.format === "jas-reviewed-finite-contract-v1"
      ? restored.data
      : undefined;
  const identityError =
    selected && restored.data && !frozen
      ? "The stored contract does not match the frozen draft identity. Freeze the independent contract again before authorizing."
      : null;
  const sol =
    settings?.assistant_model === "openai:gpt-6.1-sol" &&
    settings.planner_model === "openai:gpt-6.1-sol" &&
    settings.providers.openai;
  const profileReady = profile.data?.profile === "reviewed-finite-v1";
  const runtimeReady =
    !runtime.error &&
    !runtime.isFetching &&
    runtime.data?.status === "qualified" &&
    runtime.data.validation_enabled;
  const ready = profileReady && runtimeReady;
  const blocked =
    disabled ||
    pending ||
    freeze.isPending ||
    !!draftError ||
    !!restored.error ||
    (selected !== null && restored.isFetching);
  useEffect(() => {
    if (!question.trim()) setOpen(false);
  }, [question]);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void runtime.refetch();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={
            disabled ||
            pending ||
            profile.isPending ||
            runtime.isPending ||
            !question.trim()
          }
        >
          New mechanics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate new mechanics</DialogTitle>
          <DialogDescription>
            Prepare checked mechanics and a pending experiment proposal within
            the allowance below. Participant execution needs a separate action.
          </DialogDescription>
        </DialogHeader>
        <p>{question}</p>
        {draftError && (
          <Alert variant="error">
            {draftError}{" "}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                try {
                  sessionStorage.removeItem(key);
                  epoch.current += 1;
                  setDraft(newMechanicsDraft());
                  setDraftError(null);
                  setStorageError(false);
                  freeze.reset();
                } catch {
                  setStorageError(true);
                }
              }}
            >
              Clear mechanics draft
            </Button>
          </Alert>
        )}
        {storageError && (
          <Alert variant="error">
            This browser could not save the mechanics draft. Keep a copy before
            navigating away.
          </Alert>
        )}
        {restored.error && (
          <ErrorState error={restored.error} onRetry={restored.refetch} />
        )}
        {identityError && <Alert variant="error">{identityError}</Alert>}
        <p className="text-sm text-muted-foreground">
          An independently authored, reviewed exhaustive external table is a
          prerequisite, with at most {profile.data?.finite_input_limit} inputs.
          Passing its checks does not establish natural-language understanding.
        </p>
        <p className="text-sm text-muted-foreground">
          Dynamic information policies, arbitrary programs and external systems
          are unsupported in this profile. Installed richer worlds retain their
          own mechanics. Prefer composing existing mechanics when sufficient.
        </p>
        {profile.error && (
          <ErrorState error={profile.error} onRetry={profile.refetch} />
        )}
        {profile.data && !profileReady && (
          <Alert variant="error">
            Unsupported generation profile: {profile.data.profile}. Required:
            reviewed-finite-v1.
          </Alert>
        )}
        {runtime.error && (
          <ErrorState error={runtime.error} onRetry={runtime.refetch} />
        )}
        {runtime.data && (
          <p className="text-sm">
            {runtimeReady
              ? "Current executable containment qualified."
              : "Check current executable containment before generation."}{" "}
            <Link to="/environments" className="underline underline-offset-4">
              Inspect containment
            </Link>{" "}
            Copied probes do not establish executable containment.
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (
              frozen &&
              ready &&
              sol &&
              !blocked &&
              validMechanicsLimits(limits)
            )
              onGenerate({ contract_id: frozen.id, ...limits });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-contract`}>
                Independent finite contract (JSON)
              </FieldLabel>
              <Textarea
                id={`${id}-contract`}
                value={text}
                rows={5}
                className="max-h-64 overflow-y-auto font-mono text-xs"
                onChange={(event) => {
                  epoch.current += 1;
                  setDraft((current) => ({
                    ...current,
                    text: event.target.value,
                    frozen: null,
                  }));
                  freeze.reset();
                }}
                disabled={pending}
              />
              <Button
                type="button"
                variant="outline"
                disabled={blocked || !text.trim()}
                onClick={() =>
                  freeze.mutate({ source: text, epoch: epoch.current })
                }
              >
                {freeze.isPending
                  ? "Freezing contract…"
                  : "Freeze independent contract"}
              </Button>
              {freeze.error && (
                <Alert variant="error">
                  {freeze.error.message} Your JSON is kept above.
                </Alert>
              )}
              {frozen && (
                <p className="break-all text-sm">
                  <a
                    href={`/api/extensions/contracts/${frozen.id}`}
                    className="underline underline-offset-4"
                  >
                    Inspect frozen contract
                  </a>{" "}
                  · SHA-256 {frozen.sha256}
                </p>
              )}
            </Field>
            <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mechanicsFields.map(([key, title, min, max, step]) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`${id}-${key}`}>{title}</FieldLabel>
                  <Input
                    id={`${id}-${key}`}
                    type="number"
                    required
                    min={min}
                    max={max}
                    step={step}
                    disabled={pending}
                    value={limits[key] ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        limits: {
                          ...current.limits,
                          [key]: Number.isFinite(event.target.valueAsNumber)
                            ? event.target.valueAsNumber
                            : null,
                        },
                      }))
                    }
                  />
                </Field>
              ))}
            </FieldGroup>
            {!validLimits && (
              <Alert>
                Complete the generation limits within the shown ranges before
                authorizing.
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              GPT-6.1 Sol researches, generates and plans. Every nested request
              reserves and settles separately within this allowance and all
              workspace ceilings. Unknown usage keeps its reservation. Attempts,
              failures, explicit repairs, costs and stopping stay recorded. No
              silent retry or model substitution. This does not authorize
              participant sampling.
            </p>
            {!sol && (
              <Alert>
                Configure the Sol Researcher and planner with an available
                OpenAI provider before authorizing generation.
              </Alert>
            )}
            {error && (
              <Alert variant="error">
                {error.message} Your question and limits are kept.
              </Alert>
            )}
            <Disclosure>
              <DisclosureTrigger>
                Supported profile and schemas
              </DisclosureTrigger>
              <DisclosureContent className="pt-3">
                <p className="text-sm">
                  Static actor-private facts stay outside the executable
                  artifact; roles have a fixed order. Candidate prose and
                  self-tests cannot admit themselves. Generated output remains
                  pending until independent admission and user review.
                </p>
                <Json value={profile.data} />
              </DisclosureContent>
            </Disclosure>
            <DialogFooter>
              <Button
                type="submit"
                disabled={blocked || !frozen || !ready || !sol || !validLimits}
              >
                Authorize generation
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
