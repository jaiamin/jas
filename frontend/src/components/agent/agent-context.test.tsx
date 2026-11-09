import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AgentContext, contextLabel, messageContext } from "./agent-context";

test("message scope prefers its run and leaves unscoped follow-ups general", () => {
  expect(
    messageContext({ purpose: "analysis", run_id: "run", study_id: "study" }),
  ).toBe("run:run");
  expect(
    messageContext({ purpose: "analysis", run_id: null, study_id: "study" }),
  ).toBe("study:study");
  expect(
    messageContext({ purpose: "design", run_id: null, study_id: null }),
  ).toBe("general");
  expect(
    messageContext({ purpose: "general", run_id: null, study_id: null }),
  ).toBe("general");
});

test("an unavailable historical record retains its selected identity", () => {
  const onChange = vi.fn();
  render(
    <AgentContext
      value="run:historical"
      onChange={onChange}
      studies={[]}
      runs={[]}
    />,
  );
  expect(
    screen.getByRole("combobox", { name: "Message context" }),
  ).toHaveTextContent("Run historical");
  expect(contextLabel("study:historical", [], [])).toBe(
    "Experiment historical",
  );
  expect(onChange).not.toHaveBeenCalled();
});
