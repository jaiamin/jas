import { expect, test } from "vitest";
import { chatProgress } from "./chat-progress";

test("chat events expose only the current message's live progress", () => {
  expect(
    chatProgress(
      JSON.stringify({
        id: "current",
        status: "pending",
        output: { partial: "Draft", stage: "answering", design: "unvalidated" },
      }),
      "current",
    ),
  ).toEqual({ status: "pending", partial: "Draft", stage: "answering" });
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
    ...[null, [], { partial: 3 }, { stage: {} }].map((output) =>
      JSON.stringify({ id: "current", status: "pending", output }),
    ),
  ]) {
    expect(chatProgress(data, "current")).toBeNull();
  }
});
