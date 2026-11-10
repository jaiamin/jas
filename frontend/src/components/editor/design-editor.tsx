import { useMutation } from "@tanstack/react-query";
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
  editorSections,
} from "@/components/editor/editor-layout";
import { EnvironmentExamples } from "@/components/editor/environment-examples";
import { ExecutionFields } from "@/components/editor/execution-fields";
import { ExperimentReview } from "@/components/editor/experiment-review";
import { QuestionFields } from "@/components/editor/question-fields";
import { TaskFields } from "@/components/editor/task-fields";
import { ExperimentCheck } from "@/components/experiment-check";
import { Alert } from "@/components/feedback";
import {
  AgentIcon,
  ArrowLeft,
  ArrowRight,
  Ellipsis,
  LoaderCircle,
} from "@/components/icons";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { changeEnvironment } from "@/lib/design";
import { type Draft, removeDraft, writeDraft } from "@/lib/drafts";
import type {
  Analysis,
  Catalog,
  Design,
  EnvironmentId,
  EnvironmentMechanics,
  ExperimentPreflight,
  SavedEnvironment,
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
}) {
  const [design, setDesign] = useState<Design>(() => structuredClone(initial));
  const [agentDraftId] = useState(() => crypto.randomUUID());
  const [json, setJson] = useState(draft?.json ?? "");
  const [mode, setMode] = useState<"visual" | "json">(draft?.mode ?? "visual");
  const [step, setStep] = useState(initialStep);
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
    JSON.stringify({ design, json, mode, savedSetup }),
  );
  useEffect(() => {
    const snapshot = JSON.stringify({ design, json, mode, savedSetup });
    if (snapshot === lastSnapshot.current) return;
    try {
      writeDraft(draftPath, design, json, mode, savedSetup);
      lastSnapshot.current = snapshot;
      setDraftStatus("Draft saved");
    } catch {
      setDraftStatus("Draft could not be saved in this browser");
    }
  }, [design, json, mode, draftPath, savedSetup]);
  const [error, setError] = useState("");
  const [setupNotice, setSetupNotice] = useState("");
  const [pendingEnvironment, setPendingEnvironment] =
    useState<EnvironmentId | null>(null);
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: (specification: unknown) =>
      api<{ id: string }>(
        studyId ? `/studies/${studyId}/revisions` : "/studies",
        { design: specification, plan_id: planId },
      ),
    onSuccess: (result) => {
      let notice: string | undefined;
      try {
        removeDraft(draftPath);
      } catch {
        notice = "Experiment saved. The browser draft could not be cleared.";
      }
      navigate(`/studies/${result.id}`, { state: { notice } });
    },
  });
  const environment = catalog.environments.find(
    (e) => e.key === design.environment,
  );
  if (!environment) throw new Error("Unknown environment in protocol");
  const validate = useMutation({
    mutationFn: (specification: unknown) =>
      api<Design>("/design/validate", { design: specification }),
    onSuccess: (validated) => {
      setDesign(validated);
      setFormVersion((version) => version + 1);
      setMode("visual");
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
    }: {
      example: string;
      bindings: Record<string, string>;
    }) =>
      api<Design>("/design/use-environment", {
        design,
        source: design.environment_source,
        example,
        bindings,
      }),
    onSuccess: (applied) => {
      setDesign(applied);
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
      setJson(JSON.stringify(design, null, 2));
      setMode(value);
    } else {
      try {
        validate.mutate(JSON.parse(json));
      } catch {
        setError(
          "The specification is not valid JSON. Fix it before switching views.",
        );
      }
    }
  }
  function submit() {
    if (busy || currentCheck?.status === "blocked") return;
    setError("");
    if (mode === "json") {
      try {
        const specification: unknown = JSON.parse(json);
        save.mutate(specification);
      } catch {
        setError("Enter a valid JSON specification.");
      }
    } else save.mutate(design);
  }
  const activeSection = mode === "json" ? "json" : step;
  const sectionIndex = editorSections.findIndex(
    (section) => section.value === step,
  );
  return (
    <form
      className="mx-auto w-full max-w-5xl"
      data-slot="experiment-editor"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "review" || mode === "json") submit();
      }}
    >
      <EditorHeading revision={!!studyId}>
        {!studyId && (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              to={
                agentChatId
                  ? `/agent?chat=${agentChatId}`
                  : `/agent?new=${agentDraftId}`
              }
              state={
                agentChatId
                  ? null
                  : {
                      question: `Help me design an experiment to investigate: ${design.question}`,
                    }
              }
            >
              <AgentIcon data-icon="inline-start" />
              {agentChatId ? "Back to Agent" : "Generate with Agent"}
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
      <Tabs
        value={activeSection}
        onValueChange={(value) => {
          if (value === "json") changeMode(value);
          else {
            setStep(value);
            if (mode === "json") changeMode("visual");
          }
        }}
        className="gap-0"
      >
        <EditorNavigation disabled={busy} />
        <div className="mx-auto w-full max-w-3xl py-7">
          <FieldSet disabled={busy} className="min-w-0 gap-0">
            <TabsContent
              value="question"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <QuestionFields
                design={design}
                catalog={catalog}
                onChange={setDesign}
                onEnvironmentChange={setPendingEnvironment}
                disabled={busy}
              />
            </TabsContent>
            <TabsContent
              value="agents"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <AgentFields
                design={design}
                catalog={catalog}
                onChange={setDesign}
              />
            </TabsContent>
            <TabsContent
              value="conditions"
              forceMount
              className="data-[state=inactive]:hidden"
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
                {reuse.error && (
                  <Alert variant="error">{reuse.error.message}</Alert>
                )}
                <ConditionFields
                  design={design}
                  catalog={catalog}
                  onChange={setDesign}
                />
                <TaskFields
                  key={formVersion}
                  design={design}
                  onChange={setDesign}
                />
              </div>
            </TabsContent>
            <TabsContent
              value="execution"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <ExecutionFields
                key={formVersion}
                design={design}
                catalog={catalog}
                onChange={setDesign}
              />
            </TabsContent>
            <TabsContent
              value="review"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <ExperimentReview
                design={design}
                catalog={catalog}
                onEdit={setStep}
              />
              {explanation && (
                <Disclosure className="mt-6">
                  <DisclosureTrigger>Protocol notes</DisclosureTrigger>
                  <DisclosureContent className="flex flex-col gap-3 pt-3 text-sm text-muted-foreground">
                    <p>{explanation}</p>
                    {planning && (
                      <>
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
            <TabsContent
              value="json"
              forceMount
              className="data-[state=inactive]:hidden"
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
                    onChange={(event) => setJson(event.target.value)}
                  />
                  <FieldDescription>
                    Switching to a form section validates and applies your
                    edits. Unsupported fields and mechanics are rejected.
                  </FieldDescription>
                </Field>
              </FieldGroup>
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
            {check.data && !currentCheck && (
              <p className="mt-5 text-sm text-muted-foreground" role="status">
                Protocol changed. Check again for current findings.
              </p>
            )}
            {currentCheck && <ExperimentCheck report={currentCheck} />}
          </FieldSet>
          <Separator className="my-6" />
          <footer className="flex flex-col gap-4">
            <nav
              aria-label="Section navigation"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                {mode === "visual" && sectionIndex > 0 && step !== "review" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setStep(
                        editorSections[sectionIndex - 1]?.value ?? "question",
                      )
                    }
                  >
                    <ArrowLeft data-icon="inline-start" />
                    Back
                  </Button>
                )}
              </div>
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
                      disabled={busy || currentCheck?.status === "blocked"}
                    >
                      {save.isPending && (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin motion-reduce:animate-none"
                          data-icon="inline-start"
                        />
                      )}
                      {studyId ? "Save new revision" : "Create experiment"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setStep(
                        editorSections[sectionIndex + 1]?.value ?? "review",
                      )
                    }
                  >
                    Continue
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
              </div>
            </nav>
            <div className="flex min-h-4 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span role="status" title="Saved in this browser">
                {draftStatus || "Changes save in this browser"}
              </span>
              <span>Nothing runs until you choose.</span>
            </div>
          </footer>
        </div>
      </Tabs>
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
              {pendingEnvironment === "distributed_coordination" && (
                <>
                  {" "}
                  This task binds the first three agents to local evidence and
                  adds neutral agents if needed. Existing agents are retained;
                  remove any extra unbound agents before saving.
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
                setDesign((design) => changeEnvironment(design, env));
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
