import { expect, test } from "vitest";
import { chatProgress } from "./chat-progress";

test("live events retain public operation results and reject malformed artifacts", () => {
  const research = {
    version: 2,
    scope: {
      chat_id: "chat",
      before: "2026-11-10",
      cutoffs: {},
      context_limit: 50,
    },
    operations: [
      {
        id: "probe",
        request: { kind: "probe" },
        status: "complete",
        summary: "Hypothetical acceptance.",
        sources: [],
        data: { balances: [5, 9] },
      },
    ],
    stop_reason: "answered",
  };
  const event = (value: unknown) =>
    JSON.stringify({
      id: "current",
      purpose: "general",
      status: "pending",
      output: { research: value },
    });
  expect(chatProgress(event(research), "current")?.research).toEqual(research);
  for (const malformed of [
    null,
    [],
    { ...research, version: 1 },
    { ...research, operations: [{}] },
    { ...research, scope: { cutoffs: [] } },
    { ...research, stop_reason: {} },
  ]) {
    expect(chatProgress(event(malformed), "current")).toBeNull();
  }
});

test("chat events expose only the current message's live progress", () => {
  expect(
    chatProgress(
      JSON.stringify({
        id: "current",
        status: "pending",
        purpose: "general",
        output: {
          partial: "Draft",
          stage: "answering",
          activity: ["answering"],
          design: "unvalidated",
        },
      }),
      "current",
    ),
  ).toEqual({
    status: "pending",
    purpose: "general",
    partial: "Draft",
    stage: "answering",
    activity: ["answering"],
  });
  expect(
    chatProgress(
      JSON.stringify({ id: "older", status: "complete", output: {} }),
      "current",
    ),
  ).toBeNull();
});

test("malformed events cannot enter the analysis cache", () => {
  for (const data of [
    "{",
    "null",
    "[]",
    "{}",
    JSON.stringify({ id: "current", status: "pending", output: {} }),
    ...[
      null,
      [],
      { partial: 3 },
      { introduction: [] },
      { stage: {} },
      { activity: "thinking" },
      { activity: [{}] },
    ].map((output) =>
      JSON.stringify({
        id: "current",
        status: "pending",
        purpose: "general",
        output,
      }),
    ),
  ]) {
    expect(chatProgress(data, "current")).toBeNull();
  }
});

test("purpose transitions expose public planning stages without unvalidated proposals", () => {
  expect(
    chatProgress(
      JSON.stringify({
        id: "current",
        status: "pending",
        purpose: "design",
        output: {
          stage: "scoping",
          introduction: "I will prepare a protocol for review.",
          design: { unvalidated: true },
        },
      }),
      "current",
    ),
  ).toEqual({
    status: "pending",
    purpose: "design",
    stage: "scoping",
    introduction: "I will prepare a protocol for review.",
  });
  expect(
    chatProgress(
      JSON.stringify({
        id: "current",
        status: "pending",
        purpose: "unknown",
        output: {},
      }),
      "current",
    ),
  ).toBeNull();
});
