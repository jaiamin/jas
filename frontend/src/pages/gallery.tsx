import { useState } from "react";
import { Link, Outlet, useSearchParams } from "react-router-dom";
import { Empty } from "@/components/feedback";
import { HomeWorld } from "@/components/home-world";
import { Moon, Sun } from "@/components/icons";
import { OptionSelect } from "@/components/option-select";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, useApi } from "@/lib/api";
import { date, label } from "@/lib/format";
import type { PublicationCard } from "@/lib/publication";

export function GalleryShell() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:p-3">
        Skip to content
      </a>
      <header className="relative isolate overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <HomeWorld animated={false} />
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/gallery"
            aria-label="JAS gallery"
            className="flex items-center gap-2"
          >
            <img src="/logo.svg" className="size-6" alt="" />
            <span className="font-brand text-2xl font-extrabold tracking-[-0.04em]">
              jas
            </span>
          </Link>
          <nav
            aria-label="Gallery navigation"
            className="flex items-center gap-4 text-sm"
          >
            <Link to="/gallery">Gallery</Link>
            <Link to="/gallery/account">Publishing</Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.classList.toggle("dark", next);
                try {
                  localStorage.setItem("jas-theme", next ? "dark" : "light");
                } catch {
                  /* Theme works without storage. */
                }
              }}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-5 px-4 py-8 text-xs text-muted-foreground sm:px-6">
        <a href="https://github.com/jaiamin/jas">Get JAS</a>
        <Link to="/terms">Terms & reporting</Link>
        <a href="https://github.com/jaiamin/jas/discussions">
          Discuss on GitHub
        </a>
      </footer>
    </div>
  );
}

function GalleryCards({ cards }: { cards: PublicationCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <a
          key={card.id}
          href={card.url}
          className="group flex flex-col gap-3 rounded-xl border p-5 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{label(card.world)}</span>
            {card.verified && <span>Replay verified</span>}
          </div>
          <h2 className="text-base font-semibold group-hover:underline">
            {card.title}
          </h2>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {card.finding}
          </p>
          <p className="mt-auto break-words text-xs text-muted-foreground">
            {card.models.length ? card.models.join(", ") : "Scripted control"}
          </p>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>@{card.author}</span>
            <span>
              {card.fork_count} forks · {date(card.created)}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function GalleryPage({
  publicSurface = false,
  mine = false,
}: {
  publicSurface?: boolean;
  mine?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const filters = new URLSearchParams(
    [...params].filter(([key]) =>
      ["world", "model", "tag", "sort", "offset"].includes(key),
    ),
  );
  const path = mine
    ? publicSurface
      ? "/gallery/mine"
      : "/community/mine"
    : `${publicSurface ? "/gallery" : "/community"}?${filters}`;
  const query = useApi<PublicationCard[]>(path);
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      value ? next.set(key, value) : next.delete(key);
      next.delete("offset");
      return next;
    });
  }
  const featured = query.data?.filter((card) => card.featured) ?? [];
  return (
    <>
      <PageHeading
        title={mine ? "My published" : "Gallery"}
        description={
          mine
            ? "Your immutable publications and shared links."
            : "Controlled, replayable experiments on AI agents."
        }
      />
      {!mine && (
        <div className="mb-8 grid gap-3 sm:grid-cols-4">
          {["world", "model", "tag"].map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`gallery-${key}`}>{label(key)}</FieldLabel>
              <Input
                id={`gallery-${key}`}
                value={params.get(key) ?? ""}
                onChange={(event) => filter(key, event.target.value)}
                placeholder={`Any ${key}`}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel>Sort</FieldLabel>
            <OptionSelect
              label="Sort publications"
              value={params.get("sort") ?? "newest"}
              onValueChange={(value) => filter("sort", value)}
              options={[
                { value: "newest", label: "Newest" },
                { value: "forks", label: "Most forked" },
              ]}
            />
          </Field>
        </div>
      )}
      {query.error ? (
        <>
          <ErrorState error={query.error} onRetry={query.refetch} />
          {!publicSurface && (
            <Button variant="outline" asChild>
              <Link to="/settings#publishing">Connect the gallery</Link>
            </Button>
          )}
        </>
      ) : !query.data ? (
        <Loading />
      ) : !query.data.length ? (
        <Empty
          title={mine ? "No publications yet" : "No experiments found"}
          description={
            mine
              ? "Open a finished experiment's Publish tab to share its record."
              : "Try different filters or share a finished experiment."
          }
        >
          <Button variant="outline" asChild>
            {publicSurface ? (
              <a href="https://github.com/jaiamin/jas">
                Run your first experiment
              </a>
            ) : (
              <Link to="/experiments">Open experiments</Link>
            )}
          </Button>
        </Empty>
      ) : (
        <>
          {featured.length > 0 && !mine && (
            <section
              aria-label="Featured experiments"
              className="mb-9 space-y-4"
            >
              <h2 className="text-lg font-semibold">Featured</h2>
              <GalleryCards cards={featured} />
            </section>
          )}
          <GalleryCards cards={query.data} />
          {mine && (
            <div className="mt-6 space-y-3">
              {query.data.map((card) => (
                <div
                  key={card.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"
                >
                  <span>
                    {card.title} · version {card.version} · {card.visibility}
                  </span>
                  {removing === card.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Remove this page and its files?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          try {
                            await api(
                              `${publicSurface ? "/gallery" : "/community"}/${card.author}/${card.slug}?version=${card.version}`,
                              undefined,
                              "DELETE",
                            );
                            query.refetch();
                            setNotice(
                              "Unpublished. Downloaded copies cannot be recalled.",
                            );
                          } catch (error) {
                            setNotice(
                              error instanceof Error
                                ? error.message
                                : "Could not unpublish.",
                            );
                          }
                          setRemoving(null);
                        }}
                      >
                        Unpublish
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRemoving(card.id)}
                    >
                      Unpublish
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {query.data.length >= 60 && !mine && (
            <Button
              variant="outline"
              className="mt-6"
              onClick={() =>
                setParams({
                  ...Object.fromEntries(params),
                  offset: String(Number(params.get("offset") ?? 0) + 60),
                })
              }
            >
              Next page
            </Button>
          )}
        </>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm">
          {notice}
        </p>
      )}
    </>
  );
}
