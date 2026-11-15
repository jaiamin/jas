import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { AgentFields } from "@/components/editor/agent-fields";
import { ConditionFields } from "@/components/editor/condition-fields";
import {
  EditorHeading,
  EditorNavigation,
} from "@/components/editor/editor-layout";
import { EnvironmentExamples } from "@/components/editor/environment-examples";
import { ExecutionFields } from "@/components/editor/execution-fields";
import { ExperimentReview } from "@/components/editor/experiment-review";
import { GeneralFields } from "@/components/editor/general-fields";
import { ResearchFields } from "@/components/editor/question-fields";
import { TaskFields } from "@/components/editor/task-fields";
import { ExperimentCheck } from "@/components/experiment-check";
import { Alert } from "@/components/feedback";
import {
  AgentIcon,
  ArrowRight,
  Ellipsis,
  LoaderCircle,
} from "@/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, invalidateResources, useApi } from "@/lib/api";
import { changeEnvironment, parseSeeds } from "@/lib/design";
import { type Draft, removeDraft, writeDraft } from "@/lib/drafts";
import { environmentOptions } from "@/lib/environments";
import { money } from "@/lib/format";
import type {
  Analysis,
  Catalog,
  Design,
  EnvironmentId,
  EnvironmentMechanics,
  ExperimentPreflight,
  SavedEnvironment,
  Settings,
} from "@/lib/types";

export function DesignEditor({
  initial,
  catalog,
  studyId,
  planId,
  agentChatId,
  explanation,
  planning,
  draftPath,
  draft,
  initialStep = "question",
  setupId,
  setupRevision,
  initialMode = "quick",
}: {
  initial: Design;
  catalog: Catalog;
  studyId: string | null;
  planId: string | null;
  agentChatId?: string | null;
  explanation?: string;
  planning?: NonNullable<Analysis["output"]>["planning"];
  draftPath: string;
  draft?: Draft;
  initialStep?: string;
  setupId?: string | null;
  setupRevision?: number;
  initialMode?: "quick" | "visual";
}) {
  const [design, setDesign] = useState<Design>(() => structuredClone(initial));
  const [seedsText, setSeedsText] = useState(
    draft?.seedsInput ?? initial.seeds.join(", "),
  );
  const seedsValid = parseSeeds(seedsText) !== null;
  const seedsInput = {
    value: seedsText,
    onChange: (text: string) => {
      setSeedsText(text);
      const seeds = parseSeeds(text);
      if (seeds) setDesign((value) => ({ ...value, seeds }));
    },
  };
  const [agentDraftId] = useState(() => crypto.randomUUID());
  const [json, setJson] = useState(draft?.json ?? "");
  const [mode, setMode] = useState<Draft["mode"]>(draft?.mode ?? initialMode);
  const [jsonDirty, setJsonDirty] = useState(
    draft?.jsonDirty ?? draft?.mode === "json",
  );
  const [step, setStep] = useState(
    initialStep === "question" ? "research" : initialStep,
  );
  const [formVersion, setFormVersion] = useState(0);
  const [draftStatus, setDraftStatus] = useState(draft ? "Draft saved" : "");
  // The library editing target survives changes that clear scientific provenance.
  const [savedSetup, setSavedSetup] = useState<Draft["environmentEdit"]>(
    () =>
      draft?.environmentEdit ??
      (initial.environment_source &&
      /^[a-f0-9]{16}$/.test(initial.environment_source.id)
        ? {
            id: initial.environment_source.id,
            revision: initial.environment_source.revision,
          }
        : setupId && setupRevision !== undefined
          ? { id: setupId, revision: setupRevision }
          : undefined),
  );
  const lastSnapshot = useRef(
    JSON.stringify({ design, json, mode, savedSetup, jsonDirty, seedsText }),
  );
  useEffect(() => {
    const snapshot = JSON.stringify({
      design,
      json,
      mode,
      savedSetup,
      jsonDirty,
      seedsText,
    });
    if (snapshot === lastSnapshot.current) return;
    try {
      writeDraft(
        draftPath,
        design,
        json,
        mode,
        savedSetup,
        jsonDirty,
        seedsText,
      );
      lastSnapshot.current = snapshot;
      setDraftStatus("Draft saved");
    } catch {
      setDraftStatus("Draft could not be saved in this browser");
    }
  }, [design, json, mode, draftPath, savedSetup, jsonDirty, seedsText]);
  const [error, setError] = useState("");
  const [setupNotice, setSetupNotice] = useState("");
  const [pendingEnvironment, setPendingEnvironment] =
    useState<EnvironmentId | null>(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const settings = useApi<Settings>("/settings");
  const [estimateDesign, setEstimateDesign] = useState(design);
  useEffect(() => {
    const timer = window.setTimeout(() => setEstimateDesign(design), 300);
    return () => window.clearTimeout(timer);
  }, [design]);
  const estimate = useQuery({
    queryKey: ["design-estimate", estimateDesign],
    queryFn: () =>
      api<{
        runs: number;
        max_requests: number;
        upper_usd: number | null;
        unpriced_models: string[];
        assumptions: string;
      }>("/design/estimate", { design: estimateDesign }),
    enabled:
      mode === "quick" &&
      seedsValid &&
      Boolean(design.title.trim() && design.question.trim()),
    retry: false,
  });
  const estimateCurrent =
    JSON.stringify(estimateDesign) === JSON.stringify(design);
  const requiredModels = new Set(
    design.conditions.flatMap((condition) =>
      condition.harness.kind === "scripted"
        ? []
        : design.profiles.map(
            (profile) =>
              (
                condition.profile_overrides.find(
                  (value) => value.key === profile.key,
                ) ?? profile
              ).model ?? condition.model,
          ),
    ),
  );
  for (const condition of design.conditions) {
    if (condition.adjudicator) requiredModels.add(condition.adjudicator.model);
  }
  const unavailableModels = [...requiredModels].filter(
    (model) => settings.data && !settings.data.providers[model.split(":")[0]],
  );
  const save = useMutation({
    mutationFn: ({ specification }: { specification: unknown; run: boolean }) =>
      api<{ id: string }>(
        studyId ? `/studies/${studyId}/revisions` : "/studies",
        { design: specification, plan_id: planId },
      ),
    onSuccess: async (result, submitted) => {
      await invalidateResources(client, [
        "/studies",
        `/studies/${result.id}`,
        "/runs",
      ]);
      let notice: string | undefined;
      try {
        removeDraft(draftPath);
      } catch {
        notice = "Experiment saved. The browser draft could not be cleared.";
      }
      if (submitted.run) {
        try {
          await api(`/studies/${result.id}/control`, { action: "start" });
        } catch {
          notice =
            "Experiment saved. Could not confirm execution status. Check the runs before taking another action.";
        }
      }
      navigate(`/experiments/${result.id}`, { state: { notice } });
    },
  });
  // A saved revision owns its relay package even after library deletion. This
  // metadata keeps its controls available; the API still checks actual admission.
  const availableCatalog = {
    ...catalog,
    environments: environmentOptions(
      catalog.environments,
      settings.data?.preferences?.developer === true,
      design.environment,
    ),
  };
  const editorCatalog: Catalog =
    design.environment === "sealed_relay" &&
    design.environment_source &&
    !availableCatalog.environments.some((item) => item.key === "sealed_relay")
      ? {
          ...availableCatalog,
          environments: [
            ...availableCatalog.environments,
            {
              key: "sealed_relay",
              name: "Pinned admitted sealed relay",
              description:
                "Finite two-participant relay with a pinned package.",
              primary_metric: "relay_success",
              parameters: ["relay", "memory"],
              measures: ["relay_success"],
              measure_definitions: {
                relay_success:
                  "Whether the relay was released before termination.",
              },
              rule_version: design.environment_source.definition.rule_version,
              source: design.environment_source,
            },
          ],
        }
      : availableCatalog;
  const validate = useMutation({
    mutationFn: ({
      specification,
    }: {
      specification: unknown;
      mode: "quick" | "visual";
    }) => api<Design>("/design/validate", { design: specification }),
    onSuccess: (validated, submitted) => {
      setDesign(validated);
      setSeedsText(validated.seeds.join(", "));
      setFormVersion((version) => version + 1);
      setMode(submitted.mode);
      if (submitted.mode === "quick") setStep("research");
      setJsonDirty(false);
      setError("");
    },
  });
  const saveEnvironment = useMutation({
    mutationFn: async (asNew: boolean) => {
      const validated = await api<Design>("/design/validate", {
        design: mode === "json" ? JSON.parse(json) : design,
      });
      const definition = await api<EnvironmentMechanics>(
        "/design/environment",
        { design: validated },
      );
      const updating = !asNew && savedSetup;
      const record = await api<SavedEnvironment>(
        updating ? `/environments/${updating.id}` : "/environments",
        { definition, revision: updating ? updating.revision : null },
        updating ? "PUT" : "POST",
      );
      return { record, validated };
    },
    onSuccess: ({ record, validated }) => {
      setSavedSetup({ id: record.id, revision: record.revision });
      const pinned = { ...validated, environment_source: record };
      setDesign(pinned);
      if (mode === "json") setJson(JSON.stringify(pinned, null, 2));
      setSetupNotice(
        "Custom environment saved. Reuse, edit or delete it from Environments.",
      );
    },
  });
  const reuse = useMutation({
    mutationFn: ({
      example,
      bindings,
      source = design.environment_source,
    }: {
      example: string;
      bindings: Record<string, string>;
      source?: SavedEnvironment | null;
    }) =>
      api<Design>("/design/use-environment", {
        design,
        source,
        example,
        bindings,
      }),
    onSuccess: (applied) => {
      setDesign(applied);
      setSeedsText(applied.seeds.join(", "));
      setFormVersion((version) => version + 1);
    },
  });
  const snapshot = mode === "json" ? json : JSON.stringify(design);
  const check = useMutation({
    mutationFn: async (submitted: string) => ({
      snapshot: submitted,
      report: await api<ExperimentPreflight>("/design/preflight", {
        design: JSON.parse(submitted),
        plan_id: planId,
      }),
    }),
  });
  const currentCheck =
    check.data?.snapshot === snapshot ? check.data.report : null;
  const busy =
    save.isPending ||
    validate.isPending ||
    saveEnvironment.isPending ||
    reuse.isPending ||
    check.isPending;
  function changeMode(value: string) {
    if (busy) return;
    if (value === "json") {
      if (!jsonDirty) setJson(JSON.stringify(design, null, 2));
      setMode(value);
    } else {
      try {
        validate.mutate({
          specification: JSON.parse(json),
          mode: value === "quick" ? "quick" : "visual",
        });
      } catch {
        setError(
          "The specification is not valid JSON. Fix it before switching views.",
        );
      }
    }
  }
  function submit(run = false) {
    if (busy || currentCheck?.status === "blocked") return;
    if (mode !== "json" && (!design.title.trim() || !design.question.trim())) {
      setError("Add an experiment name and question before saving.");
      return;
    }
    if (mode !== "json" && !seedsValid) {
      setError("Seeds must be nonnegative integers, separated by commas.");
      return;
    }
    setError("");
    if (mode === "json") {
      try {
        const specification: unknown = JSON.parse(json);
        save.mutate({ specification, run });
      } catch {
        setError("Enter a valid JSON specification.");
      }
    } else if (!jsonDirty) save.mutate({ specification: design, run });
  }
  const activeSection =
    mode === "quick"
      ? "general"
      : mode !== "json" && step === "review"
        ? "review"
        : "advanced";
  const complete = Boolean(design.title.trim() && design.question.trim());
  function selectSection(value: string) {
    setStep(value);
    if (value === "json") changeMode(value);
    else if (mode === "json") changeMode("visual");
  }
  return (
    <form
      className="mx-auto w-full max-w-3xl"
      data-slot="experiment-editor"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "review" || mode === "json" || mode === "quick") submit();
      }}
    >
      <EditorHeading revision={!!studyId}>
        {agentChatId && (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={`/assistant?chat=${agentChatId}`}>
              <AgentIcon data-icon="inline-start" />
              Back to Assistant
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Experiment options"
              disabled={busy}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-max max-w-[calc(100vw-2rem)]"
          >
            <DropdownMenuGroup>
              {!studyId && !agentChatId && (
                <DropdownMenuItem asChild disabled={busy}>
                  <Link
                    to={`/assistant?new=${agentDraftId}`}
                    state={{
                      question: design.question
                        ? `Help me design an experiment to investigate: ${design.question}`
                        : "Help me design a new experiment.",
                    }}
                  >
                    Design with Assistant
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="whitespace-nowrap"
                disabled={busy}
                onSelect={() => {
                  setSetupNotice("");
                  saveEnvironment.mutate(false);
                }}
              >
                {savedSetup?.id
                  ? "Update custom environment"
                  : "Save custom environment"}
              </DropdownMenuItem>
              {savedSetup?.id && (
                <DropdownMenuItem
                  disabled={busy}
                  onSelect={() => {
                    setSetupNotice("");
                    saveEnvironment.mutate(true);
                  }}
                >
                  Save as new custom environment
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </EditorHeading>
      {setupNotice && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          {setupNotice}
        </p>
      )}
      {saveEnvironment.error && (
        <Alert variant="error">{saveEnvironment.error.message}</Alert>
      )}
      {reuse.error && <Alert variant="error">{reuse.error.message}</Alert>}
      <Tabs
        value={activeSection}
        className="gap-0"
        onValueChange={(value) => {
          if (busy) return;
          if (value === "general") {
            if (mode === "json" && jsonDirty) changeMode("quick");
            else setMode("quick");
          } else {
            if (value === "review") setStep("review");
            else if (step === "review") setStep("research");
            if (mode === "json") changeMode("visual");
            else setMode(jsonDirty ? "json" : "visual");
          }
        }}
      >
        <EditorNavigation disabled={busy} />
        <TabsContent
          value="general"
          forceMount
          hidden={activeSection !== "general"}
          className="flex flex-col gap-6 py-6 data-[state=inactive]:hidden"
        >
          <FieldSet disabled={busy || jsonDirty} className="min-w-0">
            <GeneralFields
              key={`${design.environment}:${formVersion}`}
              design={design}
              catalog={editorCatalog}
              onChange={setDesign}
              onEnvironmentChange={setPendingEnvironment}
              seedsInput={seedsInput}
              disabled={busy || jsonDirty}
              onEditAgents={() => {
                setMode("visual");
                setStep("agents");
              }}
            />
            {estimate.data?.unpriced_models.length ? (
              <Field>
                <FieldLabel htmlFor="quick-token-cap">Token ceiling</FieldLabel>
                <Input
                  id="quick-token-cap"
                  type="number"
                  min={1}
                  value={design.token_budget ?? ""}
                  onChange={(event) =>
                    setDesign({
                      ...design,
                      token_budget: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
                <FieldDescription>
                  Prices are unknown for{" "}
                  {estimate.data.unpriced_models.join(", ")}. A token ceiling is
                  required here or in Settings.
                </FieldDescription>
              </Field>
            ) : null}
          </FieldSet>
          {activeSection === "general" && jsonDirty && (
            <Alert title="Specification edits preserved">
              Your JSON draft is saved in Advanced. Apply it there before saving
              General.{" "}
              <Button
                type="button"
                size="sm"
                variant="link"
                onClick={() => setMode("json")}
              >
                Review specification
              </Button>
            </Alert>
          )}
          {complete && seedsValid && (
            <div
              id="estimate-summary"
              className="text-sm text-muted-foreground"
              aria-live="polite"
            >
              {!estimateCurrent || estimate.isPending
                ? "Updating estimate…"
                : estimate.error
                  ? "Resolve the protocol fields to estimate this experiment."
                  : estimate.data && (
                      <>
                        <strong className="font-medium text-foreground">
                          {estimate.data.runs} runs
                        </strong>{" "}
                        ·{" "}
                        {estimate.data.upper_usd == null
                          ? "dollar cost unknown"
                          : `up to ${money(estimate.data.upper_usd)}`}
                      </>
                    )}
            </div>
          )}
          {activeSection === "general" && currentCheck && (
            <ExperimentCheck report={currentCheck} design={design} />
          )}
          {(error || save.error || check.error) && (
            <Alert variant="error">
              {error || save.error?.message || check.error?.message}
            </Alert>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={busy || !seedsValid || !complete || jsonDirty}
              onClick={() => check.mutate(snapshot)}
            >
              {check.isPending ? "Checking…" : "Check experiment"}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={
                  busy ||
                  jsonDirty ||
                  !seedsValid ||
                  !complete ||
                  currentCheck?.status === "blocked"
                }
              >
                {studyId ? "Save version" : "Create"}
              </Button>
              <Button
                type="button"
                aria-describedby="estimate-summary"
                disabled={
                  busy ||
                  jsonDirty ||
                  !seedsValid ||
                  !complete ||
                  currentCheck?.status === "blocked" ||
                  !estimateCurrent ||
                  !estimate.data ||
                  !!estimate.error ||
                  (estimate.data.upper_usd == null &&
                    !design.token_budget &&
                    !settings.data?.preferences?.token_budget) ||
                  !settings.data ||
                  unavailableModels.length > 0
                }
                onClick={() => submit(true)}
              >
                {studyId ? "Save and run" : "Create and run"}
              </Button>
            </div>
          </div>
          {unavailableModels.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Add provider keys in{" "}
              <Link className="underline underline-offset-4" to="/settings">
                Settings
              </Link>{" "}
              to run.
            </p>
          )}
        </TabsContent>
        <div className="py-6" hidden={mode === "quick"}>
          <FieldSet disabled={busy} className="min-w-0 gap-0">
            <TabsContent
              value="advanced"
              forceMount
              hidden={activeSection !== "advanced"}
              className="data-[state=inactive]:hidden"
            >
              <Accordion
                type="single"
                collapsible
                value={mode === "json" ? "json" : step}
                onValueChange={selectSection}
              >
                <AccordionItem value="research">
                  <AccordionTrigger disabled={busy}>
                    Research plan
                  </AccordionTrigger>
                  <AccordionContent
                    forceMount
                    hidden={(mode === "json" ? "json" : step) !== "research"}
                    className="py-5"
                  >
                    <ResearchFields
                      design={design}
                      catalog={editorCatalog}
                      onChange={setDesign}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="agents">
                  <AccordionTrigger disabled={busy}>Agents</AccordionTrigger>
                  <AccordionContent
                    forceMount
                    hidden={(mode === "json" ? "json" : step) !== "agents"}
                    className="py-5"
                  >
                    <AgentFields
                      design={design}
                      catalog={catalog}
                      onChange={setDesign}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="conditions">
                  <AccordionTrigger disabled={busy}>
                    Conditions
                  </AccordionTrigger>
                  <AccordionContent
                    forceMount
                    hidden={(mode === "json" ? "json" : step) !== "conditions"}
                    className="py-5"
                  >
                    <div className="flex min-w-0 flex-col gap-8">
                      {design.environment_source && (
                        <EnvironmentExamples
                          key={design.environment_source.sha256}
                          design={design}
                          source={design.environment_source}
                          disabled={busy}
                          onApply={(example, bindings) =>
                            reuse.mutate({ example, bindings })
                          }
                        />
                      )}
                      <ConditionFields
                        design={design}
                        catalog={editorCatalog}
                        onChange={setDesign}
                      />
                      <TaskFields
                        key={formVersion}
                        design={design}
                        onChange={setDesign}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="execution">
                  <AccordionTrigger disabled={busy}>Run plan</AccordionTrigger>
                  <AccordionContent
                    forceMount
                    hidden={(mode === "json" ? "json" : step) !== "execution"}
                    className="py-5"
                  >
                    <ExecutionFields
                      key={formVersion}
                      design={design}
                      catalog={editorCatalog}
                      onChange={setDesign}
                      seedsInput={seedsInput}
                    />
                  </AccordionContent>
                </AccordionItem>
                {(settings.data?.preferences?.developer === true ||
                  jsonDirty) && (
                  <AccordionItem value="json">
                    <AccordionTrigger disabled={busy}>
                      Specification
                    </AccordionTrigger>
                    <AccordionContent
                      forceMount
                      hidden={(mode === "json" ? "json" : step) !== "json"}
                      className="py-5"
                    >
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="specification">
                            Complete JSON specification
                          </FieldLabel>
                          <Textarea
                            id="specification"
                            disabled={busy}
                            className="min-h-96 font-mono text-xs leading-relaxed"
                            spellCheck={false}
                            value={json}
                            onChange={(event) => {
                              setJson(event.target.value);
                              setJsonDirty(true);
                            }}
                          />
                          <FieldDescription>
                            Switching to a form section validates and applies
                            your edits. Unsupported fields and mechanics are
                            rejected.
                          </FieldDescription>
                        </Field>
                      </FieldGroup>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </TabsContent>
            <TabsContent value="review">
              <ExperimentReview
                design={design}
                catalog={editorCatalog}
                onEdit={(value) => {
                  if (value === "question") setMode("quick");
                  else setStep(value);
                }}
              />
              {explanation && (
                <Disclosure className="mt-6">
                  <DisclosureTrigger>Protocol notes</DisclosureTrigger>
                  <DisclosureContent className="flex flex-col gap-3 pt-3 text-sm text-muted-foreground">
                    <p>{explanation}</p>
                    {planning && (
                      <>
                        {planning.brief.intent && (
                          <p>
                            {planning.brief.intent === "exploratory"
                              ? "Exploratory design"
                              : "Confirmatory design"}
                          </p>
                        )}
                        <p>{planning.brief.operationalization}</p>
                        <p>{planning.brief.size_rationale}</p>
                        <ul className="flex flex-col gap-2">
                          {planning.sources.map((source) => (
                            <li key={source.url}>
                              <a
                                className="underline underline-offset-4"
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </DisclosureContent>
                </Disclosure>
              )}
            </TabsContent>
            {(error || save.error || validate.error) && (
              <div className="mt-5">
                <Alert variant="error">
                  {error || save.error?.message || validate.error?.message}
                </Alert>
              </div>
            )}
            {check.error && (
              <div className="mt-5">
                <Alert variant="error">{check.error.message}</Alert>
              </div>
            )}
            {mode !== "quick" && currentCheck && (
              <ExperimentCheck report={currentCheck} />
            )}
          </FieldSet>
          <Separator className="my-6" />
          <footer className="flex flex-col gap-4">
            <nav
              aria-label="Section navigation"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                {step === "review" || mode === "json" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => check.mutate(snapshot)}
                    >
                      {check.isPending && (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin motion-reduce:animate-none"
                          data-icon="inline-start"
                        />
                      )}
                      {check.isPending
                        ? "Checking mechanics…"
                        : "Check experiment"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        busy ||
                        (mode !== "json" && (!complete || !seedsValid)) ||
                        currentCheck?.status === "blocked"
                      }
                    >
                      {save.isPending && (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin motion-reduce:animate-none"
                          data-icon="inline-start"
                        />
                      )}
                      {studyId ? "Save new version" : "Create experiment"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep("review")}
                  >
                    Review experiment
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
              </div>
            </nav>
          </footer>
        </div>
      </Tabs>
      {check.data && !currentCheck && (
        <p className="pb-4 text-sm text-muted-foreground" role="status">
          Protocol changed. Check again for current findings.
        </p>
      )}
      {draftStatus && (
        <p
          className="pb-4 text-xs text-muted-foreground"
          role="status"
          aria-label="Draft status"
        >
          {draftStatus}
        </p>
      )}
      <AlertDialog
        open={pendingEnvironment !== null}
        onOpenChange={(open) => {
          if (!open) setPendingEnvironment(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change environment?</AlertDialogTitle>
            <AlertDialogDescription>
              Measurements will reset. Tasks and resource schedules that do not
              apply will be removed.
              {pendingEnvironment === "sealed_relay" && (
                <>
                  {" "}
                  This relay requires exactly two existing agents. The selected
                  example binds its roles to those agents in order; review the
                  bindings in Conditions before saving.
                </>
              )}
              {(pendingEnvironment === "distributed_coordination" ||
                pendingEnvironment === "reliance_commitments") && (
                <>
                  {" "}
                  This task binds the first{" "}
                  {pendingEnvironment === "reliance_commitments"
                    ? "four"
                    : "three"}{" "}
                  agents to local evidence and adds neutral agents if needed.
                  Existing agents are retained; remove any extra unbound agents
                  before saving.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                const value = pendingEnvironment;
                if (busy || !value) return;
                const env = catalog.environments.find(
                  (item) => item.key === value,
                );
                if (!env) return;
                if (value === "sealed_relay") {
                  const example = env.source.definition.examples[0];
                  reuse.mutate({
                    source: env.source,
                    example: example.key,
                    bindings: Object.fromEntries(
                      example.roles.map((role, index) => [
                        role,
                        design.profiles[index]?.key ?? "",
                      ]),
                    ),
                  });
                } else setDesign((design) => changeEnvironment(design, env));
                setPendingEnvironment(null);
              }}
            >
              Change environment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
