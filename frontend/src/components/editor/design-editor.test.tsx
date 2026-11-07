import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import type { Catalog } from "@/lib/types";
import { design } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import { DesignEditor } from "./design-editor";

const catalog: Catalog = {
  models: [],
  environments: [
    {
      key: "institution",
      name: "Institution",
      description: "Oversight and sanctions",
      primary_metric: "sanction_rate",
      parameters: [],
      measures: ["sanction_rate"],
      rule_version: "2.0.0",
    },
  ],
  templates: [],
  design_schema: {},
};

afterEach(() => localStorage.clear());

for (const mode of ["visual", "json"]) {
  for (const succeeds of [true, false]) {
    test(`${mode} saves lock the submitted snapshot and ${succeeds ? "clear its draft on success" : "retain its draft on failure"}`, async () => {
      const response = deferredResponse();
      const fetcher = vi.fn().mockReturnValue(response.promise);
      vi.stubGlobal("fetch", fetcher);
      renderWithQueries(
        <MemoryRouter initialEntries={["/new"]}>
          <Routes>
            <Route
              path="/new"
              element={
                <DesignEditor
                  initial={design}
                  catalog={catalog}
                  studyId={null}
                  planId={null}
                  draftPath="/new"
                />
              }
            />
            <Route path="/studies/:id" element={<h1>Saved experiment</h1>} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(screen.getByLabelText("Experiment name"), {
        target: { value: "Submitted snapshot" },
      });
      if (mode === "json") {
        fireEvent.mouseDown(
          screen.getByRole("tab", { name: "Specification" }),
          {
            button: 0,
            ctrlKey: false,
          },
        );
      }
      const field = screen.getByLabelText(
        mode === "json" ? "Complete JSON specification" : "Experiment name",
      );
      const create = screen.getByRole("button", { name: "Create experiment" });
      fireEvent.click(create);
      await waitFor(() => expect(create).toBeDisabled());
      expect(field).toBeDisabled();
      for (const tab of screen.getAllByRole("tab")) expect(tab).toBeDisabled();
      if (mode === "visual") {
        expect(
          screen.getByRole("combobox", { name: "Environment" }),
        ).toBeDisabled();
        expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
      }
      fireEvent.click(create);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetcher.mock.calls[0][1].body).design.title).toBe(
        "Submitted snapshot",
      );
      expect(
        JSON.parse(localStorage.getItem("jas:draft:/new") ?? "null").design
          .title,
      ).toBe("Submitted snapshot");

      response.resolve(
        succeeds
          ? Response.json({ id: "saved" })
          : Response.json({ detail: "Save unavailable" }, { status: 503 }),
      );
      if (succeeds) {
        expect(
          await screen.findByRole("heading", { name: "Saved experiment" }),
        ).toBeInTheDocument();
        expect(localStorage.getItem("jas:draft:/new")).toBeNull();
      } else {
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Save unavailable",
        );
        expect(field).toBeEnabled();
        expect(create).toBeEnabled();
        expect(localStorage.getItem("jas:draft:/new")).not.toBeNull();
        fireEvent.change(field, {
          target: {
            value:
              mode === "json"
                ? JSON.stringify({ ...design, title: "Recovered edit" })
                : "Recovered edit",
          },
        });
        expect(field).toHaveValue(
          mode === "json"
            ? JSON.stringify({ ...design, title: "Recovered edit" })
            : "Recovered edit",
        );
      }
    });
  }
}
