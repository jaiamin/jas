import type { ReactNode } from "react";
import { AgentIcon, Code2, Ellipsis, ExperimentIcon } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const editorSections = [
  { value: "question", label: "Question" },
  { value: "agents", label: "Agents" },
  { value: "conditions", label: "Conditions" },
  { value: "execution", label: "Run plan" },
  { value: "review", label: "Review" },
  { value: "json", label: "Specification" },
] as const;

export function EditorHeading({
  revision,
  children,
}: {
  revision: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9 rounded-lg after:border-0" aria-hidden="true">
          <AvatarFallback className="rounded-lg bg-muted-foreground/15 [&>svg]:size-4.5">
            <ExperimentIcon />
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-semibold tracking-tight sm:text-[1.375rem]">
          {revision ? "Tune experiment" : "New experiment"}
        </h1>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}

export function EditorNavigation({
  disabled,
  showSpecification = true,
}: {
  disabled: boolean;
  showSpecification?: boolean;
}) {
  return (
    <div
      data-slot="editor-section-navigation"
      className="sticky top-0 z-10 min-w-0 bg-background"
    >
      <Separator className="absolute inset-x-0 bottom-0" />
      <div className="relative min-w-0 overflow-x-auto">
        <TabsList
          variant="line"
          aria-label="Experiment sections"
          className="gap-2 p-0 group-data-horizontal/tabs:h-9"
        >
          {editorSections
            .filter((section) => section.value !== "json" || showSpecification)
            .map((section) => (
              <TabsTrigger
                key={section.value}
                value={section.value}
                disabled={disabled}
                className="h-9 border-0 px-2 group-data-horizontal/tabs:after:bottom-0"
              >
                {section.value === "json" && <Code2 aria-hidden="true" />}
                {section.label}
              </TabsTrigger>
            ))}
        </TabsList>
      </div>
    </div>
  );
}

export function EditorLoading({
  revision,
  fromAgent = false,
}: {
  revision: boolean;
  fromAgent?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <EditorHeading revision={revision}>
        {!revision && (
          <Button type="button" variant="outline" size="sm" disabled>
            <AgentIcon data-icon="inline-start" />
            {fromAgent ? "Back to Assistant" : "Generate with Assistant"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Experiment options"
          disabled
        >
          <Ellipsis />
        </Button>
      </EditorHeading>
      <fieldset
        className="mb-6 flex items-center gap-1"
        aria-label="Builder mode"
        disabled
      >
        <Button type="button" size="sm" variant="ghost">
          Quick
        </Button>
        <Button type="button" size="sm" variant="secondary">
          Advanced
        </Button>
      </fieldset>
      <Tabs value="question" className="gap-0">
        <EditorNavigation disabled />
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-7"
          role="status"
          aria-label="Loading experiment"
        >
          <span className="sr-only">Loading experiment configuration</span>
          {["name", "question", "environment"].map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className={field === "question" ? "h-24" : "h-8"} />
            </div>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
