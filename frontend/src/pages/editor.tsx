import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Empty } from "@/components/ui/data";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useApi } from "@/lib/api";
import type {
  Analysis,
  Catalog,
  Design,
  EnvironmentId,
  ModelId,
  Parameters,
  Profile,
  StudyDetail,
  Treatment,
} from "@/lib/types";
import { label, modelLabel, money } from "@/lib/utils";

export default function Editor() {
  const [params] = useSearchParams();
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
  if (catalog.error || plan.error || previous.error)
    return (
      <ErrorState
        error={(catalog.error || plan.error || previous.error) as Error}
      />
    );
  if (!catalog.data || (studyId && !previous.data)) return <Loading />;
  if (planId && (!plan.data || plan.data.status === "pending"))
    return (
      <>
        <PageHeading
          title="Designing your experiment"
          description="Translating your question into explicit mechanics, conditions, and measurements."
        />
        <div className="planning-state">
          <LoaderCircle className="spin" />
          <h2>Building a testable protocol</h2>
          <p>{plan.data?.question}</p>
          <p className="muted">
            You can leave this page. The design request continues on the server.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">Back to workspace</Link>
          </Button>
        </div>
      </>
    );
  if (plan.data?.status === "failed")
    return (
      <>
        <PageHeading title="Design request stopped" />
        <Alert variant="error">{plan.data.error}</Alert>
        <Button variant="outline" asChild>
          <Link to="/">Return to your question</Link>
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
    plan.data?.output?.design ??
    previous.data?.design ??
    catalog.data.templates.find((t) => t.id === params.get("template"))
      ?.design ??
    catalog.data.templates[0]?.design;
  if (!initial) return <Loading />;
  return (
    <DesignEditor
      key={planId ?? studyId ?? params.get("template") ?? "new"}
      initial={initial}
      catalog={catalog.data}
      studyId={studyId}
      explanation={plan.data?.output?.explanation}
    />
  );
}

function DesignEditor({
  initial,
  catalog,
  studyId,
  explanation,
}: {
  initial: Design;
  catalog: Catalog;
  studyId: string | null;
  explanation?: string;
}) {
  const [design, setDesign] = useState<Design>(() =>
    structuredClone({
      ...initial,
      tasks: initial.tasks ?? [],
      conditions: initial.conditions.map((c) => ({
        ...c,
        parameters: {
          ...c.parameters,
          resource_schedule: c.parameters.resource_schedule ?? [],
        },
        profile_overrides: c.profile_overrides ?? [],
      })),
    }),
  );
  const [json, setJson] = useState("");
  const [mode, setMode] = useState("visual");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: (specification: Design) =>
      api<{ id: string }>(
        studyId ? `/studies/${studyId}/revisions` : "/studies",
        { design: specification },
      ),
    onSuccess: (result) => navigate(`/studies/${result.id}`),
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
  function profile(index: number, value: Partial<Profile>) {
    update(
      "profiles",
      design.profiles.map((p, i) => (i === index ? { ...p, ...value } : p)),
    );
  }
  function condition(index: number, value: Partial<Treatment>) {
    update(
      "conditions",
      design.conditions.map((c, i) => (i === index ? { ...c, ...value } : c)),
    );
  }
  function parameter<K extends keyof Parameters>(
    index: number,
    key: K,
    value: Parameters[K],
  ) {
    const c = design.conditions[index];
    if (c) condition(index, { parameters: { ...c.parameters, [key]: value } });
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
      <div className="back-link">
        <Link to={studyId ? `/studies/${studyId}` : "/"}>
          <ArrowLeft />
          {studyId ? "Back to experiment" : "Back to workspace"}
        </Link>
      </div>
      <PageHeading
        title={studyId ? "Tune experiment" : "New experiment"}
        description={
          studyId
            ? "Save a new revision. Earlier runs keep their original design."
            : "Make the rules, treatments, and measurements explicit."
        }
      />
      {explanation && <Alert title="AI-proposed protocol">{explanation}</Alert>}
      <div className="editor-layout">
        <div className="editor-main">
          <Tabs value={mode} onValueChange={changeMode}>
            <TabsList>
              <TabsTrigger value="visual">Study design</TabsTrigger>
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
            <TabsContent value="visual">
              <section className="form-section">
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
                  <Field>
                    <FieldLabel htmlFor="hypothesis">Hypothesis</FieldLabel>
                    <Input
                      id="hypothesis"
                      placeholder="An expected pattern to investigate"
                      value={design.hypothesis}
                      onChange={(e) => update("hypothesis", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Environment</FieldLabel>
                    <Select
                      label="Environment"
                      value={design.environment}
                      onValueChange={(value) => {
                        const env = catalog.environments.find(
                          (e) => e.key === value,
                        );
                        if (!env) return;
                        setDesign({
                          ...design,
                          environment: value as EnvironmentId,
                          measures: env.measures.slice(0, 3),
                          tasks: value === "coordination" ? design.tasks : [],
                          conditions: design.conditions.map((condition) => ({
                            ...condition,
                            parameters: {
                              ...condition.parameters,
                              resource_schedule:
                                value === "coordination"
                                  ? []
                                  : condition.parameters.resource_schedule,
                            },
                          })),
                        });
                      }}
                      options={catalog.environments.map((e) => ({
                        value: e.key,
                        label: e.name,
                      }))}
                    />
                    <FieldDescription>
                      {environment.description}
                    </FieldDescription>
                  </Field>
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
                </FieldGroup>
              </section>
              <section className="form-section">
                <div className="section-heading">
                  <div>
                    <h2>Agents</h2>
                    <p>
                      Private goals and declared roles. Behavior comes from the
                      model.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={design.profiles.length >= 12}
                    onClick={() => {
                      let n = design.profiles.length + 1;
                      while (
                        design.profiles.some((p) => p.key === `agent-${n}`)
                      )
                        n++;
                      update("profiles", [
                        ...design.profiles,
                        {
                          key: `agent-${n}`,
                          name: `Agent ${n}`,
                          role: "Participant",
                          model: null,
                          goal: "Pursue your goals under the environment's rules.",
                        },
                      ]);
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    Add agent
                  </Button>
                </div>
                <div className="profile-list">
                  {design.profiles.map((p, i) => (
                    <div className="profile-editor" key={p.key}>
                      <div className="profile-avatar" data-series={i % 6}>
                        {p.name.slice(0, 1)}
                      </div>
                      <FieldGroup className="profile-fields">
                        <Field>
                          <FieldLabel htmlFor={`agent-${p.key}-name`}>
                            Name
                          </FieldLabel>
                          <Input
                            id={`agent-${p.key}-name`}
                            value={p.name}
                            onChange={(e) =>
                              profile(i, { name: e.target.value })
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`agent-${p.key}-role`}>
                            Role
                          </FieldLabel>
                          <Input
                            id={`agent-${p.key}-role`}
                            value={p.role}
                            onChange={(e) =>
                              profile(i, { role: e.target.value })
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Model</FieldLabel>
                          <Select
                            label={`Model for ${p.name}`}
                            value={p.model ?? "inherit"}
                            onValueChange={(value) =>
                              profile(i, {
                                model:
                                  value === "inherit"
                                    ? null
                                    : (value as ModelId),
                              })
                            }
                            options={[
                              { value: "inherit", label: "Condition default" },
                              ...catalog.models.map((m) => ({
                                value: m.id,
                                label: modelLabel(m.id),
                              })),
                            ]}
                          />
                        </Field>
                        <Field className="profile-goal">
                          <FieldLabel htmlFor={`agent-${p.key}-goal`}>
                            Private goal
                          </FieldLabel>
                          <Textarea
                            id={`agent-${p.key}-goal`}
                            rows={2}
                            value={p.goal}
                            onChange={(e) =>
                              profile(i, { goal: e.target.value })
                            }
                          />
                        </Field>
                      </FieldGroup>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${p.name}`}
                        disabled={design.profiles.length <= 2}
                        onClick={() =>
                          update(
                            "profiles",
                            design.profiles.filter((_, index) => index !== i),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="form-section">
                <div className="section-heading">
                  <div>
                    <h2>Conditions</h2>
                    <p>Change one factor at a time for a clearer comparison.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={design.conditions.length >= 6}
                    onClick={() => {
                      let n = design.conditions.length + 1;
                      while (
                        design.conditions.some(
                          (c) => c.key === `condition-${n}`,
                        )
                      )
                        n++;
                      const base = design.conditions[0];
                      if (!base) return;
                      update("conditions", [
                        ...design.conditions,
                        structuredClone({
                          ...base,
                          key: `condition-${n}`,
                          name: `Condition ${n}`,
                        }),
                      ]);
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    Add condition
                  </Button>
                </div>
                <div className="condition-list">
                  {design.conditions.map((c, i) => (
                    <div className="condition-editor" key={c.key}>
                      <div className="condition-heading">
                        <span className="condition-index" data-series={i % 6}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <Input
                          aria-label={`Condition ${i + 1} name`}
                          value={c.name}
                          onChange={(e) =>
                            condition(i, { name: e.target.value })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove condition ${i + 1}`}
                          disabled={design.conditions.length <= 1}
                          onClick={() =>
                            update(
                              "conditions",
                              design.conditions.filter(
                                (_, index) => index !== i,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <FieldGroup className="condition-fields">
                        <Field>
                          <FieldLabel>Model</FieldLabel>
                          <Select
                            label={`Condition ${i + 1} model`}
                            value={c.model}
                            onValueChange={(v) =>
                              condition(i, { model: v as ModelId })
                            }
                            options={catalog.models.map((m) => ({
                              value: m.id,
                              label: modelLabel(m.id),
                            }))}
                          />
                        </Field>
                        {design.environment !== "coordination" ? (
                          <>
                            <Field>
                              <FieldLabel htmlFor={`endowment-${c.key}`}>
                                Credits per round
                              </FieldLabel>
                              <Input
                                id={`endowment-${c.key}`}
                                type="number"
                                min={2}
                                max={100}
                                value={c.parameters.endowment}
                                onChange={(e) =>
                                  parameter(
                                    i,
                                    "endowment",
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`multiplier-${c.key}`}>
                                Return multiplier
                              </FieldLabel>
                              <Input
                                id={`multiplier-${c.key}`}
                                type="number"
                                min={1}
                                max={5}
                                step={0.1}
                                value={c.parameters.multiplier}
                                onChange={(e) =>
                                  parameter(
                                    i,
                                    "multiplier",
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </Field>
                          </>
                        ) : (
                          <Field>
                            <FieldLabel htmlFor={`tasks-${c.key}`}>
                              Task count
                            </FieldLabel>
                            <Input
                              id={`tasks-${c.key}`}
                              type="number"
                              min={3}
                              max={30}
                              disabled={design.tasks.length > 0}
                              value={
                                design.tasks.length || c.parameters.task_count
                              }
                              onChange={(e) =>
                                parameter(
                                  i,
                                  "task_count",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </Field>
                        )}
                        <Field>
                          <FieldLabel>Retained memory</FieldLabel>
                          <Select
                            label={`Condition ${i + 1} memory`}
                            value={c.parameters.memory}
                            onValueChange={(v) =>
                              parameter(i, "memory", v as Parameters["memory"])
                            }
                            options={[
                              {
                                value: "episodic",
                                label: "Experiences + notes",
                              },
                              {
                                value: "notes",
                                label: "Notes + public history",
                              },
                              { value: "none", label: "No retained history" },
                            ]}
                          />
                        </Field>
                      </FieldGroup>
                      {design.environment !== "coordination" && (
                        <details className="disclosure">
                          <summary>
                            Resource changes during the run
                            {c.parameters.resource_schedule.length > 0 &&
                              ` · ${c.parameters.resource_schedule.length}`}
                          </summary>
                          <p className="table-note">
                            Changes take effect at the start of a round and
                            persist. Agents see the new budget when it changes;
                            future changes are hidden.
                          </p>
                          {c.parameters.resource_schedule.map((change, j) => (
                            <FieldGroup
                              className="condition-fields"
                              key={
                                // biome-ignore lint/suspicious/noArrayIndexKey: Controlled fields retain focus while the round is edited; rows are never reordered.
                                `${c.key}-change-${j}`
                              }
                            >
                              <Field>
                                <FieldLabel
                                  htmlFor={`${c.key}-change-round-${j}`}
                                >
                                  Starting round
                                </FieldLabel>
                                <Input
                                  id={`${c.key}-change-round-${j}`}
                                  type="number"
                                  min={2}
                                  max={design.rounds}
                                  value={change.round}
                                  onChange={(e) =>
                                    parameter(
                                      i,
                                      "resource_schedule",
                                      c.parameters.resource_schedule.map(
                                        (v, k) =>
                                          k === j
                                            ? {
                                                ...v,
                                                round: Number(e.target.value),
                                              }
                                            : v,
                                      ),
                                    )
                                  }
                                />
                              </Field>
                              <Field>
                                <FieldLabel
                                  htmlFor={`${c.key}-change-credits-${j}`}
                                >
                                  Credits per round
                                </FieldLabel>
                                <Input
                                  id={`${c.key}-change-credits-${j}`}
                                  type="number"
                                  min={2}
                                  max={100}
                                  value={change.endowment}
                                  onChange={(e) =>
                                    parameter(
                                      i,
                                      "resource_schedule",
                                      c.parameters.resource_schedule.map(
                                        (v, k) =>
                                          k === j
                                            ? {
                                                ...v,
                                                endowment: Number(
                                                  e.target.value,
                                                ),
                                              }
                                            : v,
                                      ),
                                    )
                                  }
                                />
                              </Field>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  parameter(
                                    i,
                                    "resource_schedule",
                                    c.parameters.resource_schedule.filter(
                                      (_, k) => k !== j,
                                    ),
                                  )
                                }
                              >
                                Remove change
                              </Button>
                            </FieldGroup>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              design.rounds < 2 ||
                              c.parameters.resource_schedule.length >= 12
                            }
                            onClick={() =>
                              parameter(i, "resource_schedule", [
                                ...c.parameters.resource_schedule,
                                {
                                  round: Math.max(
                                    2,
                                    Math.ceil(design.rounds / 2),
                                  ),
                                  endowment: 3,
                                },
                              ])
                            }
                          >
                            Add resource change
                          </Button>
                        </details>
                      )}
                      <details className="disclosure">
                        <summary>
                          Roles & goals for this condition
                          {c.profile_overrides.length > 0 &&
                            ` · ${c.profile_overrides.length} modified`}
                        </summary>
                        <FieldGroup>
                          {design.profiles.map((base) => {
                            const resolved =
                              c.profile_overrides.find(
                                (p) => p.key === base.key,
                              ) ?? base;
                            function override(changes: Partial<Profile>) {
                              const edited = { ...resolved, ...changes };
                              condition(i, {
                                profile_overrides: [
                                  ...c.profile_overrides.filter(
                                    (p) => p.key !== base.key,
                                  ),
                                  edited,
                                ],
                              });
                            }
                            return (
                              <Field key={base.key}>
                                <FieldLabel
                                  htmlFor={`${c.key}-${base.key}-goal`}
                                >
                                  {base.name}
                                </FieldLabel>
                                <Input
                                  aria-label={`${c.name} role for ${base.name}`}
                                  value={resolved.role}
                                  onChange={(e) =>
                                    override({ role: e.target.value })
                                  }
                                  maxLength={80}
                                />
                                <Textarea
                                  id={`${c.key}-${base.key}-goal`}
                                  value={resolved.goal}
                                  onChange={(e) =>
                                    override({ goal: e.target.value })
                                  }
                                  maxLength={2000}
                                  rows={2}
                                />
                                {c.profile_overrides.some(
                                  (p) => p.key === base.key,
                                ) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      condition(i, {
                                        profile_overrides:
                                          c.profile_overrides.filter(
                                            (p) => p.key !== base.key,
                                          ),
                                      })
                                    }
                                  >
                                    Use baseline profile
                                  </Button>
                                )}
                              </Field>
                            );
                          })}
                        </FieldGroup>
                      </details>
                      <div className="condition-switches">
                        <label>
                          <input
                            type="checkbox"
                            checked={c.parameters.communication}
                            onChange={(e) =>
                              parameter(i, "communication", e.target.checked)
                            }
                          />
                          Communication
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.parameters.private_signal}
                            onChange={(e) =>
                              parameter(i, "private_signal", e.target.checked)
                            }
                          />
                          Private signals
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              {design.environment === "coordination" && (
                <section className="form-section">
                  <div className="section-heading">
                    <div>
                      <h2>Task graph</h2>
                      <p>
                        Define work packages, required effort, and prerequisite
                        task keys.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={design.tasks.length >= 30}
                      onClick={() => {
                        let n = design.tasks.length + 1;
                        while (design.tasks.some((t) => t.key === `task-${n}`))
                          n++;
                        update("tasks", [
                          ...design.tasks,
                          {
                            key: `task-${n}`,
                            name: `Work package ${n}`,
                            effort: 2,
                            dependencies: [],
                          },
                        ]);
                      }}
                    >
                      <Plus data-icon="inline-start" />
                      Add task
                    </Button>
                  </div>
                  {!design.tasks.length ? (
                    <p className="muted">
                      Using the environment’s default dependency graph. Add a
                      task to define your own graph.
                    </p>
                  ) : (
                    <FieldGroup>
                      {design.tasks.map((task, index) => (
                        <Field key={task.key}>
                          <FieldLabel htmlFor={`task-name-${task.key}`}>
                            <code>{task.key}</code>
                          </FieldLabel>
                          <div className="task-editor-row">
                            <Input
                              id={`task-name-${task.key}`}
                              value={task.name}
                              maxLength={100}
                              onChange={(e) =>
                                update(
                                  "tasks",
                                  design.tasks.map((t, j) =>
                                    j === index
                                      ? { ...t, name: e.target.value }
                                      : t,
                                  ),
                                )
                              }
                            />
                            <Input
                              aria-label={`Effort for ${task.key}`}
                              type="number"
                              min={1}
                              max={20}
                              value={task.effort}
                              onChange={(e) =>
                                update(
                                  "tasks",
                                  design.tasks.map((t, j) =>
                                    j === index
                                      ? { ...t, effort: Number(e.target.value) }
                                      : t,
                                  ),
                                )
                              }
                            />
                            <Input
                              aria-label={`Prerequisites for ${task.key}`}
                              placeholder="Prerequisites, e.g. task-1"
                              defaultValue={task.dependencies.join(", ")}
                              onBlur={(e) =>
                                update(
                                  "tasks",
                                  design.tasks.map((t, j) =>
                                    j === index
                                      ? {
                                          ...t,
                                          dependencies: e.target.value
                                            .split(",")
                                            .map((v) => v.trim())
                                            .filter(Boolean),
                                        }
                                      : t,
                                  ),
                                )
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${task.key}`}
                              onClick={() =>
                                update(
                                  "tasks",
                                  design.tasks
                                    .filter((t) => t.key !== task.key)
                                    .map((t) => ({
                                      ...t,
                                      dependencies: t.dependencies.filter(
                                        (key) => key !== task.key,
                                      ),
                                    })),
                                )
                              }
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </Field>
                      ))}
                    </FieldGroup>
                  )}
                </section>
              )}
              <section className="form-section">
                <h2>Execution & measurement</h2>
                <FieldGroup className="matrix-fields">
                  <Field>
                    <FieldLabel htmlFor="rounds">Rounds per run</FieldLabel>
                    <Input
                      id="rounds"
                      type="number"
                      min={1}
                      max={100}
                      value={design.rounds}
                      onChange={(e) => update("rounds", Number(e.target.value))}
                    />
                    <FieldDescription>
                      A round contains up to {design.profiles.length} agent
                      turns.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="seeds">Matched seeds</FieldLabel>
                    <Input
                      id="seeds"
                      defaultValue={design.seeds.join(", ")}
                      onBlur={(e) => {
                        const parts = e.target.value
                          .split(",")
                          .map((v) =>
                            v.trim() === "" ? Number.NaN : Number(v.trim()),
                          );
                        if (parts.some((n) => !Number.isInteger(n) || n < 0)) {
                          update("seeds", []);
                          setError(
                            "Seeds must be nonnegative integers, separated by commas.",
                          );
                        } else {
                          update("seeds", parts);
                          setError("");
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
                      value={design.repetitions}
                      onChange={(e) =>
                        update("repetitions", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="budget">
                      Study spending ceiling, USD
                    </FieldLabel>
                    <Input
                      id="budget"
                      type="number"
                      min={0.05}
                      max={25}
                      step={0.5}
                      value={design.budget_usd}
                      onChange={(e) =>
                        update("budget_usd", Number(e.target.value))
                      }
                    />
                  </Field>
                </FieldGroup>
                <fieldset className="measure-picker">
                  <legend>Measurements</legend>
                  {environment?.measures.map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={design.measures.includes(key)}
                        onChange={(e) =>
                          update(
                            "measures",
                            e.target.checked
                              ? [...design.measures, key]
                              : design.measures.filter((m) => m !== key),
                          )
                        }
                      />
                      {label(key)}
                    </label>
                  ))}
                </fieldset>
                <details className="disclosure">
                  <summary>Model response settings & limitations</summary>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>OpenAI reasoning effort</FieldLabel>
                      <Select
                        label="OpenAI reasoning effort"
                        value={design.openai_reasoning_effort ?? "default"}
                        onValueChange={(v) =>
                          update(
                            "openai_reasoning_effort",
                            v === "default"
                              ? null
                              : (v as Design["openai_reasoning_effort"]),
                          )
                        }
                        options={[
                          { value: "default", label: "Provider default" },
                          { value: "low", label: "Low · faster decisions" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                        ]}
                      />
                      <FieldDescription>
                        Applies to OpenAI agents. Anthropic uses its provider
                        defaults.
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
                        value={design.response_tokens}
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
                        value={design.limitations.join("\n")}
                        onChange={(e) =>
                          update("limitations", e.target.value.split("\n"))
                        }
                      />
                    </Field>
                  </FieldGroup>
                </details>
              </section>
            </TabsContent>
          </Tabs>
          {(error || save.error || validate.error) && (
            <Alert variant="error">
              {error || save.error?.message || validate.error?.message}
            </Alert>
          )}
          <div className="form-submit">
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? (
                <LoaderCircle className="spin" data-icon="inline-start" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              {studyId ? "Save new revision" : "Create experiment"}
            </Button>
            <span>Starts ready. No model decisions until you run it.</span>
          </div>
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
          <p>
            Each run is isolated. Conditions share the seed schedule. Decisions
            within a run remain sequential.
          </p>
          <div className="summary-method">
            <Check />
            <span>Typed actions, complete evidence, deterministic replay.</span>
          </div>
          <p className="muted">
            An experiment can reveal agent behavior under these rules. It cannot
            establish human validity by itself.
          </p>
        </aside>
      </div>
    </>
  );
}
