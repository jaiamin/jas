import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CustomEnvironments } from "@/components/environments/custom-environments";
import {
  EnvironmentCard,
  EnvironmentCardSkeleton,
} from "@/components/environments/environment-card";
import { EnvironmentDetails } from "@/components/environments/environment-details";
import { Alert, Empty } from "@/components/feedback";
import { Plus } from "@/components/icons";
import { RecordSearch } from "@/components/record-list-heading";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/lib/api";
import type { Catalog } from "@/lib/types";

const skeletonIds = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function Environments() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const catalog = useApi<Catalog>("/catalog");
  const view = params.get("view") === "custom" ? "custom" : "built-in";
  const environments = catalog.data?.environments ?? [];
  const selected = environments.find(
    (env) => env.key === params.get("environment"),
  );
  const query = search.trim().toLowerCase();
  const visibleEnvironments = environments
    .filter((env) =>
      `${env.name} ${env.description}`.toLowerCase().includes(query),
    )
    .toSorted(
      (a, b) => Number(a.key === "composed") - Number(b.key === "composed"),
    );
  function closeDetails() {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("environment");
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight outline-none sm:text-[1.375rem]"
        >
          Environments
        </h1>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
            <RecordSearch
              label="Search environments"
              value={search}
              onChange={setSearch}
            />
          </div>
          <Button asChild>
            <Link
              to="/new?template=composed&step=conditions"
              aria-label="Create environment"
            >
              <Plus data-icon="inline-start" />
              New
            </Link>
          </Button>
        </div>
      </header>
      <Tabs
        value={view}
        className="min-w-0 gap-5"
        onValueChange={(value) => {
          setSearch("");
          setParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete("environment");
            if (value === "custom") next.set("view", "custom");
            else next.delete("view");
            return next;
          });
        }}
      >
        <div className="flex flex-col gap-4">
          <TabsList
            aria-label="Environments"
            className="group-data-horizontal/tabs:h-7 border border-input p-0.5 [--accent:var(--background)] [--accent-foreground:var(--foreground)]"
          >
            <TabsTrigger value="built-in" className="h-full px-2.5 py-0">
              Built-in
            </TabsTrigger>
            <TabsTrigger value="custom" className="h-full px-2.5 py-0">
              Custom
            </TabsTrigger>
          </TabsList>
          <Separator />
        </div>
        <TabsContent value="built-in" className="min-w-0">
          {catalog.error && (
            <ErrorState error={catalog.error} onRetry={catalog.refetch} />
          )}
          {!catalog.data && !catalog.error ? (
            <div
              role="status"
              aria-label="Loading environments"
              aria-busy="true"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {skeletonIds.map((id) => (
                <EnvironmentCardSkeleton key={id} />
              ))}
            </div>
          ) : catalog.data && visibleEnvironments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleEnvironments.map((env) => (
                <EnvironmentCard
                  key={env.key}
                  environment={env}
                  onExplore={(trigger) => {
                    detailTrigger.current = trigger;
                    setParams((previous) => {
                      const next = new URLSearchParams(previous);
                      next.set("environment", env.key);
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          ) : catalog.data ? (
            <Empty
              title={
                query ? "No matching environments" : "No environments available"
              }
            >
              {query && (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              )}
            </Empty>
          ) : null}
          {catalog.data && params.has("environment") && !selected && (
            <Alert title="Environment not found">
              <Button variant="outline" size="sm" onClick={closeDetails}>
                Browse environments
              </Button>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="custom" className="min-w-0">
          <CustomEnvironments
            search={search}
            environments={environments}
            onClearSearch={() => setSearch("")}
          />
        </TabsContent>
      </Tabs>
      <Sheet
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) closeDetails();
        }}
      >
        {selected && (
          <SheetContent
            className="gap-4 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              (detailTrigger.current?.isConnected
                ? detailTrigger.current
                : heading.current
              )?.focus();
            }}
          >
            <EnvironmentDetails key={selected.key} environment={selected} />
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
