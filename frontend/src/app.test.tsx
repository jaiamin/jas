import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import App from "@/app";
import { renderWithQueries } from "@/test/queries";

test("an unknown route provides recovery into the current experiments workspace", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      media,
      matches: false,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => true,
    })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json([]))),
  );
  renderWithQueries(
    <MemoryRouter initialEntries={["/missing-route"]}>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("Page not found", { exact: true }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Back to experiments" }));
  expect(
    await screen.findByRole("heading", { name: "Experiments" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "New experiment" })).toHaveAttribute(
    "href",
    "/new",
  );
});
