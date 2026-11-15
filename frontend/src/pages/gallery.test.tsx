import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import type { PublicationCard } from "@/lib/publication";
import Gallery from "@/pages/gallery";
import { renderWithQueries } from "@/test/queries";

const card: PublicationCard = {
  id: "publication-one",
  title: "Messages changed cooperation",
  finding: "Agents contributed more with messages in six matched seeds.",
  tags: ["communication"],
  models: ["openai:example"],
  world: "commons",
  author: "researcher",
  slug: "messages",
  version: 1,
  created: "2026-11-15T00:00:00Z",
  visibility: "public",
  verified: true,
  featured: true,
  fork_count: 2,
  sha256: "record-hash",
  url: "https://gallery.example/p/researcher/messages/v1",
};
function renderGallery(path = "/gallery") {
  return renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <Gallery />
    </MemoryRouter>,
  );
}

test("anonymous browsing never requests publishing credentials and featured cards appear once", async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url === "/api/community/filters")
        return Response.json({
          worlds: ["commons"],
          models: ["openai:example"],
          tags: ["communication"],
        });
      if (url === "/api/publishing")
        return Response.json({
          origin: "https://gallery.example",
          identity: null,
          error: null,
        });
      return Response.json([card]);
    }),
  );
  renderGallery();
  expect(
    await screen.findByRole("link", { name: /Messages changed cooperation/ }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: card.title })).toHaveLength(1);
  expect(calls).not.toContain("/api/publishing");
  expect(calls).not.toContain("/api/community/mine");
  expect(
    screen.queryByRole("button", { name: "Publish experiment" }),
  ).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("tab", { name: "My published" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(
    await screen.findByRole("button", { name: "Sign in with GitHub" }),
  ).toBeInTheDocument();
  expect(calls).not.toContain("/api/community/mine");
  expect(screen.queryByText("Connect the gallery")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Gallery URL")).not.toBeInTheDocument();
});

test("service failures have a calm recovery state and retry can recover", async () => {
  let available = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/filters"))
        return Response.json({ worlds: [], models: [], tags: [] });
      return available
        ? Response.json([])
        : Response.json({ detail: "Connection refused" }, { status: 503 });
    }),
  );
  renderGallery();
  expect(await screen.findByText("Gallery is unavailable")).toBeInTheDocument();
  expect(
    screen.queryByText("Could not load this view"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Connection refused")).not.toBeInTheDocument();
  available = true;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Nothing published yet")).toBeInTheDocument();
});

test("my publications uses one card and requires confirmation before removing a version", async () => {
  const writes: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "DELETE") {
        writes.push(url);
        return Response.json(
          { detail: "Please try again shortly." },
          { status: 503 },
        );
      }
      if (url === "/api/publishing")
        return Response.json({
          origin: "https://gallery.example",
          identity: { handle: "researcher", scope: "publish" },
          error: null,
        });
      return Response.json([card]);
    }),
  );
  renderGallery("/gallery?view=mine");
  expect(
    await screen.findByRole("heading", { name: card.title }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: card.title })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
  expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  expect(writes).toHaveLength(0);
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Unpublish",
    }),
  );
  await waitFor(() =>
    expect(writes).toEqual(["/api/community/researcher/messages?version=1"]),
  );
  expect(
    await screen.findByText("Please try again shortly."),
  ).toBeInTheDocument();
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});

test("an expired publishing token returns to sign-in without labelling browsing unavailable", async () => {
  let identityReads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/publishing") {
        identityReads += 1;
        return Response.json({
          origin: "https://gallery.example",
          identity:
            identityReads === 1
              ? { handle: "researcher", scope: "publish" }
              : null,
          error: null,
        });
      }
      return Response.json({ detail: "Sign in again" }, { status: 401 });
    }),
  );
  renderGallery("/gallery?view=mine");
  expect(
    await screen.findByRole("button", { name: "Sign in with GitHub" }),
  ).toBeInTheDocument();
  expect(identityReads).toBeGreaterThan(1);
  expect(screen.queryByText("Gallery is unavailable")).not.toBeInTheDocument();
});

test("device approval updates the same publishing view automatically", async () => {
  let approved = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/publishing")
        return Response.json({
          origin: "https://gallery.example",
          identity: approved
            ? { handle: "researcher", scope: "publish" }
            : null,
          error: null,
        });
      if (url === "/api/publishing/login")
        return Response.json({
          device_code: "dummy-device-authorization",
          user_code: "ABCD1234",
          verification_uri: "https://gallery.example/login?user_code=ABCD1234",
          interval: 5,
        });
      if (url === "/api/publishing/login/poll") {
        approved = true;
        return Response.json({ status: "signed_in" });
      }
      return Response.json([]);
    }),
  );
  renderGallery("/gallery?view=mine");
  fireEvent.click(
    await screen.findByRole("button", { name: "Sign in with GitHub" }),
  );
  expect(await screen.findByText("No publications yet")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Manage devices" })).toHaveAttribute(
    "href",
    "https://gallery.example/gallery/account",
  );
});
