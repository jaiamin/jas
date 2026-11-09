import { expect, test } from "vitest";
import { chatProgress } from "./chat-progress";

test("chat events expose only the current message's live progress", () => {
  expect(
    chatProgress(
      JSON.stringify({
        id: "current",
        status: "pending",
        purpose: "general",
        output: { partial: "Draft", stage: "answering", design: "unvalidated" },
      }),
      "current",
    ),
  ).toEqual({
    status: "pending",
    purpose: "general",
    partial: "Draft",
    stage: "answering",
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
    ...[null, [], { partial: 3 }, { stage: {} }].map((output) =>
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
        output: { stage: "scoping", design: { unvalidated: true } },
      }),
      "current",
    ),
  ).toEqual({ status: "pending", purpose: "design", stage: "scoping" });
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
