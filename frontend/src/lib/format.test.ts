import { expect, test } from "vitest";
import { metric, money, runModelLabel } from "./format";

test("cost estimates retain small charges while unavailable metrics stay absent", () => {
  expect(money(0.0012)).toBe("$0.0012");
  expect(money(12.34)).toBe("$12.34");
  expect(metric("accuracy", null)).toBe("—");
  expect(metric("accuracy", 0)).toBe("0.0");
  expect(metric("contribution_rate", 0)).toContain("0");
  expect(metric("contribution_rate", 0)).not.toBe("—");
});

test("run model labels reflect resolved profile models", () => {
  expect(
    runModelLabel({
      models: ["anthropic:claude-haiku-4-5"],
    }),
  ).toBe("claude-haiku-4-5");
  expect(
    runModelLabel({
      models: ["openai:gpt-6-luna", "openai:gpt-6.1-sol"],
    }),
  ).toBe("Mixed models");
});
