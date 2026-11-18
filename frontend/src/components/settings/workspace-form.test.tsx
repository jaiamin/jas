import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { settings } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import { WorkspaceForm } from "./workspace-form";

test("workspace settings stay locked to the submitted values until the save settles", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const response = deferredResponse();
  const request = vi.fn(() => response.promise);
  vi.stubGlobal("fetch", request);
  renderWithQueries(<WorkspaceForm settings={settings} />);
  const budget = screen.getByLabelText("Workspace USD ceiling");
  fireEvent.change(budget, { target: { value: "19" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Save workspace settings" }),
  );
  const saving = await screen.findByRole("button", { name: "Saving…" });
  const controls = [
    budget,
    screen.getByLabelText("Workspace token ceiling"),
    screen.getByRole("combobox", { name: "Protocol designer model" }),
    screen.getByRole("combobox", { name: "Assistant model" }),
    screen.getByRole("checkbox", { name: /Allow planner web research/ }),
    screen.getByRole("checkbox", { name: /Developer tools/ }),
  ];
  for (const control of [...controls, saving]) expect(control).toBeDisabled();
  expect(request).toHaveBeenCalledWith(
    "/api/settings",
    expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining('"budget_usd":19'),
    }),
  );

  response.resolve(Response.json({}));
  expect(await screen.findByText("Workspace settings saved.")).toBeVisible();
  for (const control of controls) expect(control).toBeEnabled();
});
