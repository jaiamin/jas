export type ModelId = `openai:${string}` | `anthropic:${string}`;
export type EnvironmentId = "commons" | "trust_exchange" | "coordination";
export interface Parameters {
  endowment: number;
  multiplier: number;
  communication: boolean;
  memory: "episodic" | "notes" | "none";
  private_signal: boolean;
  task_count: number;
  resource_schedule: { round: number; endowment: number }[];
}
export interface Profile {
  key: string;
  name: string;
  goal: string;
  role: string;
  model: ModelId | null;
}
export interface Treatment {
  key: string;
  name: string;
  description: string;
  model: ModelId;
  parameters: Parameters;
  profile_overrides: Profile[];
}
export interface TaskDefinition {
  key: string;
  name: string;
  dependencies: string[];
  effort: number;
}
export interface Design {
  title: string;
  question: string;
  hypothesis: string;
  environment: EnvironmentId;
  context: string;
  profiles: Profile[];
  tasks: TaskDefinition[];
  conditions: Treatment[];
  seeds: number[];
  repetitions: number;
  rounds: number;
  budget_usd: number;
  openai_reasoning_effort: "low" | "medium" | "high" | null;
  response_tokens: number;
  limitations: string[];
  measures: string[];
}
export interface Usage {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  partial: boolean;
}
export interface StudySummary {
  id: string;
  title: string;
  question: string;
  created: string;
  revision: number;
  environment: EnvironmentId;
  status: string;
  run_count: number;
  completed_runs: number;
  cost_usd: number;
  budget_usd: number;
}
export interface RunSummary {
  id: string;
  study_id: string;
  study_title: string;
  condition: string;
  condition_key: string;
  environment: EnvironmentId;
  model: ModelId;
  models: ModelId[];
  status: string;
  turn: number;
  round: number;
  total_turns: number;
  total_rounds: number;
  seed: number;
  repetition: number;
  created: string;
  error: string | null;
  usage: Usage;
}
export interface Result {
  condition_key: string;
  condition: string;
  metric: string;
  mean: number | null;
  runs: number;
  interval: number[] | null;
  method: string;
}
export interface StudyDetail {
  id: string;
  design: Design;
  revision: number;
  sha256: string;
  created: string;
  revisions: { number: number; created: string; sha256: string }[];
  runs: RunSummary[];
  results: Result[];
  effects: {
    condition: string;
    baseline: string;
    metric: string;
    mean: number;
    seeds: number;
    pairs: number;
    interval: number[] | null;
    method: string;
  }[];
  usage: Usage;
}
export interface Environment {
  key: EnvironmentId;
  name: string;
  description: string;
  primary_metric: string;
  parameters: string[];
  measures: string[];
  rule_version: string;
}
export interface Catalog {
  models: {
    id: ModelId;
    input_per_million: number;
    output_per_million: number;
  }[];
  environments: Environment[];
  templates: { id: string; design: Design }[];
  design_schema: Record<string, unknown>;
}
export interface Action {
  kind: string;
  amount: number;
  target: string;
  message: string;
  report: number | null;
  promise: number | null;
}
export interface Decision {
  action: Action;
  rationale: string;
  memory: string;
  forecast: number | null;
}
export interface Event {
  id: number;
  turn: number;
  round: number;
  kind: string;
  actor: string | null;
  target: string | null;
  visibility: string;
  text: string;
  data: Record<string, unknown>;
}
export interface Measurement {
  turn: number;
  round: number;
  key: string;
  value: number | null;
  denominator: number | null;
  agent: string | null;
  version: number;
}
export interface Task {
  key: string;
  name: string;
  dependencies: string[];
  effort: number;
  progress: number;
  completed_by: string | null;
}
export interface State {
  rule_version: string;
  round: number;
  position: number;
  done: boolean;
  balances: Record<string, number>;
  pending: Record<string, Action>;
  history: Record<string, unknown>[];
  notes: Record<string, string>;
  experiences: Record<string, unknown[]>;
  promises: Record<string, unknown>;
  signals: Record<string, number>;
  relations: Record<string, { amount: number; count: number }>;
  tasks: Task[];
}
export interface Turn {
  number: number;
  round: number;
  actor: string;
  action: Action;
  rationale: string;
  latency_ms: number;
}
export interface Relationship {
  source: string;
  target: string;
  transfers: number;
  interactions: number;
  kept: number;
  eligible_promises: number;
  false_reports: number;
  claims: number;
}
export interface RequestSummary {
  id: string;
  turn: number | null;
  status: string;
  error: string | null;
  created: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}
export interface RequestEvidence {
  id: string;
  run_id: string;
  turn: number | null;
  request: unknown;
  response: unknown;
  error: string | null;
  status: string;
}
export interface RunDetail {
  next_actor: string | null;
  requests: RequestSummary[];
  summary: RunSummary;
  design: Design;
  parameters: Parameters;
  state: State;
  turns: Turn[];
  events: Event[];
  measurements: Measurement[];
  metrics: Record<string, number | null>;
  relationships: Relationship[];
}
export interface Evidence {
  number: number;
  round: number;
  actor: string | null;
  observation: Record<string, unknown>;
  decision: Partial<Decision>;
  checkpoint: State;
  state_hash: string | null;
  events: Event[];
}
export interface Analysis {
  usage?: Usage | null;
  id: string;
  purpose: string;
  question: string;
  status: string;
  output: {
    supported?: boolean;
    explanation?: string;
    design?: Design | null;
    answer?: string;
    citations?: { run_id: string; turn: number }[];
    caveats?: string[];
    examined?: unknown[];
  } | null;
  error: string | null;
  cutoffs: Record<string, number>;
  created: string;
  study_id: string | null;
  run_id: string | null;
}
export interface Settings {
  providers: Record<string, boolean>;
  models: {
    id: ModelId;
    input_per_million: number;
    output_per_million: number;
  }[];
  budget_usd: number;
  charged_usd: number;
  usage: Usage;
  rule_version: string;
  storage: string;
  concurrent_runs: number;
  mode: string;
}
export interface Annotation {
  id: string;
  turn: number;
  label: string;
  note: string;
  created: string;
}
