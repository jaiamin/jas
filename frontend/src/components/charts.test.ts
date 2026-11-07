import { expect, test } from "vitest";
import type { Measurement } from "@/lib/types";
import { roundSeries } from "./charts";

const measure = (
  round: number,
  key: string,
  value: number | null,
): Measurement => ({
  round,
  key,
  value,
  turn: round,
  denominator: 1,
  agent: null,
  version: 1,
});
test("round rates ignore missing opportunities and sort rounds", () => {
  expect(
    roundSeries(
      [
        measure(2, "return_rate", 1),
        measure(1, "return_rate", null),
        measure(2, "return_rate", 0),
        measure(1, "payoff", 10),
        measure(1, "return_rate", 0.2),
      ],
      "return_rate",
    ),
  ).toEqual([
    { round: 1, value: 0.2 },
    { round: 2, value: 0.5 },
  ]);
});
test("task completion displays the final state of each round", () => {
  expect(
    roundSeries(
      [
        measure(1, "completion_rate", 0.25),
        measure(1, "completion_rate", 0.75),
      ],
      "completion_rate",
    ),
  ).toEqual([{ round: 1, value: 0.75 }]);
});
