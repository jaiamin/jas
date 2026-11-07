import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Progress } from "./progress";

test("custom maximum agrees with visual and accessible progress", () => {
  const { container, rerender } = render(<Progress value={20} max={40} />);
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "20",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "40",
  );
  expect(
    container.querySelector('[data-slot="progress-indicator"]'),
  ).toHaveStyle({ transform: "translateX(-50%)" });
  rerender(<Progress value={null} max={40} />);
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "data-state",
    "indeterminate",
  );
  expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
});
