import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AgentMarkdown } from "./agent-markdown";

test("untrusted model prose cannot inject HTML or executable links", () => {
  const { container } = render(
    <AgentMarkdown
      text={
        '<img src=x onerror="alert(1)"><iframe src="https://example.com"></iframe>\n\n[Unsafe](javascript:alert%281%29) · [Reference](https://example.com/paper)'
      }
    />,
  );
  expect(container.querySelector("img, iframe, script")).toBeNull();
  expect(screen.getByText("Unsafe").getAttribute("href")).not.toMatch(
    /^javascript:/i,
  );
  expect(screen.getByRole("link", { name: "Reference" })).toHaveAttribute(
    "href",
    "https://example.com/paper",
  );
});
