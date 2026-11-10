import type {
  Design,
  EnvironmentId,
  RunSummary,
  StudySummary,
} from "@/lib/types";

export interface AgentSuggestion {
  title: string;
  prompt: string;
  action:
    | "design"
    | "review"
    | "compare"
    | "plan"
    | "measure"
    | "summarize"
    | "trace"
    | "learn";
}

const evidenceQuestions: Record<EnvironmentId, string> = {
  sealed_relay:
    "Inspect the admitted finite relay, its explicit permissions, action credits and exact replay without inferring intent.",
  distributed_coordination:
    "Trace local evidence, addressed delivery, phase conflicts and independent alternatives. Compare shared information and preserve unmatched or abstaining outcomes.",
  artifact_workspace:
    "Inspect authorized evidence, edit versioned work and decide when to submit or stop.",
  composed:
    "Trace resource allocations, consumption and unmet needs. Separate stock visibility " +
    "from allocation visibility and inferred information; compare enforced utility with private goals.",
  commons:
    "Trace how contribution decisions changed the shared return, separating individual and collective outcomes.",
  trust_exchange:
    "Trace the transfers and returns. Which exchanges support a claim of reciprocity, and which do not?",
  coordination:
    "Which task dependencies and agent decisions affected completion? Trace the relevant work and waiting decisions.",
  institution:
    "Trace sanctions, oversight and appeals. What do the enforced consequences show, separately from agents' claims?",
  bargaining:
    "Trace offers, responses and the shrinking pie. Which decisions changed the available agreement?",
  information:
    "Compare decisions with the evidence each agent actually observed. Where did signals and public choices agree or diverge?",
  renewable_resource:
    "Trace extraction decisions and resource regeneration. Which recorded decisions changed the stock trajectory?",
};

const experimentSuggestions: AgentSuggestion[] = [
  {
    title: "Do messages change cooperation?",
    action: "design",
    prompt:
      "Design a shared-commons experiment testing whether public messages change contribution rates. Compare messages enabled and disabled, keeping reports, promises, agent goals and other rules identical. Use matched seeds, a compact pilot and a $3 spending ceiling.",
  },
  {
    title: "Does memory affect reciprocity?",
    action: "design",
    prompt:
      "Design a trust-exchange experiment testing whether retained private notes change return rates. Compare episodic memory with history-only memory while holding goals, communication and resources constant. Use matched seeds, a compact pilot and a $3 spending ceiling.",
  },
  {
    title: "Does oversight change sanctions?",
    action: "design",
    prompt:
      "Design an institutional-oversight experiment testing whether oversight probability changes sanction use. Vary only oversight probability, keeping authority, goals and sanction limits identical. Use matched seeds, a compact pilot and a $3 spending ceiling; make no claims of psychological replication.",
  },
  {
    title: "Can shared resources last?",
    action: "design",
    prompt:
      "Design a renewable-resource experiment testing how regeneration rate affects extraction and resource survival. Vary only regeneration, keeping initial stock, capacity, extraction limits and agent goals constant. Use matched seeds, a compact pilot and a $3 spending ceiling.",
  },
];

export function agentSuggestions({
  context,
  study,
  run,
  design,
  runs = [],
}: {
  context: string;
  study?: StudySummary;
  run?: RunSummary;
  design?: Design;
  runs?: RunSummary[];
}): AgentSuggestion[] {
  if (context === "general")
    return [
      {
        title: "Design an experiment",
        action: "design",
        prompt:
          "Help me design an agent experiment. Ask what behavior I want to test, then help define one controlled change, observable measures and a small pilot. Do not start any runs.",
      },
      {
        title: "Review a setup",
        action: "review",
        prompt:
          "Help me review an experiment setup. Ask me to choose an existing experiment or share the setup, then check whether the comparison isolates the research question. Do not invent protocol details.",
      },
      {
        title: "Understand results",
        action: "summarize",
        prompt:
          "Help me interpret experiment results. Ask which experiment or run I want to examine, then separate recorded outcomes, uncertainty and unsupported conclusions.",
      },
      {
        title: "Learn the basics",
        action: "learn",
        prompt:
          "Explain how JAS experiments work: protocols, conditions, matched seeds, runs and evidence. Give me a short practical starting point.",
      },
    ];
  if (context === "new") return experimentSuggestions;
  if (!study && !run) return [];
  const title = run?.study_title ?? study?.title;
  const identity = run
    ? `the run in “${title}”, revision ${run.revision}, condition “${run.condition}”, seed ${run.seed}, repetition ${run.repetition}, recorded through turn ${run.turn}`
    : `“${title}”, revision ${study?.revision}`;
  const question = design?.question ?? study?.question;
  const subject = question ? ` Its research question is: ${question}` : "";
  const environment = run?.environment ?? study?.environment;
  const hasEvidence = run
    ? run.turn > 0
    : (study?.completed_runs ?? 0) > 0 ||
      runs.some(
        (item) =>
          item.study_id === study?.id &&
          item.revision === study.revision &&
          item.turn > 0,
      );
  const conditions = design?.conditions
    .map((condition) => `“${condition.name}”`)
    .join(" and ");
  const comparison = conditions
    ? `Compare ${conditions}`
    : "Assess the configured conditions";
  const hasComparison = (design?.conditions.length ?? 2) > 1;
  if (!hasEvidence)
    return [
      {
        title: run ? "Review condition" : "Review setup",
        action: "review",
        prompt: `Review the protocol for ${identity}.${subject} Does the setup isolate the intended question? Identify any confounds without inventing results.`,
      },
      {
        title: hasComparison ? "Compare conditions" : "Check baseline",
        action: "compare",
        prompt: `For ${identity}, ${comparison.charAt(0).toLowerCase() + comparison.slice(1)}. Which parameters differ, which stay fixed, and is ${hasComparison ? "the intervention isolated" : "the descriptive baseline clear"}?`,
      },
      {
        title: "Plan first runs",
        action: "plan",
        prompt: `For ${identity}, explain the planned agents, rounds, seeds, repetitions, maximum decisions and spending ceiling. What should I check before explicitly starting execution?`,
      },
      {
        title: "Check measures",
        action: "measure",
        prompt: `For ${identity}, which recorded measurements can answer the research question${design?.measures.length ? ` (${design.measures.join(", ")})` : ""}? Explain the limitations and what evidence would be needed. No outcomes are recorded yet.`,
      },
    ];
  return [
    {
      title:
        run?.status === "failed"
          ? "Review partial record"
          : "Summarize evidence",
      action: "summarize",
      prompt: `Summarize the recorded evidence for ${identity}.${subject} Separate measured outcomes, interpretation and uncertainty; cite supporting turns and state which evidence you inspected.`,
    },
    {
      title: run
        ? "Inspect trajectory"
        : hasComparison
          ? "Compare conditions"
          : "Assess consistency",
      action: run ? "trace" : "compare",
      prompt: run
        ? `For ${identity}, how did the recorded outcomes change across rounds? Identify turning points with cited decisions, and state what this single run cannot establish.`
        : `${comparison} for ${identity} using planned runs and matched seeds where available. Which differences are supported, and how much uncertainty remains? Do not treat turns as independent replicates.`,
    },
    {
      title: "Trace decisions",
      action: "trace",
      prompt: `For ${identity}: ${environment ? evidenceQuestions[environment] : "Which recorded decisions explain the observed outcomes?"} Cite the relevant turns; distinguish observed behavior from self-reported rationale.`,
    },
    {
      title: "Plan a follow-up",
      action: "plan",
      prompt: `Based on the inspected evidence for ${identity}, what single change would make a useful follow-up experiment? Explain the control, measurement and remaining uncertainty.${subject} Do not save or run anything.`,
    },
  ];
}
