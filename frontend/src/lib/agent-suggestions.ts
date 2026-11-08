import type {
  Design,
  EnvironmentId,
  RunSummary,
  StudySummary,
} from "@/lib/types";

export interface AgentSuggestion {
  title: string;
  prompt: string;
}

const evidenceQuestions: Record<EnvironmentId, string> = {
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
        title: "How do matched seeds help comparisons?",
        prompt: "How do matched seeds help comparisons?",
      },
      {
        title: "What makes a useful experiment?",
        prompt:
          "What makes a useful experiment? Explain a clear question, one controlled intervention and an observable outcome.",
      },
      {
        title: "How should I interpret a small pilot?",
        prompt:
          "How should I interpret a small pilot? Explain independent runs, uncertainty and what I should avoid concluding.",
      },
      {
        title: "What can JAS measure reliably?",
        prompt:
          "What can JAS measure reliably? Distinguish recorded actions and consequences from model self-reports and real-world predictions.",
      },
    ];
  if (context === "new")
    return [
      {
        title: "Communication & cooperation",
        prompt:
          "Design a shared-commons experiment testing whether public messages change contribution rates. Compare messages enabled and disabled, keeping reports, promises, agent goals and other rules identical. Use matched seeds, a compact pilot and a $3 spending ceiling.",
      },
      {
        title: "Memory & reciprocity",
        prompt:
          "Design a trust-exchange experiment testing whether retained private notes change return rates. Compare episodic memory with history-only memory while holding goals, communication and resources constant. Use matched seeds, a compact pilot and a $3 spending ceiling.",
      },
      {
        title: "Oversight & sanctions",
        prompt:
          "Design an institutional-oversight experiment testing whether oversight probability changes sanction use. Vary only oversight probability, keeping authority, goals and sanction limits identical. Use matched seeds, a compact pilot and a $3 spending ceiling; make no claims of psychological replication.",
      },
      {
        title: "Regeneration & resource use",
        prompt:
          "Design a renewable-resource experiment testing how regeneration rate affects extraction and resource survival. Vary only regeneration, keeping initial stock, capacity, extraction limits and agent goals constant. Use matched seeds, a compact pilot and a $3 spending ceiling.",
      },
    ];
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
        title: run ? "Review this condition" : "Review the setup",
        prompt: `Review the protocol for ${identity}.${subject} Does the setup isolate the intended question? Identify any confounds without inventing results.`,
      },
      {
        title: hasComparison ? "Check the comparison" : "Check the baseline",
        prompt: `For ${identity}, ${comparison.charAt(0).toLowerCase() + comparison.slice(1)}. Which parameters differ, which stay fixed, and is ${hasComparison ? "the intervention isolated" : "the descriptive baseline clear"}?`,
      },
      {
        title: "Plan the first runs",
        prompt: `For ${identity}, explain the planned agents, rounds, seeds, repetitions, maximum decisions and spending ceiling. What should I check before explicitly starting execution?`,
      },
      {
        title: "Check the measures",
        prompt: `For ${identity}, which recorded measurements can answer the research question${design?.measures.length ? ` (${design.measures.join(", ")})` : ""}? Explain the limitations and what evidence would be needed. No outcomes are recorded yet.`,
      },
    ];
  return [
    {
      title:
        run?.status === "failed"
          ? "Assess the partial record"
          : "Summarize the evidence",
      prompt: `Summarize the recorded evidence for ${identity}.${subject} Separate measured outcomes, interpretation and uncertainty; cite supporting turns and state which evidence you inspected.`,
    },
    {
      title: run
        ? "Inspect the trajectory"
        : hasComparison
          ? "Compare conditions"
          : "Assess consistency",
      prompt: run
        ? `For ${identity}, how did the recorded outcomes change across rounds? Identify turning points with cited decisions, and state what this single run cannot establish.`
        : `${comparison} for ${identity} using independent runs and matched seeds where available. Which differences are supported, and how much uncertainty remains? Do not treat turns as independent replicates.`,
    },
    {
      title: "Trace key decisions",
      prompt: `For ${identity}: ${environment ? evidenceQuestions[environment] : "Which recorded decisions explain the observed outcomes?"} Cite the relevant turns; distinguish observed behavior from self-reported rationale.`,
    },
    {
      title: "Plan a follow-up",
      prompt: `Based on the inspected evidence for ${identity}, what single change would make a useful follow-up experiment? Explain the control, measurement and remaining uncertainty.${subject} Do not save or run anything.`,
    },
  ];
}
