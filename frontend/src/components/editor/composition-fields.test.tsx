import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { newResource, removeProfile } from "@/lib/design";
import type { CompositionRules } from "@/lib/types";
import { design } from "@/test/fixtures";
import { CompositionFields } from "./composition-fields";

function Editor() {
  const [rules, setRules] = useState<CompositionRules>({
    controllers_first: true,
    resources: [newResource()],
  });
  return (
    <>
      <CompositionFields
        id="test"
        profiles={design.profiles}
        rules={rules}
        onChange={setRules}
      />
      <output data-testid="rules">{JSON.stringify(rules)}</output>
    </>
  );
}

test("resource edits retain values across adding and removing another resource", () => {
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Resource name"), {
    target: { value: "Medicine" },
  });
  fireEvent.change(screen.getByLabelText("Initial stock"), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add resource" }));
  const remove = screen.getAllByRole("button", { name: "Remove resource" })[1];
  if (!remove) throw new Error("Second resource was not added");
  fireEvent.click(remove);
  const rules = JSON.parse(screen.getByTestId("rules").textContent ?? "{}");
  expect(rules.resources).toHaveLength(1);
  expect(rules.resources[0]).toMatchObject({
    name: "Medicine",
    initial_stock: 7,
  });
});

test("resource key editing preserves input focus until the edit is committed", () => {
  render(<Editor />);
  const input = screen.getByLabelText("Resource key");
  input.focus();
  fireEvent.change(input, { target: { value: "water" } });
  expect(input).toHaveFocus();
  fireEvent.blur(input);
  expect(
    JSON.parse(screen.getByTestId("rules").textContent ?? "{}").resources[0]
      .key,
  ).toBe("water");
});

test("removing an agent removes its controller permissions without mutating the original", () => {
  const key = design.profiles[0]?.key;
  if (!key) throw new Error("Missing participant fixture");
  const source = structuredClone(design);
  const condition = source.conditions[0];
  if (!condition) throw new Error("Missing condition fixture");
  condition.parameters.composition = {
    controllers_first: true,
    resources: [{ ...newResource(), controllers: [key] }],
  };
  const updated = removeProfile(source, key);
  expect(
    updated.conditions[0]?.parameters.composition?.resources[0]?.controllers,
  ).toEqual([]);
  expect(
    source.conditions[0]?.parameters.composition?.resources[0]?.controllers,
  ).toEqual([key]);
});
