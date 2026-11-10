import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { participantHarness } from "@/lib/design";
import { catalog, design } from "@/test/fixtures";
import { deferredResponse, renderWithQueries } from "@/test/queries";
import { workflowRun } from "@/test/workflow";
import { DesignEditor } from "./design-editor";

// Native form checkboxes use ResizeObserver; jsdom does not implement layout.
beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
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
      fireEvent.mouseDown(screen.getByRole("tab", { name: "Question" }), {
        button: 0,
        ctrlKey: false,
      });
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
      if (mode === "visual")
        fireEvent.mouseDown(screen.getByRole("tab", { name: "Review" }), {
          button: 0,
          ctrlKey: false,
        });
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
        expect(
          screen.getByRole("button", { name: "Check experiment" }),
        ).toBeDisabled();
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
        if (mode === "visual")
          fireEvent.mouseDown(screen.getByRole("tab", { name: "Question" }), {
            button: 0,
            ctrlKey: false,
          });
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

test("free mechanics checks block invalid saves and become stale after editing", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      status: "blocked",
      probe_turns: 12,
      comparisons: [],
      limits: "Bounded instruments only.",
      issues: [
        {
          code: "inactive_intervention",
          severity: "error",
          message: "Changed setting is inactive.",
        },
      ],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter>
      <DesignEditor
        initial={design}
        catalog={catalog}
        studyId={null}
        planId={null}
        draftPath="/checks"
      />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Review" }), {
    button: 0,
    ctrlKey: false,
  });
  const create = screen.getByRole("button", { name: "Create experiment" });
  fireEvent.click(screen.getByRole("button", { name: "Check experiment" }));
  expect(
    await screen.findByText("Changed setting is inactive."),
  ).toBeInTheDocument();
  expect(create).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("/api/design/preflight");
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Question" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.change(screen.getByLabelText("Experiment name"), {
    target: { value: "Edited protocol" },
  });
  expect(
    screen.getByText("Protocol changed. Check again for current findings."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Changed setting is inactive."),
  ).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Review" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(
    screen.getByRole("button", { name: "Create experiment" }),
  ).toBeEnabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("workflow edits retain typed costs and delays in review, failed saves and drafts", async () => {
  const response = deferredResponse();
  const fetcher = vi.fn().mockReturnValue(response.promise);
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(
    <MemoryRouter>
      <DesignEditor
        initial={workflowRun.design}
        catalog={{
          ...catalog,
          environments: [
            {
              ...catalog.environments[0],
              key: "institutional_workflow",
              name: "Institutional workflow",
              parameters: ["workflow", "artifacts", "communication"],
            },
          ],
        }}
        studyId={null}
        planId={null}
        draftPath="/workflow"
      />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Conditions" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.change(screen.getByLabelText("Initial materials"), {
    target: { value: "9" },
  });
  fireEvent.change(screen.getByLabelText("Intake material cost"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Intake work duration"), {
    target: { value: "3" },
  });
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Review" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(screen.getByLabelText("Experiment review")).toHaveTextContent(
    "9 materials initially",
  );
  expect(screen.getByLabelText("Experiment review")).toHaveTextContent(
    "Intake · 4 materials · 3 ticks",
  );
  expect(screen.getByLabelText("Experiment review")).toHaveTextContent(
    "release depends on intake",
  );
  const create = screen.getByRole("button", { name: "Create experiment" });
  fireEvent.click(create);
  await waitFor(() => expect(create).toBeDisabled());
  expect(fetcher).toHaveBeenCalledTimes(1);
  const submitted = JSON.parse(fetcher.mock.calls[0][1].body).design
    .conditions[0].parameters;
  expect(submitted.workflow.resource_stock).toBe(9);
  expect(submitted.workflow.work_items[0]).toMatchObject({
    resource_cost: 4,
    duration: 3,
    workers: ["alder", "birch"],
    handoff_to: ["cedar", "dune"],
  });
  response.resolve(
    Response.json({ detail: "Save unavailable" }, { status: 503 }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Save unavailable",
  );
  expect(create).toBeEnabled();
  const draft = JSON.parse(
    localStorage.getItem("jas:draft:/workflow") ?? "null",
  );
  expect(draft.design.conditions[0].parameters).toEqual(submitted);
});

test("workflow population edits keep six to twelve identities and preserve bound workers", async () => {
  renderWithQueries(
    <MemoryRouter>
      <DesignEditor
        initial={workflowRun.design}
        catalog={{
          ...catalog,
          environments: [
            {
              ...catalog.environments[0],
              key: "institutional_workflow",
              parameters: ["workflow", "artifacts"],
            },
          ],
        }}
        studyId={null}
        planId={null}
        draftPath="/workflow-population"
      />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Agents" }), {
    button: 0,
    ctrlKey: false,
  });
  const add = screen.getByRole("button", { name: "Add agent" });
  expect(screen.getByRole("button", { name: "Remove Alder" })).toBeDisabled();
  fireEvent.click(add);
  expect(screen.getByRole("button", { name: "Remove Alder" })).toBeDisabled();
  await waitFor(() => {
    const draft = JSON.parse(
      localStorage.getItem("jas:draft:/workflow-population") ?? "null",
    ).design;
    expect(draft.conditions[0].parameters.workflow.turn_order).toEqual([
      "alder",
      "birch",
      "cedar",
      "dune",
      "elm",
      "fern",
      "agent-7",
    ]);
    expect(draft.conditions[0].parameters.workflow.conflict_order.at(-1)).toBe(
      "agent-7",
    );
  });
  for (let i = 0; i < 5; i++) fireEvent.click(add);
  expect(add).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove Agent 12" }));
  expect(add).toBeEnabled();
  await waitFor(() => {
    const draft = JSON.parse(
      localStorage.getItem("jas:draft:/workflow-population") ?? "null",
    ).design;
    expect(draft.profiles).toHaveLength(11);
    expect(draft.conditions[0].parameters.workflow.turn_order).not.toContain(
      "agent-12",
    );
    expect(
      draft.conditions[0].parameters.workflow.work_items[0].workers,
    ).toEqual(["alder", "birch"]);
  });
});

test("workflow tool participants can select authorized artifact reads without unsupported channels", async () => {
  const initial = structuredClone(workflowRun.design);
  initial.conditions[0].harness = participantHarness(
    "tool_using",
    "institutional_workflow",
  );
  renderWithQueries(
    <MemoryRouter>
      <DesignEditor
        initial={initial}
        catalog={{
          ...catalog,
          environments: [
            {
              ...catalog.environments[0],
              key: "institutional_workflow",
              parameters: [
                "workflow",
                "artifacts",
                "communication",
                "communication_channels",
                "memory",
              ],
            },
          ],
        }}
        studyId={null}
        planId={null}
        draftPath="/workflow-tools"
      />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Conditions" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Authorized artifacts" }),
  );
  expect(
    screen.queryByRole("checkbox", { name: "Private signals" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: "Factual reports" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: "Promises" }),
  ).not.toBeInTheDocument();
  await waitFor(() => {
    const draft = JSON.parse(
      localStorage.getItem("jas:draft:/workflow-tools") ?? "null",
    ).design;
    expect(draft.conditions[0].harness.tools).toEqual([
      "observe",
      "rules",
      "legal_options",
      "read_artifact",
    ]);
    expect(draft.conditions[0].harness.kind).toBe("tool_using");
  });
});
