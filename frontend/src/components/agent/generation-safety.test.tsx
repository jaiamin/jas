import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  authoringContract,
  authoringProfile,
  authoringRuntime,
  authoringSettings,
  frozenAuthoringContract,
} from "@/test/finite-authoring";
import {
  authoringText,
  chooseChat,
  draftQuestion,
  freezeGeneration,
  generationWorkspace,
  openGeneration,
} from "@/test/generation-workspace";
import { deferredResponse } from "@/test/queries";

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

test.each(["", "0"])(
  "navigation keeps unfinished request limit '%s' and its contract without granting authority",
  async (value) => {
    const { writes } = generationWorkspace({ initial: "/agent?chat=first" });
    let dialog = await freezeGeneration();
    await waitFor(() =>
      expect(
        dialog.getByRole("button", { name: "Authorize generation" }),
      ).toBeEnabled(),
    );
    fireEvent.change(
      dialog.getByRole("spinbutton", { name: "Model requests" }),
      { target: { value } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await chooseChat("Second chat");
    await openGeneration();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await chooseChat("First chat");
    dialog = await openGeneration();
    expect(
      dialog.getByRole("textbox", {
        name: "Independent finite contract (JSON)",
      }),
    ).toHaveValue(authoringText);
    expect(
      dialog.getByRole("spinbutton", { name: "Model requests" }),
    ).toHaveValue(value === "" ? null : 0);
    expect(
      dialog.getByRole("button", { name: "Authorize generation" }),
    ).toBeDisabled();
    fireEvent.click(
      dialog.getByRole("button", { name: "Authorize generation" }),
    );
    expect(writes).toEqual([
      { path: "/api/extensions/contracts", body: authoringContract },
    ]);
  },
);

test.each([
  "jas-mechanics-authoring-draft-v0",
  "jas-mechanics-authoring-draft-v1",
])(
  "an incompatible saved mechanics draft %s stays intact until explicitly cleared",
  async (format) => {
    const key = "jas:agent-draft:safety:mechanics";
    const raw = JSON.stringify({
      format,
      text: authoringText,
      limits: {
        max_candidates: 1,
        max_requests: 6,
        max_output_tokens: 1024,
        max_input_bytes: 32000,
        budget_usd: 0.25,
      },
      frozen: {
        id: "2222222222222222",
        sha256: "2".repeat(64),
        text: authoringText,
      },
    });
    sessionStorage.setItem(key, raw);
    sessionStorage.setItem("unrelated-authoring-draft", "keep");
    const { writes } = generationWorkspace();
    const dialog = await openGeneration();
    expect(dialog.getByRole("alert")).toHaveTextContent(
      "Incompatible mechanics draft format. The saved draft is kept.",
    );
    expect(
      dialog.getByRole("button", { name: "Authorize generation" }),
    ).toBeDisabled();
    expect(sessionStorage.getItem(key)).toBe(raw);
    fireEvent.click(
      dialog.getByRole("button", { name: "Clear mechanics draft" }),
    );
    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      dialog.getByRole("textbox", {
        name: "Independent finite contract (JSON)",
      }),
    ).toHaveValue("");
    expect(sessionStorage.getItem("unrelated-authoring-draft")).toBe("keep");
    expect(writes).toEqual([]);
  },
);

test("restoring a frozen draft rejects a mismatched public source identity", async () => {
  sessionStorage.setItem(
    "jas:agent-draft:safety:mechanics",
    JSON.stringify({
      format: "jas-mechanics-authoring-draft-v2",
      text: authoringText,
      limits: {
        max_candidates: 1,
        max_requests: 6,
        max_output_tokens: 1024,
        max_input_bytes: 32000,
        budget_usd: 0.25,
      },
      frozen: {
        id: "2222222222222222",
        sha256: "2".repeat(64),
        text: authoringText,
      },
    }),
  );
  const { writes } = generationWorkspace({
    reads: (path) =>
      path === "/api/extensions/contracts/2222222222222222"
        ? Response.json({ ...frozenAuthoringContract, sha256: "6".repeat(64) })
        : undefined,
  });
  const dialog = await openGeneration();
  expect(await dialog.findByRole("alert")).toHaveTextContent(
    "does not match the frozen draft identity",
  );
  expect(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
  ).toHaveValue(authoringText);
  expect(
    dialog.getByRole("button", { name: "Authorize generation" }),
  ).toBeDisabled();
  expect(
    dialog.queryByRole("link", { name: "Inspect frozen contract" }),
  ).not.toBeInTheDocument();
  expect(writes).toEqual([]);
});

test("a pending generation restores after stream failure and remount without resubmitting", async () => {
  const pending = {
    id: "7777777777777777",
    chat_id: "first",
    question: draftQuestion,
    purpose: "general",
    status: "pending",
    output: { stage: "generating", partial: "" },
    error: null,
    cutoffs: {},
    created: "2026-11-10T18:30:00Z",
    study_id: null,
    run_id: null,
    usage: {
      requests: 1,
      input_tokens: 100,
      output_tokens: 20,
      cost_usd: 0.001,
      partial: false,
    },
    generation: {
      authorization: {
        contract_id: "2222222222222222",
        max_candidates: 1,
        max_requests: 6,
        max_output_tokens: 1024,
        max_input_bytes: 32000,
        budget_usd: 0.25,
      },
      contract: frozenAuthoringContract,
      requests: 1,
      candidates: 0,
      charged_usd: 0.001,
    },
  };
  const first = generationWorkspace({
    initial: "/agent?chat=first",
    messages: () => [pending],
  });
  expect(
    await screen.findByRole("heading", { name: draftQuestion }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  await waitFor(() => expect(first.streams).toHaveLength(1));
  const previousReads = first.reads.filter(
    (path) => path === "/api/chats/first",
  ).length;
  act(() => first.streams[0].onerror?.());
  expect(first.streams[0].close).toHaveBeenCalledOnce();
  await waitFor(
    () =>
      expect(
        first.reads.filter((path) => path === "/api/chats/first").length,
      ).toBeGreaterThan(previousReads),
    { timeout: 2500 },
  );
  expect(first.writes).toEqual([]);
  first.unmount();
  const second = generationWorkspace({
    initial: "/agent?chat=first",
    messages: () => [pending],
  });
  expect(
    await screen.findByRole("heading", { name: draftQuestion }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  expect(
    screen.queryByText("This view could not load"),
  ).not.toBeInTheDocument();
  expect(second.writes).toEqual([]);
});

test("reopening authoring refreshes stale containment before allowing generation", async () => {
  let stale = false;
  const { writes, reads } = generationWorkspace({
    runtime: () =>
      stale
        ? {
            ...authoringRuntime,
            status: "unqualified",
            validation_enabled: false,
            execution_enabled: false,
          }
        : authoringRuntime,
  });
  let dialog = await freezeGeneration();
  await waitFor(() =>
    expect(
      dialog.getByRole("button", { name: "Authorize generation" }),
    ).toBeEnabled(),
  );
  const previousReads = reads.filter(
    (path) => path === "/api/extensions/runtime",
  ).length;
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  stale = true;
  dialog = await openGeneration();
  expect(
    dialog.getByRole("button", { name: "Authorize generation" }),
  ).toBeDisabled();
  await waitFor(() =>
    expect(
      reads.filter((path) => path === "/api/extensions/runtime").length,
    ).toBeGreaterThan(previousReads),
  );
  expect(
    await dialog.findByText(
      /Check current executable containment before generation/,
    ),
  ).toBeInTheDocument();
  expect(writes).toEqual([
    { path: "/api/extensions/contracts", body: authoringContract },
  ]);
});

test("an incompatible generation profile is rejected with its own reason", async () => {
  const { writes } = generationWorkspace({
    profile: { ...authoringProfile, profile: "reviewed-finite-v0" },
  });
  const dialog = await freezeGeneration();
  expect(
    dialog.getByRole("button", { name: "Authorize generation" }),
  ).toBeDisabled();
  expect(dialog.getByRole("alert")).toHaveTextContent(
    "Unsupported generation profile",
  );
  expect(dialog.getByRole("alert")).toHaveTextContent("reviewed-finite-v0");
  expect(writes).toEqual([
    { path: "/api/extensions/contracts", body: authoringContract },
  ]);
});

test.each(["unqualified", "failed", "validation disabled"] as const)(
  "blocks generation when containment is %s",
  async (condition) => {
    const { writes } = generationWorkspace({
      runtime: () => ({
        ...authoringRuntime,
        status: condition === "validation disabled" ? "qualified" : condition,
        validation_enabled: false,
        execution_enabled: false,
      }),
    });
    const dialog = await freezeGeneration();
    expect(
      dialog.getByRole("button", { name: "Authorize generation" }),
    ).toBeDisabled();
    expect(
      dialog.getByText(
        /Check current executable containment before generation/,
      ),
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("link", { name: "Inspect containment" }),
    ).toHaveAttribute("href", "/environments");
    expect(writes).toEqual([
      { path: "/api/extensions/contracts", body: authoringContract },
    ]);
  },
);

test.each(["Researcher", "planner", "provider"] as const)(
  "blocks generation when the Sol %s is unavailable",
  async (condition) => {
    const { writes } = generationWorkspace({
      settings: {
        ...authoringSettings,
        ...(condition === "Researcher"
          ? { assistant_model: "openai:gpt-6-luna" }
          : {}),
        ...(condition === "planner"
          ? { planner_model: "openai:gpt-6-luna" }
          : {}),
        ...(condition === "provider"
          ? { providers: { openai: false, anthropic: false } }
          : {}),
      },
    });
    const dialog = await freezeGeneration();
    expect(
      dialog.getByRole("button", { name: "Authorize generation" }),
    ).toBeDisabled();
    expect(dialog.getByRole("status")).toHaveTextContent(
      "Configure the Sol Researcher and planner with an available OpenAI provider",
    );
    expect(writes).toEqual([
      { path: "/api/extensions/contracts", body: authoringContract },
    ]);
  },
);

test("a late freeze response cannot select a contract in a different chat", async () => {
  const response = deferredResponse();
  const { writes } = generationWorkspace({
    initial: "/agent?chat=first",
    freeze: () => response.promise,
  });
  let dialog = await openGeneration();
  fireEvent.change(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
    { target: { value: authoringText } },
  );
  fireEvent.click(
    dialog.getByRole("button", { name: "Freeze independent contract" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await chooseChat("Second chat");
  dialog = await openGeneration();
  const editor = dialog.getByRole("textbox", {
    name: "Independent finite contract (JSON)",
  });
  fireEvent.change(editor, { target: { value: `${authoringText}\n` } });
  fireEvent.change(dialog.getByRole("spinbutton", { name: "Model requests" }), {
    target: { value: "7" },
  });
  await act(async () =>
    response.resolve(Response.json(frozenAuthoringContract, { status: 201 })),
  );
  expect(editor).toHaveValue(`${authoringText}\n`);
  expect(
    dialog.getByRole("spinbutton", { name: "Model requests" }),
  ).toHaveValue(7);
  expect(
    dialog.queryByRole("link", { name: "Inspect frozen contract" }),
  ).not.toBeInTheDocument();
  expect(
    dialog.getByRole("button", { name: "Authorize generation" }),
  ).toBeDisabled();
  expect(writes).toEqual([
    { path: "/api/extensions/contracts", body: authoringContract },
  ]);
});

test("a late freeze response cannot reattach an edited contract", async () => {
  const response = deferredResponse();
  const { writes } = generationWorkspace({ freeze: () => response.promise });
  const dialog = await openGeneration();
  const editor = dialog.getByRole("textbox", {
    name: "Independent finite contract (JSON)",
  });
  fireEvent.change(editor, { target: { value: authoringText } });
  fireEvent.click(
    dialog.getByRole("button", { name: "Freeze independent contract" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  fireEvent.change(editor, { target: { value: `${authoringText}\n` } });
  await act(async () =>
    response.resolve(Response.json(frozenAuthoringContract, { status: 201 })),
  );
  expect(editor).toHaveValue(`${authoringText}\n`);
  expect(
    dialog.queryByRole("link", { name: "Inspect frozen contract" }),
  ).not.toBeInTheDocument();
  expect(
    dialog.getByRole("button", { name: "Authorize generation" }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
});

test("navigation restores each chat's contract, limits and frozen identity without a new mutation", async () => {
  const { writes } = generationWorkspace({ initial: "/agent?chat=first" });
  let dialog = await freezeGeneration();
  fireEvent.change(dialog.getByRole("spinbutton", { name: "Model requests" }), {
    target: { value: "5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await chooseChat("Second chat");
  dialog = await openGeneration();
  expect(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
  ).toHaveValue("");
  fireEvent.change(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
    { target: { value: `${authoringText}\n` } },
  );
  fireEvent.change(dialog.getByRole("spinbutton", { name: "Model requests" }), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await chooseChat("First chat");
  dialog = await openGeneration();
  expect(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
  ).toHaveValue(authoringText);
  expect(
    dialog.getByRole("spinbutton", { name: "Model requests" }),
  ).toHaveValue(5);
  expect(
    await dialog.findByRole("link", { name: "Inspect frozen contract" }),
  ).toHaveAttribute("href", "/api/extensions/contracts/2222222222222222");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await chooseChat("Second chat");
  dialog = await openGeneration();
  expect(
    dialog.getByRole("textbox", { name: "Independent finite contract (JSON)" }),
  ).toHaveValue(`${authoringText}\n`);
  expect(
    dialog.getByRole("spinbutton", { name: "Model requests" }),
  ).toHaveValue(7);
  expect(
    dialog.queryByRole("link", { name: "Inspect frozen contract" }),
  ).not.toBeInTheDocument();
  expect(writes).toEqual([
    { path: "/api/extensions/contracts", body: authoringContract },
  ]);
});

test("editing a frozen draft revokes its selected identity until another explicit freeze", async () => {
  let freezes = 0;
  const { writes } = generationWorkspace({
    freeze: async () =>
      Response.json(
        {
          ...frozenAuthoringContract,
          id: ++freezes === 1 ? "2222222222222222" : "6666666666666666",
        },
        { status: 201 },
      ),
  });
  const dialog = await freezeGeneration();
  const editor = dialog.getByRole("textbox", {
    name: "Independent finite contract (JSON)",
  });
  // A text edit only: the independently specified contract object stays identical.
  fireEvent.change(editor, { target: { value: `${authoringText}\n` } });
  expect(
    dialog.getByRole("button", { name: "Authorize generation" }),
  ).toBeDisabled();
  expect(
    dialog.queryByRole("link", { name: "Inspect frozen contract" }),
  ).not.toBeInTheDocument();
  expect(writes).toHaveLength(1);
  fireEvent.click(
    dialog.getByRole("button", { name: "Freeze independent contract" }),
  );
  expect(
    await dialog.findByRole("link", { name: "Inspect frozen contract" }),
  ).toHaveAttribute("href", "/api/extensions/contracts/6666666666666666");
  expect(writes).toEqual([
    { path: "/api/extensions/contracts", body: authoringContract },
    { path: "/api/extensions/contracts", body: authoringContract },
  ]);
});

test.each(["Send", "Enter"])(
  "ordinary %s never inherits a prepared generation allowance",
  async (method) => {
    const { writes } = generationWorkspace();
    await freezeGeneration();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    const message = screen.getByRole("textbox", { name: "Message Agent" });
    if (method === "Send")
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    else fireEvent.keyDown(message, { key: "Enter", code: "Enter" });
    await waitFor(() =>
      expect(writes[1]).toEqual({
        path: "/api/chats",
        body: { question: draftQuestion, context: "general", chat_id: null },
      }),
    );
    expect(writes).toHaveLength(2);
  },
);

test.each(["invalid JSON", "server rejection"])(
  "a failing freeze keeps %s and never authorizes generation",
  async (kind) => {
    const { writes } = generationWorkspace({
      freeze: async () =>
        Response.json(
          { detail: "External table is not exhaustive" },
          { status: 422 },
        ),
    });
    const dialog = await openGeneration();
    const text = kind === "invalid JSON" ? "{" : authoringText;
    const editor = dialog.getByRole("textbox", {
      name: "Independent finite contract (JSON)",
    });
    fireEvent.change(editor, { target: { value: text } });
    fireEvent.click(
      dialog.getByRole("button", { name: "Freeze independent contract" }),
    );
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Your JSON is kept above.",
    );
    expect(editor).toHaveValue(text);
    expect(
      dialog.getByRole("button", { name: "Authorize generation" }),
    ).toBeDisabled();
    expect(writes).toHaveLength(kind === "invalid JSON" ? 0 : 1);
    expect(
      dialog.queryByRole("link", { name: "Inspect frozen contract" }),
    ).not.toBeInTheDocument();
  },
);
