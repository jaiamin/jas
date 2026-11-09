import { Link } from "react-router-dom";
import { type AppIcon, Plus, Search } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

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
        placeholder={`${label}…`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
    </InputGroup>
  );
}

export function RecordListHeading({
  title,
  icon: Icon,
  search,
  onSearchChange,
}: {
  title: "Experiments" | "Runs";
  icon: AppIcon;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header
      data-slot="record-list-heading"
      className="flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          className="size-9 rounded-lg after:rounded-lg after:border-0"
          aria-hidden="true"
        >
          <AvatarFallback
            data-active="true"
            className="rounded-lg bg-muted-foreground/15 [&>svg]:size-4.5 [&>svg:not([data-partial-fill])]:fill-current"
          >
            <Icon />
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-semibold tracking-tight sm:text-[1.375rem]">
          {title}
        </h1>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
          <RecordSearch
            label={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={onSearchChange}
          />
        </div>
        <Button asChild>
          <Link to="/new" aria-label="New experiment">
            <Plus data-icon="inline-start" />
            New
          </Link>
        </Button>
      </div>
    </header>
  );
}
