import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { PageBoundary } from "./page-boundary";

function Page({ fail }: { fail: boolean }) {
  if (fail) throw new Error("private implementation detail");
  return <p>Page content</p>;
}

test("render failures use the shared recovery UI without exposing the exception", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const view = render(
      <PageBoundary key="broken">
        <Page fail />
      </PageBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This page couldn’t load",
    );
    expect(screen.getByRole("button", { name: "Reload page" })).toBeEnabled();
    expect(
      screen.queryByText("private implementation detail"),
    ).not.toBeInTheDocument();
    view.rerender(
      <PageBoundary key="another-page">
        <Page fail={false} />
      </PageBoundary>,
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  } finally {
    log.mockRestore();
  }
});
