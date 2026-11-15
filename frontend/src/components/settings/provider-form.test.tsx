import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithQueries } from "@/test/queries";
import { ProviderForm } from "./provider-form";

test("save failures use the shared error UI and retain the unsaved provider draft", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { detail: "Pause active work before changing providers." },
        { status: 409 },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <ProviderForm
      provider={{
        id: "openai",
        kind: "openai",
        base_url: "https://api.openai.com/v1",
        configured: false,
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("API key"), {
    target: { value: "test-only-key" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save provider" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Provider wasn’t saved",
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Pause active work");
  expect(screen.getByLabelText("API key")).toHaveValue("test-only-key");
  expect(fetcher).toHaveBeenCalledOnce();
});
