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
  format: "jas-environment-v3";
  id: string;
  revision: number;
  updated: string;
  sha256: string;
  definition: EnvironmentMechanics;
}
export interface EnvironmentMechanics {
  version: 1;
  name: string;
  description: string;
  environment: EnvironmentId;
  rule_version: string;
  examples: {
    key: string;
    name: string;
    roles: string[];
    parameters: Omit<Parameters, "memory">;
    tasks: TaskDefinition[];
  }[];
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
export interface ParticipantCapabilities {
  planning: "actor_plan_v1" | "disabled";
  memory: "actor_sources_v1" | "disabled";
  investigation: "actor_inspection_v1" | "disabled";
  verification: "legal_evidence_v1" | "disabled";
}
interface HarnessLimits {
  max_requests: number;
  max_tool_operations: number;
  tools: ("observe" | "rules" | "legal_options")[];
}
export interface DirectActionHarness extends HarnessLimits {
  kind: "direct_action";
  version: "1.0.0";
}
export interface ToolUsingHarness extends HarnessLimits {
  kind: "tool_using";
  version: "2.0.0";
  capabilities: ParticipantCapabilities;
  max_context_chars: number;
  max_memory_items: number;
}
export interface ScriptedHarness extends HarnessLimits {
  kind: "scripted";
  version: "1.0.0";
  policy: "commons_keep_v1" | "commons_half_v1" | "private_signal_v1";
}
export type ParticipantHarness =
  | DirectActionHarness
  | ToolUsingHarness
  | ScriptedHarness;
export interface Treatment {
  key: string;
  name: string;
  description: string;
  model: ModelId;
  harness: ParticipantHarness;
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
  environment_source: SavedEnvironment | null;
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
  model: ModelId | null;
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
  planned: number;
  excluded: number;
  exclusions: {
    run_id: string | null;
    seed: number;
    repetition: number;
    reason: string;
  }[];
  uncertainty_reason: string;
  selection_assumption: string;
  sensitivity: Sensitivity;
}
export interface Sensitivity {
  status: "bounded" | "observed" | "not_identified";
  bounds: number[] | null;
  reason: string;
}
export interface Effect {
  condition_key: string;
  baseline_key: string;
  condition: string;
  baseline: string;
  metric: string;
  mean: number | null;
  seeds: number;
  pairs: number;
  planned_pairs: number;
  interval: number[] | null;
  method: string;
  uncertainty_reason: string;
  selection_assumption: string;
  sensitivity: Sensitivity;
  missing_pairs: {
    seed: number;
    repetition: number;
    baseline_run_id: string | null;
    condition_run_id: string | null;
    reason: string;
  }[];
}
export interface Comparison {
  version: number;
  revision: number;
  design_sha256: string;
  matching_unit: string;
  inference_unit: string;
  independent_support: number | null;
  dependence: string;
  uncertainty_reason: string;
  selection_assumption: string;
  effort_scope?: string;
  conditions: {
    condition_key: string;
    condition: string;
    participant?: {
      version: 1;
      kind: "model_participant" | "non_model_control";
      models: ModelId[];
      configured_models: ModelId[];
      harness: ParticipantHarness;
      memory: Parameters["memory"];
      profiles: Profile[];
      inference: {
        response_tokens: number;
        openai_reasoning_effort: Design["openai_reasoning_effort"];
      } | null;
    };
    effort?: ParticipantEffort & { captured_runs: number };
    planned: number;
    attempted: number;
    complete: number;
    failed: number;
    interrupted: number;
    ready: number;
    in_progress: number;
    not_captured: number;
    excluded: number;
    unmatched: number;
    reasons: Record<string, number>;
  }[];
  cells: {
    run_id: string | null;
    condition_key: string;
    seed: number;
    repetition: number;
    status: string;
    through_turn: number | null;
    attempted: boolean;
    reason: string;
    metrics: Record<string, number>;
    effort?: ParticipantEffort | null;
  }[];
}
export interface ParticipantEffort {
  version: 1;
  activations: number;
  inference_attempts: number;
  tool_attempts: number;
  tool_operations: number;
  scripted_attempts: number;
  scripted_decisions: number;
  committed_decisions: number;
  reasoning_tokens: number;
  usage: Usage;
  stop_reasons: Record<string, number>;
  request_statuses: Record<string, number>;
  implementation_sources: Record<string, unknown>[];
}
export interface ComparisonReport {
  comparison: Comparison;
  results: Result[];
  effects: Effect[];
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
    changed_harness: string[];
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
export interface StudyDetail extends ComparisonReport {
  preflight: ExperimentPreflight;
  id: string;
  design: Design;
  revision: number;
  sha256: string;
  plan_id: string | null;
  created: string;
  revisions: { number: number; created: string; sha256: string }[];
  runs: RunSummary[];
  usage: Usage;
}
export interface Environment {
  source: SavedEnvironment;
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
  environment_schema: Record<string, unknown>;
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
  activation_id: string | null;
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
  activation_id: string | null;
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
  harness: ParticipantHarness;
  activations: ParticipantActivation[];
  effort?: ParticipantEffort;
  state: State;
  turns: Turn[];
  events: Event[];
  measurements: Measurement[];
  metrics: Record<string, number | null>;
  relationships: Relationship[];
}
export interface ParticipantOperation {
  number: number;
  kind: string;
  status: string;
  request: unknown;
  result: unknown;
  created: string;
}
export interface ParticipantActivation {
  id: string;
  run_id: string;
  turn: number;
  round: number;
  actor: string;
  created: string;
  updated: string;
  status: string;
  stop_reason: string | null;
  error: string | null;
  checkpoint_hash: string;
  observation: Record<string, unknown>;
  identity: {
    model: ModelId | null;
    harness: ParticipantHarness;
    [key: string]: unknown;
  };
  requests: number;
  operations: ParticipantOperation[];
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
export interface ResearchArtifact {
  id: string;
  request: {
    kind: "capabilities" | "context" | "probe";
    [key: string]: unknown;
  };
  status: "pending" | "complete" | "rejected" | "failed";
  summary: string;
  sources: {
    kind: "builtin" | "environment" | "analysis" | "run";
    id: string;
    hash: string;
    turn?: number;
  }[];
  data: Record<string, unknown> | null;
}

export interface ResearchActivity {
  version: 1;
  scope: {
    chat_id: string;
    before: string;
    cutoffs: Record<string, number>;
    context_limit: number;
  };
  operations: ResearchArtifact[];
  stop_reason: string | null;
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
    research?: ResearchActivity;
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
    comparisons?: Record<string, ComparisonReport>;
    exposure?: Record<string, ExposureReport>;
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

export interface ExposureSource {
  href: string;
  pointer: string;
  label: string;
}
export interface ExposureCount {
  kind: string;
  eligible_participants: number;
  exposed_participants: number | null;
  confirmed_participants: number;
  eligible_opportunities: number;
  exposed_opportunities: number | null;
  confirmed_opportunities: number;
  unknown_opportunities: number;
}
export interface ExposureReport {
  version: number;
  run_id: string;
  through_turn: number;
  capture: "complete" | "partial" | "unavailable";
  delivery: {
    confirmed_requests: number;
    unknown_requests: number;
    unsent_attempts: number;
  };
  membership: {
    activations: string[];
    requests: string[];
    operations: Record<string, number[]>;
  };
  assignment: {
    condition_key: string;
    condition_name: string;
    revision: number;
    design_sha256: string;
    configuration: Record<string, unknown>;
    source: ExposureSource;
  };
  summary: ExposureCount[];
  opportunities: {
    id: string;
    kind: string;
    participant: string;
    source: ExposureSource;
    available: ExposureSource[];
    included: boolean | null;
    capture_unavailable: boolean;
    inputs: {
      activation_id: string;
      operation: number | null;
      delivery: "confirmed" | "unknown";
      request_status: string;
      source: ExposureSource;
    }[];
  }[];
  interpretation: string[];
}
