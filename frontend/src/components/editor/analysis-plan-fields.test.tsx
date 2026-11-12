import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { design } from "@/test/fixtures";
import { AnalysisPlanFields } from "./analysis-plan-fields";

function Editor() {
  const [value, setValue] = useState({
    ...design,
    context: "Participant task only",
  });
  return (
    <>
      <AnalysisPlanFields
        design={value}
        metrics={["accuracy"]}
        onChange={setValue}
      />
      <output>{JSON.stringify(value)}</output>
    </>
  );
}

test("declaring and removing a plan preserves the experiment's participant context", () => {
  render(<Editor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Declare analysis plan" }),
  );
  fireEvent.change(screen.getByLabelText("Target of the conclusion"), {
    target: { value: "Only these fixed tasks." },
  });
  expect(screen.getByRole("status").textContent).toContain(
    '"context":"Participant task only"',
  );
  expect(screen.getByRole("status").textContent).toContain(
    '"target":"Only these fixed tasks."',
  );
  expect(screen.getByRole("status").textContent).toContain(
    '"exclusions":"retain_all"',
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove analysis plan" }));
  expect(screen.getByRole("status").textContent).toContain(
    '"analysis_plan":null',
  );
});

test("adding after removing an outcome keeps every identifier unique", () => {
  render(<Editor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Declare analysis plan" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Add outcome" }));
  fireEvent.click(screen.getByRole("button", { name: "Add outcome" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove outcome 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Add outcome" }));
  const value = JSON.parse(screen.getByRole("status").textContent ?? "{}");
  const keys = value.analysis_plan.outcomes.map((o: { key: string }) => o.key);
  expect(new Set(keys).size).toBe(keys.length);
});
