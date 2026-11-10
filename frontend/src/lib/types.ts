export type ModelId = `openai:${string}` | `anthropic:${string}`;
export type EnvironmentId =
  | "commons"
  | "trust_exchange"
  | "coordination"
  | "institution"
  | "bargaining"
  | "information"
  | "renewable_resource"
  | "composed";
export interface ResourcePrimitive {
  key: string;
  name: string;
  capacity: number;
  initial_stock: number;
  replenishment: number;
  controllers: string[];
  action_limit: number;
  need: number;
  consumption_value: number;
  shortfall_penalty: number;
  terminal_value: number;
  stock_visibility: "public" | "controllers";
  allocation_visibility: "public" | "parties";
  transfers: boolean;
}
export interface CompositionRules {
  resources: ResourcePrimitive[];
  controllers_first: boolean;
}
export interface SavedEnvironment {
  format: "jas-environment-v1";
  id: string;
  revision: number;
  updated: string;
  rules: string;
  sha256: string;
  design: Design;
}
export interface Parameters {
  endowment: number;
  multiplier: number;
  communication: boolean;
  communication_channels: ("messages" | "reports" | "promises")[];
  memory: "episodic" | "notes" | "history" | "none";
  private_signal: boolean;
  task_count: number;
  institution: {
    authorities: string[];
    oversight: number;
    sanction_cap: number;
    transparent: boolean;
    appeal: boolean;
  };
  bargaining: { discount: number; outside_option: number };
  information: {
    accuracy: number;
    correct_reward: number;
    reveal_outcome: boolean;
  };
  resource: {
    capacity: number;
    initial_stock: number | null;
    regeneration: number;
    extraction_limit: number;
  };
  composition: CompositionRules | null;
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
  revision: number;
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
  seeds: number;
  interval: number[] | null;
  method: string;
}
export interface QuestionRequirement {
  source: string;
  capability: string;
  mapping: "direct" | "proxy" | "missing";
  explanation: string;
}
export interface ExperimentPreflight {
  status: "blocked" | "review" | "checked";
  issues: { code: string; severity: "error" | "warning"; message: string }[];
  comparisons: {
    baseline: string;
    condition: string;
    changed_parameters: string[];
    agent_assignment_changed: boolean;
    witnesses: {
      instrument: number;
      observation_difference: boolean;
      outcome_difference: boolean;
    }[];
  }[];
  probe_turns: number;
  limits: string;
  question_mapping?: QuestionRequirement[];
  original_question?: string | null;
}
export interface StudyDetail {
  preflight: ExperimentPreflight;
  id: string;
  design: Design;
  revision: number;
  sha256: string;
  plan_id: string | null;
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
  measure_definitions: Record<string, string>;
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
  stocks?: Record<string, number>;
  inventories?: Record<string, Record<string, number>>;
  consumed?: Record<string, Record<string, number>>;
  unmet?: Record<string, Record<string, number>>;
  stock?: number;
  shared_output?: number;
  offer?: { actor: string; amount: number; pie: number };
  sanctions?: {
    actor: string;
    target: string;
    amount: number;
    resolved: boolean;
    round: number;
  }[];
  rule_version: string;
  round: number;
  position: number;
  done: boolean;
  balances: Record<string, number>;
  pending?: Record<string, Action>;
  history: Record<string, unknown>[];
  notes: Record<string, string>;
  experiences: Record<string, unknown[]>;
  promises?: Record<string, unknown>;
  signals: Record<string, number>;
  relations?: Record<string, { amount: number; count: number }>;
  tasks?: Task[];
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
  execution_blocked: string | null;
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
export interface ChatSummary {
  id: string;
  title: string;
  created: string;
  updated: string;
  context: string;
  status: string;
}
export interface Analysis {
  chat_id?: string | null;
  usage?: Usage | null;
  id: string;
  purpose: string;
  question: string;
  status: string;
  output: {
    stage?: string;
    activity?: string[];
    partial?: string;
    planning?: {
      brief: {
        size_rationale: string;
        operationalization: string;
        requirements?: QuestionRequirement[];
      };
      draft_notes?: string;
      reviews?: { kind: string; issues: string[] }[];
      preflight?: ExperimentPreflight;
      sources: { url: string; title: string }[];
    };
    supported?: boolean;
    explanation?: string;
    summary?: string;
    introduction?: string;
    design?: Design | null;
    answer?: string;
    citations?: { run_id: string; turn: number }[];
    caveats?: string[];
    examined?: {
      run_id: string;
      start: number;
      end: number;
      full_turn: boolean;
    }[];
  } | null;
  error: string | null;
  cutoffs: Record<string, number>;
  created: string;
  study_id: string | null;
  run_id: string | null;
}
export interface Settings {
  planner_model: string;
  assistant_model: string;
  providers: Record<string, boolean>;
  models: {
    id: ModelId;
    input_per_million: number;
    output_per_million: number;
  }[];
  budget_usd: number;
  charged_usd: number;
  usage: Usage;
  storage: string;
  concurrent_runs: number;
  concurrent_requests: number;
  mode: string;
}
export interface Annotation {
  id: string;
  turn: number;
  label: string;
  note: string;
  created: string;
}

export interface ExtensionCandidate {
  format: "jas-extension-candidate-v1";
  name: string;
  provenance: string;
  source: string;
  examples: { state: number; expected: number }[];
}

export interface ExtensionRuntime {
  status: "unqualified" | "qualified" | "failed";
  validation_enabled: boolean;
  execution_enabled: false;
  detail: string;
  fingerprint: string | null;
  case_sha256: string | null;
  wasmtime_version: string | null;
  checks: {
    name: string;
    passed: boolean;
    observed: (string | number[])[];
    cleaned: boolean;
  }[];
}

export interface ExtensionReview {
  format: "jas-extension-review-v1";
  id: string;
  created: string;
  candidate_sha256: string;
  candidate: ExtensionCandidate;
  admission: "blocked" | "rejected" | "needs_world_review";
  runnable: false;
  runtime: ExtensionRuntime;
  activity: {
    stage: string;
    status: "passed" | "blocked" | "failed";
    detail: string;
  }[];
  outputs: number[];
}
