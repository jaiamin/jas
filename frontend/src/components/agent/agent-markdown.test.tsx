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

test.each([
  ["https://tracking.example/chart?run=private-run", "Result chart"],
  ["/api/runs/private-run/export", ""],
])("model image %s requires an explicit user navigation", (url, alt) => {
  const { container } = render(<AgentMarkdown text={`![${alt}](${url})`} />);

  expect(container.querySelector("img, iframe, object, embed")).toBeNull();
  const link = screen.getByRole("link", {
    name: alt ? `Open image: ${alt}` : "Open image",
  });
  expect(link).toHaveAttribute("href", url);
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test.each(["javascript:alert%281%29", "data:text/html,untrusted"])(
  "model image rejects executable URL %s",
  (url) => {
    const { container } = render(
      <AgentMarkdown text={`![Untrusted image](${url})`} />,
    );

    expect(container.querySelector("img, a, iframe, object, embed")).toBeNull();
    expect(screen.getByText("Untrusted image")).toBeVisible();
  },
);
