import { expect, test } from "vitest";
import { agentSuggestions } from "@/lib/agent-suggestions";
import type { Design, RunSummary, StudySummary } from "@/lib/types";

const study = {
  id: "study-1",
  title: "Oversight and sanctions",
  question: "Does oversight change sanction use?",
  revision: 2,
  environment: "institution",
  status: "ready",
  run_count: 6,
  completed_runs: 0,
} as StudySummary;
const design = {
  question: study.question,
  conditions: [{ name: "Low oversight" }, { name: "High oversight" }],
  measures: ["sanction_rate"],
} as Design;

test("new-study examples are concrete prompts and all entry contexts offer four choices", () => {
  for (const context of ["general", "new"]) {
    const choices = agentSuggestions({ context });
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((choice) => choice.prompt)).size).toBe(4);
  }
  const creation = agentSuggestions({ context: "new" });
  expect(
    creation.every(
      (choice) =>
        choice.prompt.includes("matched seeds") && choice.prompt.includes("$3"),
    ),
  ).toBe(true);
  expect(
    creation.every((choice) => choice.prompt.length > choice.title.length),
  ).toBe(true);
});

test("unstarted experiments get protocol questions tailored to their actual treatments", () => {
  const choices = agentSuggestions({ context: "study:study-1", study, design });
  expect(choices).toHaveLength(4);
  expect(choices[0].prompt).toContain(study.question);
  expect(choices[1].prompt).toContain("Low oversight");
  expect(choices[1].prompt).toContain("High oversight");
  expect(choices[3].prompt).toContain("sanction_rate");
  expect(choices.every((choice) => !choice.title.includes("evidence"))).toBe(
    true,
  );
});

test("in-progress evidence counts even before a run completes, without using old revisions", () => {
  const run = { study_id: study.id, revision: 1, turn: 3 } as RunSummary;
  expect(
    agentSuggestions({
      context: "study:study-1",
      study,
      design,
      runs: [run],
    })[0].title,
  ).toBe("Review the setup");
  const choices = agentSuggestions({
    context: "study:study-1",
    study,
    design,
    runs: [{ ...run, revision: 2 }],
  });
  expect(choices[0].title).toBe("Summarize the evidence");
  expect(choices[2].prompt).toContain("sanctions, oversight and appeals");
});

test("single-condition and historical-run prompts retain their actual scope", () => {
  const single = { ...design, conditions: design.conditions.slice(0, 1) };
  expect(
    agentSuggestions({ context: "study:study-1", study, design: single })[1]
      .title,
  ).toBe("Check the baseline");
  const run = {
    id: "run-1",
    study_title: study.title,
    revision: 1,
    condition: "Historical control",
    environment: "institution",
    turn: 8,
    seed: 19,
    repetition: 2,
    status: "failed",
  } as RunSummary;
  const choices = agentSuggestions({ context: "run:run-1", run, design });
  expect(choices).toHaveLength(4);
  expect(choices[0].title).toBe("Assess the partial record");
  expect(choices[0].prompt).toContain(
    "revision 1, condition “Historical control”, seed 19, repetition 2, recorded through turn 8",
  );
  expect(choices[1].prompt).toContain("single run cannot establish");
  expect(agentSuggestions({ context: "study:missing" })).toEqual([]);
});
