import { expect, test } from "vitest";
import type { StudySummary } from "@/lib/types";
import { design, runDetail } from "@/test/fixtures";
import { agentSuggestions } from "./agent-suggestions";

const study: StudySummary = {
  id: "study",
  title: "Oversight trial",
  question: "Does oversight help?",
  created: "2026-11-07",
  revision: 2,
  environment: "institution",
  status: "ready",
  run_count: 1,
  completed_runs: 0,
  cost_usd: 0,
  budget_usd: 1,
};

test("general and creation contexts offer four distinct, bounded suggestions", () => {
  for (const context of ["general", "new"]) {
    const suggestions = agentSuggestions({ context });
    expect(suggestions).toHaveLength(4);
    expect(
      new Set(suggestions.map((suggestion) => suggestion.prompt)).size,
    ).toBe(4);
  }
  for (const suggestion of agentSuggestions({ context: "new" })) {
    expect(suggestion.prompt).toContain("matched seeds");
    expect(suggestion.prompt).toContain("$3");
    expect(suggestion.prompt.length).toBeGreaterThan(suggestion.title.length);
  }
});

test("unloaded scopes do not offer prompts that invent a protocol or results", () => {
  expect(agentSuggestions({ context: "run:missing" })).toEqual([]);
  expect(agentSuggestions({ context: "study:missing" })).toEqual([]);
});

test("unstarted experiments tailor setup prompts to the saved treatments and measures", () => {
  const suggestions = agentSuggestions({
    context: "study:study",
    study,
    design: {
      ...design,
      conditions: [
        { ...design.conditions[0], name: "Low oversight" },
        { ...design.conditions[0], key: "high", name: "High oversight" },
      ],
      measures: ["sanction_rate"],
    },
  });
  expect(suggestions).toHaveLength(4);
  expect(suggestions[0].prompt).toContain(study.question);
  expect(suggestions[1].prompt).toContain("Low oversight");
  expect(suggestions[1].prompt).toContain("High oversight");
  expect(suggestions[3].prompt).toContain("sanction_rate");
  expect(
    suggestions.every((suggestion) => !suggestion.title.includes("evidence")),
  ).toBe(true);
});

test("evidence from another study or preserved revision cannot imply current results", () => {
  for (const other of [
    { ...runDetail.summary, revision: 1, turn: 2 },
    { ...runDetail.summary, study_id: "other", revision: 2, turn: 2 },
  ]) {
    const suggestions = agentSuggestions({
      context: "study:study",
      study,
      design,
      runs: [other],
    });
    expect(suggestions[0].title).toBe("Review the setup");
    expect(suggestions[1].title).toBe("Check the baseline");
    expect(suggestions.at(-1)?.prompt).toContain(
      "No outcomes are recorded yet",
    );
  }
});

test("partial failed runs get bounded evidence prompts with their exact identity", () => {
  const run = {
    ...runDetail.summary,
    condition: "Historical control",
    status: "failed",
    turn: 2,
    repetition: 3,
  };
  const suggestions = agentSuggestions({ context: "run:run", run, design });
  expect(suggestions[0].title).toBe("Assess the partial record");
  expect(suggestions[0].prompt).toContain(
    "revision 1, condition “Historical control”, seed 7, repetition 3, recorded through turn 2",
  );
  expect(suggestions).toHaveLength(4);
  expect(suggestions[1].prompt).toContain("single run cannot establish");
  expect(suggestions[2].prompt).toContain("sanctions, oversight and appeals");
  expect(suggestions[3].prompt).toContain("Do not save or run anything");
});

test("current in-progress evidence enables comparison without treating turns as replicates", () => {
  const suggestions = agentSuggestions({
    context: "study:study",
    study,
    design: {
      ...design,
      conditions: [
        ...design.conditions,
        { ...design.conditions[0], key: "treatment", name: "Treatment" },
      ],
    },
    runs: [{ ...runDetail.summary, revision: 2, turn: 1 }],
  });
  expect(suggestions[0].title).toBe("Summarize the evidence");
  expect(suggestions[1].prompt).toContain("independent runs and matched seeds");
  expect(suggestions[1].prompt).toContain(
    "Do not treat turns as independent replicates",
  );
});
