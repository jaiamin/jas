import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { parameters } from "@/test/fixtures";
import { MechanismFields } from "./mechanism-fields";

test("institution controls preserve sibling rules and authority identity", () => {
  const onChange = vi.fn();
  render(
    <MechanismFields
      environment="institution"
      parameters={parameters}
      profiles={[
        {
          key: "a",
          name: "Alice",
          role: "Monitor",
          goal: "Observe",
          model: null,
        },
      ]}
      id="rules"
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText("Oversight probability"), {
    target: { value: "0.8" },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    institution: { ...parameters.institution, oversight: 0.8 },
  });
  fireEvent.click(screen.getByLabelText("Allow appeals"));
  expect(onChange).toHaveBeenLastCalledWith({
    institution: { ...parameters.institution, appeal: false },
  });
  fireEvent.click(screen.getByLabelText("Alice"));
  expect(onChange).toHaveBeenLastCalledWith({
    institution: { ...parameters.institution, authorities: ["a"] },
  });
});

test("resource controls preserve rules and allow a full-capacity initial stock", () => {
  const onChange = vi.fn();
  render(
    <MechanismFields
      environment="renewable_resource"
      parameters={parameters}
      profiles={[]}
      id="rules"
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText("Regeneration rate"), {
    target: { value: "0.25" },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    resource: { ...parameters.resource, regeneration: 0.25 },
  });
  fireEvent.change(screen.getByLabelText("Initial stock"), {
    target: { value: "" },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    resource: { ...parameters.resource, initial_stock: null },
  });
});
