import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useSearchParams } from "react-router-dom";
import { Alert, Empty } from "@/components/feedback";
import {
  GalleryCards,
  GallerySkeleton,
} from "@/components/gallery/gallery-cards";
import {
  PublishingAccount,
  usePublishingAccount,
} from "@/components/gallery/publishing-account";
import { HomeWorld } from "@/components/home-world";
import { Globe, Moon, Sun } from "@/components/icons";
import { OptionSelect } from "@/components/option-select";
import { RecordListTitle } from "@/components/record-list-heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, api } from "@/lib/api";
import { label } from "@/lib/format";
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
            <Link to="/gallery/account">My published</Link>
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

function GalleryUnavailable({ retry }: { retry: () => unknown }) {
  return (
    <Empty
      title="Gallery is unavailable"
      description="We couldn’t load public experiments. Your local workspace still works."
    >
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </Empty>
  );
}

function GalleryResults({
  publicSurface,
  mine,
  filters,
}: {
  publicSurface: boolean;
  mine: boolean;
  filters: URLSearchParams;
}) {
  const [, setParams] = useSearchParams();
  const client = useQueryClient();
  const base = publicSurface ? "/gallery" : "/community";
  const path = mine ? `${base}/mine` : `${base}?${filters}`;
  const query = useQuery({
    queryKey: [path],
    queryFn: () => api<PublicationCard[]>(path),
    retry: false,
    placeholderData: keepPreviousData,
  });
  const expired =
    mine && query.error instanceof ApiError && query.error.status === 401;
  useEffect(() => {
    if (expired)
      client.invalidateQueries({
        queryKey: [publicSurface ? "/gallery-identity" : "/publishing"],
      });
  }, [client, expired, publicSurface]);
  const offset = Math.max(0, Number(filters.get("offset")) || 0);
  const filtered = ["world", "model", "tag"].some((key) => filters.has(key));
  const featured =
    !mine && !filtered && offset === 0
      ? (query.data ?? []).filter((card) => card.featured).slice(0, 3)
      : [];
  const shown = new Set(featured.map((card) => card.id));
  const remaining = (query.data ?? []).filter((card) => !shown.has(card.id));
  function page(next: number) {
    setParams((previous) => {
      const params = new URLSearchParams(previous);
      next > 0 ? params.set("offset", String(next)) : params.delete("offset");
      return params;
    });
  }
  if (expired) return null;
  if (!query.data) {
    return query.error ? (
      <GalleryUnavailable retry={query.refetch} />
    ) : (
      <GallerySkeleton />
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-6" aria-busy={query.isFetching}>
      {query.error && (
        <Alert title="Couldn’t refresh the gallery">
          Showing previously loaded records.
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {!query.data.length ? (
        <Empty
          title={
            mine
              ? "No publications yet"
              : filtered || offset > 0
                ? "No matching experiments"
                : "Nothing published yet"
          }
          description={
            mine
              ? "Share a finished experiment and the finding it supports."
              : filtered || offset > 0
                ? "Try a different filter or return to the latest results."
                : "Published findings will appear here, with their recorded evidence."
          }
        >
          {mine && !publicSurface ? (
            <Button variant="outline" asChild>
              <Link to="/experiments">Open experiments</Link>
            </Button>
          ) : filtered || offset > 0 ? (
            <Button variant="outline" onClick={() => setParams({})}>
              Clear filters
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          {featured.length > 0 && (
            <section
              aria-label="Featured experiments"
              className="flex flex-col gap-3"
            >
              <h2 className="text-sm font-medium">Featured</h2>
              <GalleryCards cards={featured} publicSurface={publicSurface} />
            </section>
          )}
          {remaining.length > 0 && (
            <section
              aria-label={mine ? "Your publications" : "Published experiments"}
              className="flex flex-col gap-3"
            >
              {featured.length > 0 && (
                <h2 className="text-sm font-medium">Latest experiments</h2>
              )}
              <GalleryCards
                cards={remaining}
                mine={mine}
                publicSurface={publicSurface}
              />
            </section>
          )}
        </>
      )}
      {!mine && (offset > 0 || query.data.length >= 60) && (
        <nav aria-label="Gallery pages" className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || query.isPlaceholderData}
            onClick={() => page(Math.max(0, offset - 60))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={query.data.length < 60 || query.isPlaceholderData}
            onClick={() => page(offset + 60)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

function BrowseGallery({
  publicSurface,
  filters,
}: {
  publicSurface: boolean;
  filters: URLSearchParams;
}) {
  const [, setParams] = useSearchParams();
  const base = publicSurface ? "/gallery" : "/community";
  const facets = useQuery({
    queryKey: [`${base}/filters`],
    queryFn: () =>
      api<{ worlds: string[]; models: string[]; tags: string[] }>(
        `${base}/filters`,
      ),
    retry: false,
    staleTime: 60_000,
  });
  const showFilters =
    ["world", "model", "tag", "sort"].some((key) => filters.has(key)) ||
    Object.values(facets.data ?? {}).some((values) => values.length > 0);
  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      value === "all" ? next.delete(key) : next.set(key, value);
      next.delete("offset");
      return next;
    });
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {showFilters && (
        <fieldset
          aria-label="Gallery filters"
          className="flex flex-wrap items-center gap-2"
        >
          {(["world", "model", "tag"] as const).map((key) => {
            const selected = filters.get(key);
            const values =
              facets.data?.[
                key === "world" ? "worlds" : key === "model" ? "models" : "tags"
              ] ?? [];
            const options = [
              ...new Set(selected ? [selected, ...values] : values),
            ];
            return (
              <OptionSelect
                key={key}
                label={`Filter ${key}`}
                value={selected ?? "all"}
                onValueChange={(value) => filter(key, value)}
                options={[
                  { value: "all", label: `All ${key}s` },
                  ...options.map((value) => ({
                    value,
                    label: key === "world" ? label(value) : value,
                  })),
                ]}
                className="h-8 max-w-full sm:max-w-52"
              />
            );
          })}
          <OptionSelect
            label="Sort publications"
            value={filters.get("sort") === "forks" ? "forks" : "newest"}
            onValueChange={(value) => filter("sort", value)}
            options={[
              { value: "newest", label: "Newest" },
              { value: "forks", label: "Most forked" },
            ]}
            className="h-8 max-w-full sm:ml-auto"
          />
        </fieldset>
      )}
      <GalleryResults
        publicSurface={publicSurface}
        mine={false}
        filters={filters}
      />
    </div>
  );
}

function MyPublished() {
  const status = usePublishingAccount();
  return (
    <div className="flex flex-col gap-6">
      <PublishingAccount />
      {status.data?.identity && (
        <GalleryResults
          publicSurface={false}
          mine
          filters={new URLSearchParams()}
        />
      )}
    </div>
  );
}

export default function GalleryPage({
  publicSurface = false,
  mine: publishedOnly = false,
}: {
  publicSurface?: boolean;
  mine?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const mine = publishedOnly || params.get("view") === "mine";
  const filters = new URLSearchParams(
    [...params].filter(([key]) =>
      ["world", "model", "tag", "sort", "offset"].includes(key),
    ),
  );
  if (publishedOnly)
    return (
      <GalleryResults publicSurface={publicSurface} mine filters={filters} />
    );
  if (publicSurface && mine) return <Navigate to="/gallery/account" replace />;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <RecordListTitle title="Gallery" icon={Globe} />
      </header>
      <Tabs
        value={mine ? "mine" : "browse"}
        className="min-w-0 gap-6"
        onValueChange={(view) =>
          setParams((previous) => {
            const next = new URLSearchParams(previous);
            view === "mine" ? next.set("view", "mine") : next.delete("view");
            return next;
          })
        }
      >
        <div className="flex flex-col gap-4">
          <TabsList
            aria-label="Gallery views"
            className="group-data-horizontal/tabs:h-7 border border-input p-0.5 [--accent:var(--background)] [--accent-foreground:var(--foreground)]"
          >
            <TabsTrigger value="browse" className="h-full px-2.5 py-0">
              Browse
            </TabsTrigger>
            <TabsTrigger value="mine" className="h-full px-2.5 py-0">
              My published
            </TabsTrigger>
          </TabsList>
          <Separator />
        </div>
        <TabsContent value="browse" className="min-w-0">
          <BrowseGallery publicSurface={publicSurface} filters={filters} />
        </TabsContent>
        <TabsContent value="mine" className="min-w-0">
          <MyPublished />
        </TabsContent>
      </Tabs>
    </div>
  );
}
