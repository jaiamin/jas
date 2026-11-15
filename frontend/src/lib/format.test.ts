import { expect, test } from "vitest";
import { metric, money, relativeTime, runModelLabel } from "./format";

test("cost estimates retain small charges while unavailable metrics stay absent", () => {
  expect(money(0.0012)).toBe("$0.0012");
  expect(money(0.000001)).toBe("$0.000001");
  expect(money(0.019956, 6)).toBe("$0.019956");
  expect(money(0)).toBe("$0.00");
  expect(money(12.34)).toBe("$12.34");
  expect(money(null)).toBe("Unknown");
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

test.each([
  ["2026-11-09T12:01:00Z", "Just now"],
  ["2026-11-09T11:59:01Z", "Just now"],
  ["2026-11-09T11:59:00Z", "1 minute ago"],
  ["2026-11-09T11:55:00Z", "5 minutes ago"],
  ["2026-11-09T11:00:00Z", "1 hour ago"],
  ["2026-11-09T09:00:00Z", "3 hours ago"],
  ["2026-11-08T12:00:00Z", "yesterday"],
  ["2026-11-06T12:00:00Z", "3 days ago"],
  ["2026-11-01T12:00:00Z", "Nov 1"],
  ["2025-11-01T12:00:00Z", "Nov 1, 2025"],
  ["invalid", "Unknown time"],
])(
  "draft age %s is concise without losing older dates",
  (timestamp, expected) => {
    expect(relativeTime(timestamp, Date.parse("2026-11-09T12:00:00Z"))).toBe(
      expected,
    );
  },
);

test.each([
  ["2026-11-09T11:59:30Z", "now"],
  ["2026-11-09T11:55:00Z", "5m"],
  ["2026-11-09T10:00:00Z", "2h"],
  ["2026-11-06T12:00:00Z", "3d"],
  ["2026-11-01T12:00:00Z", "Nov 1"],
  ["2025-11-01T12:00:00Z", "Nov 1, 2025"],
])(
  "compact chat age %s retains time and older date meaning",
  (timestamp, expected) => {
    expect(
      relativeTime(timestamp, Date.parse("2026-11-09T12:00:00Z"), "compact"),
    ).toBe(expected);
  },
);
