import { expect, test } from "vitest";
import { metric, money, runModelLabel } from "./utils";

test("cost estimates retain small charges while unavailable metrics stay absent", () => {
  expect(money(0.0012)).toBe("$0.0012");
  expect(money(12.34)).toBe("$12.34");
  expect(metric("accuracy", null)).toBe("—");
  expect(metric("accuracy", 0)).toBe("0.0");
  expect(metric("contribution_rate", 0)).toContain("0");
  expect(metric("contribution_rate", 0)).not.toBe("—");
});

test("run model labels reflect resolved profile models and legacy fallbacks", () => {
  expect(
    runModelLabel({
      model: "openai:gpt-6-luna",
      models: ["anthropic:claude-haiku-4-5"],
    }),
  ).toBe("claude-haiku-4-5");
  expect(runModelLabel({ model: "openai:gpt-6-luna", models: [] })).toBe(
    "GPT-6-luna",
  );
  expect(
    runModelLabel({
      model: "openai:gpt-6-luna",
      models: ["openai:gpt-6-luna", "openai:gpt-6.1-sol"],
    }),
  ).toBe("Mixed models");
});
