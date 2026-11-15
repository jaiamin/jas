import type { ReactNode } from "react";
import type { AppIcon } from "@/components/icons";
import { RecordListTitle } from "@/components/record-list-heading";
import { Separator } from "@/components/ui/separator";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RecordDetailHeading({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: AppIcon;
  description?: string;
  children: ReactNode;
}) {
  return (
    <header className="@container/detail-heading flex flex-col gap-3">
      <div className="flex flex-col gap-4 @2xl/detail-heading:flex-row @2xl/detail-heading:items-start @2xl/detail-heading:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <RecordListTitle
            title={title}
            icon={icon}
            className="[&_h1]:wrap-anywhere"
          />
          {description && (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground wrap-anywhere">
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      </div>
    </header>
  );
}

export function RecordFacts({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-2 items-start gap-x-6 gap-y-3 min-[360px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-x-8">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1.5">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="flex min-h-8 min-w-0 items-center text-sm tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RecordSectionTabs({
  label,
  sections,
}: {
  label: string;
  sections: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <TabsList
          variant="line"
          aria-label={label}
          className="gap-6 p-0 group-data-horizontal/tabs:h-9"
        >
          {sections.map((section) => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="h-9 border-0 px-0 group-data-horizontal/tabs:after:bottom-0"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <Separator />
    </div>
  );
}
