import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Code2,
  LoaderCircle,
  MessageSquare,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { AgentFields } from "@/components/editor/agent-fields";
import { ConditionFields } from "@/components/editor/condition-fields";
import { ExecutionFields } from "@/components/editor/execution-fields";
import { TaskFields } from "@/components/editor/task-fields";
import { ExperimentCheck } from "@/components/experiment-check";
import { PageHeading } from "@/components/shared";
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
import { Alert } from "@/components/ui/data";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { changeEnvironment } from "@/lib/design";
import { type Draft, removeDraft, writeDraft } from "@/lib/drafts";
import { saveSetup } from "@/lib/setups";
import type {
  Analysis,
  Catalog,
  Design,
  EnvironmentId,
  ExperimentPreflight,
} from "@/lib/types";
import { money } from "@/lib/utils";

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
}) {
  const [design, setDesign] = useState<Design>(() => structuredClone(initial));
  const [agentDraftId] = useState(() => crypto.randomUUID());
  const [json, setJson] = useState(draft?.json ?? "");
  const [mode, setMode] = useState<"visual" | "json">(draft?.mode ?? "visual");
  const [step, setStep] = useState(initialStep);
  const [draftStatus, setDraftStatus] = useState(draft ? "Draft saved" : "");
  const lastSnapshot = useRef(JSON.stringify({ design, json, mode }));
  useEffect(() => {
    const snapshot = JSON.stringify({ design, json, mode });
    if (snapshot === lastSnapshot.current) return;
    try {
      writeDraft(draftPath, design, json, mode);
      lastSnapshot.current = snapshot;
      setDraftStatus("Draft saved");
    } catch {
      setDraftStatus("Draft could not be saved in this browser");
    }
  }, [design, json, mode, draftPath]);
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
  const runCount =
    design.conditions.length * design.seeds.length * design.repetitions;
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    setDesign((previous) => ({ ...previous, [key]: value }));
  }
  const validate = useMutation({
    mutationFn: (specification: unknown) =>
      api<Design>("/design/validate", { design: specification }),
    onSuccess: (validated) => {
      setDesign(validated);
      setMode("visual");
      setError("");
    },
  });
  const saveEnvironment = useMutation({
    mutationFn: async () => {
      const validated = await api<Design>("/design/validate", {
        design: mode === "json" ? JSON.parse(json) : design,
      });
      const rules = catalog.environments.find(
        (item) => item.key === validated.environment,
      )?.rule_version;
      if (!rules) throw new Error("Unknown environment rules.");
      saveSetup(validated, rules, setupId ?? undefined);
    },
    onSuccess: () =>
      setSetupNotice(
        "Setup saved in this browser. Reuse or edit it from Environments.",
      ),
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
    if (busy) return;
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
  return (
    <>
      <PageHeading title={studyId ? "Tune experiment" : "New experiment"}>
        {!studyId && (
          <Button variant="outline" size="sm" asChild>
            <Link
              to={
                agentChatId
                  ? `/agent?chat=${agentChatId}`
                  : `/agent?context=new&new=${agentDraftId}`
              }
              state={agentChatId ? null : { question: design.question }}
            >
              <MessageSquare data-icon="inline-start" />
              {agentChatId ? "Back to Agent" : "Generate with Agent"}
            </Link>
          </Button>
        )}
        {draftStatus && (
          <span
            className="draft-state"
            role="status"
            title="Saved in this browser"
          >
            {draftStatus}
          </span>
        )}
      </PageHeading>
      <div className="setup-actions">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            setSetupNotice("");
            saveEnvironment.mutate();
          }}
        >
          {setupId ? "Update saved setup" : "Save reusable setup"}
        </Button>
        <span className="muted">
          Keep these rules, roles and conditions for another experiment.
        </span>
      </div>
      {setupNotice && (
        <p role="status" className="muted">
          {setupNotice}
        </p>
      )}
      {saveEnvironment.error && (
        <Alert variant="error">{saveEnvironment.error.message}</Alert>
      )}
      {explanation && (
        <Disclosure className="disclosure design-explanation">
          <DisclosureTrigger>Protocol notes</DisclosureTrigger>
          <DisclosureContent>
            <p>{explanation}</p>
            {planning && (
              <>
                <p>{planning.brief.size_rationale}</p>
                <ul>
                  {planning.sources.slice(0, 5).map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
                {planning.sources.length > 5 && (
                  <Disclosure className="disclosure">
                    <DisclosureTrigger>
                      {planning.sources.length - 5} more sources
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <ul>
                        {planning.sources.slice(5).map((source) => (
                          <li key={source.url}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </DisclosureContent>
                  </Disclosure>
                )}
              </>
            )}
          </DisclosureContent>
        </Disclosure>
      )}
      <div className="editor-layout">
        <fieldset className="editor-main" disabled={busy}>
          <Tabs
            value={mode === "json" ? "json" : step}
            onValueChange={(value) => {
              if (value === "json") changeMode(value);
              else {
                setStep(value);
                if (mode === "json") changeMode("visual");
              }
            }}
          >
            <TabsList variant="line">
              <TabsTrigger disabled={busy} value="question">
                Question
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="agents">
                Agents{" "}
                <span className="tab-count">{design.profiles.length}</span>
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="conditions">
                Conditions{" "}
                <span className="tab-count">{design.conditions.length}</span>
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="execution">
                Execution
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="json">
                <Code2 />
                Specification
              </TabsTrigger>
            </TabsList>
            <TabsContent value="json">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="specification">
                    Complete JSON specification
                  </FieldLabel>
                  <Textarea
                    id="specification"
                    disabled={busy}
                    className="specification-editor"
                    spellCheck={false}
                    value={json}
                    onChange={(e) => setJson(e.target.value)}
                  />
                  <FieldDescription>
                    Validated by the backend. Unsupported fields and mechanics
                    are rejected.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </TabsContent>
            <TabsContent value={step}>
              <section className="form-section" hidden={step !== "question"}>
                <h2>Research question</h2>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="title">Experiment name</FieldLabel>
                    <Input
                      id="title"
                      value={design.title}
                      maxLength={100}
                      onChange={(e) => update("title", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="question">
                      What do you want to understand?
                    </FieldLabel>
                    <Textarea
                      id="question"
                      rows={2}
                      value={design.question}
                      maxLength={4000}
                      onChange={(e) => update("question", e.target.value)}
                    />
                  </Field>
                  <Disclosure className="disclosure">
                    <DisclosureTrigger>Hypothesis</DisclosureTrigger>
                    <DisclosureContent>
                      <Field>
                        <FieldLabel htmlFor="hypothesis">Hypothesis</FieldLabel>
                        <Input
                          id="hypothesis"
                          placeholder="An expected pattern to investigate"
                          value={design.hypothesis}
                          onChange={(e) => update("hypothesis", e.target.value)}
                        />
                      </Field>
                    </DisclosureContent>
                  </Disclosure>
                  <Field>
                    <FieldLabel>Environment</FieldLabel>
                    <Select
                      label="Environment"
                      value={design.environment}
                      disabled={busy}
                      onValueChange={(value) => setPendingEnvironment(value)}
                      options={catalog.environments.map((e) => ({
                        value: e.key,
                        label: e.name,
                      }))}
                    />
                    <FieldDescription>
                      {environment.description}
                    </FieldDescription>
                  </Field>
                  <Disclosure className="disclosure">
                    <DisclosureTrigger>Scenario context</DisclosureTrigger>
                    <DisclosureContent>
                      <Field>
                        <FieldLabel htmlFor="context">
                          Scenario context{" "}
                          <span className="optional">optional</span>
                        </FieldLabel>
                        <Textarea
                          id="context"
                          rows={2}
                          placeholder="Put the interaction in a meaningful setting. Rules remain defined by the environment."
                          value={design.context}
                          onChange={(e) => update("context", e.target.value)}
                        />
                      </Field>
                    </DisclosureContent>
                  </Disclosure>
                </FieldGroup>
              </section>
              <AgentFields
                hidden={step !== "agents"}
                design={design}
                catalog={catalog}
                onChange={setDesign}
              />
              <ConditionFields
                hidden={step !== "conditions"}
                design={design}
                catalog={catalog}
                onChange={setDesign}
              />
              <TaskFields
                hidden={step !== "conditions"}
                design={design}
                onChange={setDesign}
              />
              <ExecutionFields
                hidden={step !== "execution"}
                design={design}
                catalog={catalog}
                onChange={setDesign}
                setError={setError}
              />
            </TabsContent>
          </Tabs>
          {(error || save.error || validate.error) && (
            <Alert variant="error">
              {error || save.error?.message || validate.error?.message}
            </Alert>
          )}
          {mode === "visual" && step !== "execution" && (
            <div className="editor-next">
              <Button
                variant="outline"
                onClick={() =>
                  setStep(
                    step === "question"
                      ? "agents"
                      : step === "agents"
                        ? "conditions"
                        : "execution",
                  )
                }
              >
                Continue
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          )}
        </fieldset>
        <aside className="design-summary">
          <h2>Execution plan</h2>
          <dl>
            <div>
              <dt>Environment</dt>
              <dd>{environment.name}</dd>
            </div>
            <div>
              <dt>Agents per run</dt>
              <dd>{design.profiles.length}</dd>
            </div>
            <div>
              <dt>Conditions</dt>
              <dd>{design.conditions.length}</dd>
            </div>
            <div>
              <dt>Independent runs</dt>
              <dd>{runCount}</dd>
            </div>
            <div>
              <dt>Maximum decisions</dt>
              <dd>
                {(
                  runCount *
                  design.rounds *
                  design.profiles.length
                ).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Spending ceiling</dt>
              <dd>{money(design.budget_usd)}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => check.mutate(snapshot)}
          >
            {check.isPending ? "Checking mechanics…" : "Check experiment"}
          </Button>
          {check.error && <Alert variant="error">{check.error.message}</Alert>}
          {check.data && !currentCheck && (
            <p className="muted" role="status">
              Protocol changed. Check again for current findings.
            </p>
          )}
          {currentCheck && <ExperimentCheck report={currentCheck} />}
          <div className="form-submit editor-save">
            <Button
              onClick={submit}
              disabled={busy || currentCheck?.status === "blocked"}
            >
              {save.isPending ? (
                <LoaderCircle className="spin" data-icon="inline-start" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              {studyId ? "Save new revision" : "Create experiment"}
            </Button>
            <span>Review now. Run when ready.</span>
          </div>
          <Disclosure className="disclosure">
            <DisclosureTrigger>What stays fixed</DisclosureTrigger>
            <DisclosureContent>
              <p>
                Saving creates runs with this protocol. Tuning creates a new
                revision; earlier runs and evidence keep their original rules.
                Environment mechanics are defined by the installed adapter.
              </p>
            </DisclosureContent>
          </Disclosure>
        </aside>
      </div>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                const value = pendingEnvironment;
                if (busy || !value) return;
                const env = catalog.environments.find((e) => e.key === value);
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
    </>
  );
}
