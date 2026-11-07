import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Code2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { AgentFields } from "@/components/editor/agent-fields";
import { ConditionFields } from "@/components/editor/condition-fields";
import { ExecutionFields } from "@/components/editor/execution-fields";
import { TaskFields } from "@/components/editor/task-fields";
import { PlanningProgress } from "@/components/planning-progress";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
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
import { Alert, Empty } from "@/components/ui/data";
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
import { api, useApi } from "@/lib/api";
import {
  type Draft,
  editorDraftPath,
  readDraft,
  removeDraft,
  writeDraft,
} from "@/lib/drafts";
import type {
  Analysis,
  Catalog,
  Design,
  EnvironmentId,
  StudyDetail,
} from "@/lib/types";
import { money } from "@/lib/utils";

export default function Editor() {
  const [params] = useSearchParams();
  const location = useLocation();
  const draftPath = editorDraftPath(location.pathname, location.search);
  const [recoverDraft, setRecoverDraft] = useState(false);
  const draft = useQuery({
    queryKey: ["draft", draftPath],
    queryFn: async () => {
      const saved = readDraft(draftPath);
      if (!saved) return null;
      try {
        const design = await api<Design>("/design/validate", {
          design: saved.design,
        });
        return { saved, design, error: null };
      } catch (error) {
        return { saved, design: null, error: error as Error };
      }
    },
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const catalog = useApi<Catalog>("/catalog");
  const planId = params.get("plan");
  const studyId = params.get("study");
  const plan = useQuery({
    queryKey: ["/analyses", planId],
    queryFn: () => api<Analysis>(`/analyses/${planId}`),
    enabled: !!planId,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  const previous = useQuery({
    queryKey: ["/studies", studyId, params.get("revision")],
    queryFn: () =>
      api<StudyDetail>(
        `/studies/${studyId}${params.get("revision") ? `?revision=${params.get("revision")}` : ""}`,
      ),
    enabled: !!studyId,
  });
  if (draft.error)
    return (
      <>
        <ErrorState error={draft.error} />
        <Button
          variant="outline"
          onClick={() => {
            removeDraft(draftPath);
            draft.refetch();
          }}
        >
          Discard unreadable draft
        </Button>
      </>
    );
  if (catalog.error || plan.error || previous.error)
    return (
      <ErrorState
        error={(catalog.error || plan.error || previous.error) as Error}
      />
    );
  if (!catalog.data || draft.isPending || (studyId && !previous.data))
    return <Loading />;
  if (draft.data?.error && !recoverDraft)
    return (
      <>
        <PageHeading title="Recover your draft" />
        <Alert variant="error">{draft.data.error.message}</Alert>
        <div className="actions">
          <Button onClick={() => setRecoverDraft(true)}>
            Edit specification
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              removeDraft(draftPath);
              draft.refetch();
            }}
          >
            Discard draft
          </Button>
        </div>
      </>
    );
  if (planId && (!plan.data || plan.data.status === "pending"))
    return (
      <>
        <PageHeading title="Designing your experiment" />
        <PlanningProgress plan={plan.data} />
      </>
    );
  if (plan.data?.status === "failed")
    return (
      <>
        <PageHeading title="Design request stopped" />
        <Alert variant="error">{plan.data.error}</Alert>
        <Button variant="outline" asChild>
          <Link to="/design" state={{ question: plan.data.question }}>
            Return to your question
          </Link>
        </Button>
      </>
    );
  if (plan.data?.output?.supported === false)
    return (
      <>
        <PageHeading title="This question needs different capabilities" />
        <Alert title="No experiment was invented">
          {plan.data.output.explanation}
        </Alert>
        <Empty
          title="Keep the question. Change the method."
          description="Explore the supported mechanics, or start a custom study with an explicit scope."
        >
          <Button variant="outline" asChild>
            <Link to="/environments">
              Explore environments
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </Empty>
      </>
    );
  const initial =
    draft.data?.design ??
    plan.data?.output?.design ??
    previous.data?.design ??
    catalog.data.templates.find((t) => t.id === params.get("template"))
      ?.design ??
    catalog.data.templates[0]?.design;
  if (!initial) return <Loading />;
  return (
    <DesignEditor
      key={draftPath}
      initial={initial}
      catalog={catalog.data}
      studyId={studyId}
      planId={planId}
      explanation={plan.data?.output?.explanation}
      planning={plan.data?.output?.planning}
      draftPath={draftPath}
      draft={
        recoverDraft && draft.data
          ? {
              ...draft.data.saved,
              mode: "json",
              json:
                draft.data.saved.mode === "json"
                  ? draft.data.saved.json
                  : JSON.stringify(draft.data.saved.design, null, 2),
            }
          : draft.data?.saved
      }
    />
  );
}

function DesignEditor({
  initial,
  catalog,
  studyId,
  planId,
  explanation,
  planning,
  draftPath,
  draft,
}: {
  initial: Design;
  catalog: Catalog;
  studyId: string | null;
  planId: string | null;
  explanation?: string;
  planning?: NonNullable<Analysis["output"]>["planning"];
  draftPath: string;
  draft?: Draft;
}) {
  const [design, setDesign] = useState<Design>(() =>
    structuredClone({
      ...initial,
      tasks: initial.tasks ?? [],
      conditions: initial.conditions.map((c) => ({
        ...c,
        parameters: {
          ...catalog.templates.find((t) => t.id === initial.environment)?.design
            .conditions[0]?.parameters,
          ...c.parameters,
          resource_schedule: c.parameters.resource_schedule ?? [],
        },
        profile_overrides: c.profile_overrides ?? [],
      })),
    }),
  );
  const [json, setJson] = useState(draft?.json ?? "");
  const [mode, setMode] = useState<"visual" | "json">(draft?.mode ?? "visual");
  const [step, setStep] = useState("question");
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
  const [pendingEnvironment, setPendingEnvironment] =
    useState<EnvironmentId | null>(null);
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: (specification: Design) =>
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
  function changeMode(value: string) {
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
    setError("");
    if (mode === "json") {
      try {
        save.mutate(JSON.parse(json) as Design);
      } catch {
        setError("Enter a valid JSON specification.");
      }
    } else save.mutate(design);
  }
  return (
    <>
      <PageHeading
        title={studyId ? "Tune experiment" : "New experiment"}
        description={
          studyId
            ? "Save a new revision. Earlier runs keep their original design."
            : undefined
        }
      >
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
      {explanation && (
        <Disclosure className="disclosure design-explanation">
          <DisclosureTrigger>AI design notes</DisclosureTrigger>
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
        <div className="editor-main">
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
              <TabsTrigger value="question">Question</TabsTrigger>
              <TabsTrigger value="agents">
                Agents{" "}
                <span className="tab-count">{design.profiles.length}</span>
              </TabsTrigger>
              <TabsTrigger value="conditions">
                Conditions{" "}
                <span className="tab-count">{design.conditions.length}</span>
              </TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="json">
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
                      onValueChange={(value) =>
                        setPendingEnvironment(value as EnvironmentId)
                      }
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
                design={design}
                catalog={catalog}
                onChange={setDesign}
                hidden={step !== "agents"}
              />
              <ConditionFields
                design={design}
                catalog={catalog}
                onChange={setDesign}
                hidden={step !== "conditions"}
              />
              <TaskFields
                design={design}
                onChange={setDesign}
                hidden={step !== "conditions"}
              />
              <ExecutionFields
                design={design}
                catalog={catalog}
                onChange={setDesign}
                hidden={step !== "execution"}
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
        </div>
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
          <div className="form-submit editor-save">
            <Button
              onClick={submit}
              disabled={save.isPending || validate.isPending}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const value = pendingEnvironment;
                if (!value) return;
                const env = catalog.environments.find((e) => e.key === value);
                if (!env) return;
                setDesign({
                  ...design,
                  environment: value,
                  measures: env.measures.slice(0, 3),
                  tasks: value === "coordination" ? design.tasks : [],
                  conditions: design.conditions.map((condition) => ({
                    ...condition,
                    parameters: {
                      ...condition.parameters,
                      resource_schedule: ["commons", "trust_exchange"].includes(
                        value,
                      )
                        ? condition.parameters.resource_schedule
                        : [],
                    },
                  })),
                });
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
