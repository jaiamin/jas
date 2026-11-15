import type { Ref } from "react";
import { Link } from "react-router-dom";
import { type AppIcon, Plus, Search } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export function RecordSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
    </InputGroup>
  );
}

export function RecordListTitle({
  title,
  icon: Icon,
  partialFill,
  headingRef,
  className,
}: {
  title: string;
  icon: AppIcon;
  partialFill?: "layers";
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar
        className="size-9 rounded-lg after:rounded-lg after:border-0"
        aria-hidden="true"
      >
        <AvatarFallback
          data-active="true"
          className="rounded-lg bg-muted-foreground/15 [&>svg]:size-4.5 [&>svg:not([data-partial-fill])]:fill-current"
        >
          <Icon data-partial-fill={partialFill} />
        </AvatarFallback>
      </Avatar>
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="text-xl font-semibold tracking-tight outline-none sm:text-[1.375rem]"
      >
        {title}
      </h1>
    </div>
  );
}

export function RecordListHeading({
  title,
  icon,
  partialFill,
  search,
  onSearchChange,
  headingRef,
  className,
}: {
  title: "Experiments" | "Runs" | "Environments";
  icon: AppIcon;
  partialFill?: "layers";
  search: string;
  onSearchChange: (value: string) => void;
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}) {
  return (
    <header
      data-slot="record-list-heading"
      className={cn(
        "flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8",
        className,
      )}
    >
      <RecordListTitle
        title={title}
        icon={icon}
        partialFill={partialFill}
        headingRef={headingRef}
      />
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
          <RecordSearch
            label={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={onSearchChange}
          />
        </div>
        {title === "Experiments" && (
          <Button asChild>
            <Link to="/new" aria-label="New experiment">
              <Plus data-icon="inline-start" />
              New
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
