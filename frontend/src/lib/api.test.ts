import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError, api, invalidateResources } from "./api";

afterEach(() => vi.unstubAllGlobals());

test("requests use GET without a body and serialize POST bodies", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"id":"study"}'));
  vi.stubGlobal("fetch", fetch);
  await expect(api("/studies")).resolves.toEqual({ id: "study" });
  expect(fetch).toHaveBeenLastCalledWith("/api/studies", {
    method: "GET",
    headers: undefined,
    body: undefined,
  });
  fetch.mockResolvedValueOnce(new Response('{"id":"created"}'));
  await expect(api("/studies", { title: "Test" })).resolves.toEqual({
    id: "created",
  });
  expect(fetch).toHaveBeenLastCalledWith("/api/studies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"title":"Test"}',
  });
});

test.each([
  [
    422,
    {
      detail: [
        { loc: ["body", "design", "profiles", 0, "goal"], msg: "Required" },
        { loc: ["body", "rounds"], msg: "Too small" },
      ],
    },
    "design → profiles → 0 → goal: Required. rounds: Too small",
  ],
  [404, { detail: "Run not found" }, "Run not found"],
  [
    500,
    { detail: [null, { unexpected: true }] },
    "JAS couldn’t complete this request. Try again shortly.",
  ],
  [
    503,
    "Unavailable",
    "JAS couldn’t complete this request. Try again shortly.",
  ],
])("normalizes HTTP %s errors", async (status, body, message) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
      }),
    ),
  );
  await expect(api("/runs/missing")).rejects.toMatchObject({
    name: "ApiError",
    message,
    status,
  });
  await expect(api("/runs/missing")).rejects.toBeInstanceOf(ApiError);
});

test("network failures have readable copy, preserve their cause and never retry", async () => {
  const error = new TypeError("Network unavailable");
  const fetch = vi.fn().mockRejectedValue(error);
  vi.stubGlobal("fetch", fetch);
  await expect(api("/runs", { action: "start" })).rejects.toMatchObject({
    name: "ApiError",
    message: "Couldn’t reach JAS. Check your connection and try again.",
    cause: error,
    status: 0,
  });
  expect(fetch).toHaveBeenCalledOnce();
});

test("unreadable successful responses do not expose parser errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<html>upstream error</html>")),
  );
  await expect(api("/runs")).rejects.toMatchObject({
    message: "JAS returned an unreadable response. Try again.",
    cause: expect.any(SyntaxError),
  });
});

test("resource refresh covers revision variants while leaving unrelated work untouched", async () => {
  const client = new QueryClient();
  const paths = [
    "/studies",
    "/studies/a",
    "/studies/a?revision=1",
    "/studies/b",
    "/catalog",
    "/chats/one",
    "/settings",
  ];
  for (const path of paths) client.setQueryData([path], {});
  client.setQueryData(["draft", "/new"], {});
  await invalidateResources(client, ["/studies", "/studies/a"]);
  for (const path of paths)
    expect(client.getQueryState([path])?.isInvalidated).toBe(
      path === "/studies" || path.startsWith("/studies/a"),
    );
  expect(client.getQueryState(["draft", "/new"])?.isInvalidated).toBe(false);
  client.clear();
});
