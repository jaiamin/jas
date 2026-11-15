import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CustomEnvironments } from "@/components/environments/custom-environments";
import { EnvironmentDetails } from "@/components/environments/environment-details";
import {
  EnvironmentRow,
  EnvironmentRowSkeleton,
} from "@/components/environments/environment-row";
import { ExtensionCandidates } from "@/components/environments/extension-candidates";
import { Alert, Empty } from "@/components/feedback";
import { Layers2 } from "@/components/icons";
import { RecordListHeading } from "@/components/record-list-heading";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ItemGroup } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/lib/api";
import { environmentOptions, workSettings } from "@/lib/environments";
import type { Catalog, Settings } from "@/lib/types";

const skeletonIds = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function Environments() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const detailTrigger = useRef<HTMLAnchorElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const catalog = useApi<Catalog>("/catalog");
  const settings = useApi<Settings>("/settings");
  const developer = settings.data?.preferences?.developer === true;
  const requestedView = params.get("view");
  const view =
    requestedView === "custom" || (developer && requestedView === "candidates")
      ? requestedView
      : "built-in";
  const environments = environmentOptions(
    catalog.data?.environments ?? [],
    developer,
  );
  const selected = environments.find(
    (env) => env.key === params.get("environment"),
  );
  const query = search.trim().toLowerCase();
  const visibleEnvironments = environments.filter((env) =>
    `${env.name} ${env.description}`.toLowerCase().includes(query),
  );
  const groups = [
    {
      title: "Work settings",
      items: visibleEnvironments.filter((env) =>
        workSettings.includes(env.key),
      ),
    },
    {
      title: "Games & mechanics",
      items: visibleEnvironments.filter(
        (env) => !workSettings.includes(env.key),
      ),
    },
  ];
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
      <RecordListHeading
        title="Environments"
        icon={Layers2}
        search={search}
        onSearchChange={setSearch}
        headingRef={heading}
        className="mb-6 px-0 py-0 sm:px-0 lg:px-0"
      />
      <Tabs
        value={view}
        className="min-w-0 gap-0"
        onValueChange={(value) => {
          setSearch("");
          setParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete("environment");
            next.delete("review");
            if (value !== "built-in") next.set("view", value);
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
            {developer && (
              <TabsTrigger value="candidates" className="h-full px-2.5 py-0">
                Candidates
              </TabsTrigger>
            )}
          </TabsList>
          <Separator />
        </div>
        <TabsContent value="built-in" className="@container min-w-0">
          {catalog.error && (
            <ErrorState error={catalog.error} onRetry={catalog.refetch} />
          )}
          {!catalog.data && !catalog.error ? (
            <div
              role="status"
              aria-label="Loading environments"
              aria-busy="true"
              className="grid grid-cols-1 gap-3 py-6 @2xl:grid-cols-2"
            >
              {skeletonIds.map((id) => (
                <EnvironmentRowSkeleton key={id} />
              ))}
            </div>
          ) : catalog.data && visibleEnvironments.length > 0 ? (
            <div className="flex flex-col gap-8 py-6">
              {groups
                .filter((group) => group.items.length)
                .map((group) => (
                  <section
                    key={group.title}
                    aria-label={group.title}
                    className="flex flex-col gap-3"
                  >
                    <h2 className="text-xs font-medium text-muted-foreground">
                      {group.title}
                    </h2>
                    <ItemGroup className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
                      {group.items.map((env) => {
                        const next = new URLSearchParams(params);
                        next.set("environment", env.key);
                        return (
                          <EnvironmentRow
                            key={env.key}
                            environment={env}
                            href={`/environments?${next}`}
                            onExplore={(trigger) => {
                              detailTrigger.current = trigger;
                            }}
                          />
                        );
                      })}
                    </ItemGroup>
                  </section>
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
        {developer && (
          <TabsContent value="candidates" className="min-w-0">
            <ExtensionCandidates
              search={search}
              selectedId={params.get("review")}
            />
          </TabsContent>
        )}
        <TabsContent value="custom" className="@container min-w-0">
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
            className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
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
