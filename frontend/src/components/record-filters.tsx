import { type ReactNode, useId, useState } from "react";
import { ChevronDown } from "@/components/icons";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Both filters share the stock Select trigger's spacing and regular label weight.
const triggerClassName =
  "min-w-0 max-w-full h-7 data-[size=default]:h-7 shrink gap-1.5 border-input bg-transparent py-1 text-[0.8125rem] leading-4 pr-2 has-data-[icon=inline-end]:pr-2 pl-2.5 font-normal hover:bg-muted sm:max-w-64";

function FilterGroup({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ButtonGroup aria-label={`${name} filter`} className="max-w-full">
      <ButtonGroupText className="border-input bg-transparent px-2.5 text-[0.8125rem] leading-4 dark:bg-input/30">
        {name}
      </ButtonGroupText>
      {children}
    </ButtonGroup>
  );
}

export function RecordStatusFilter({
  value,
  onValueChange,
  options,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <FilterGroup name="Status">
      <OptionSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        label={label}
        className={triggerClassName}
      />
    </FilterGroup>
  );
}

export function RecordScopeFilter({
  noun,
  value,
  onValueChange,
  options,
  loading,
}: {
  noun: "environment" | "experiment";
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();
  const all = `All ${noun}s`;
  const selected = options.find((option) => option.value === value);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setSearch("");
        setOpen(next);
      }}
    >
      <FilterGroup name={noun === "environment" ? "Environment" : "Experiment"}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-label={`Filter ${noun}`}
            aria-expanded={open}
            aria-controls={listId}
            disabled={loading}
            className={triggerClassName}
            title={selected?.label}
          >
            <span className="min-w-0 truncate">
              {value === "all" ? "All" : selected?.label}
            </span>
            <ChevronDown
              data-icon="inline-end"
              className="text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
      </FilterGroup>
      <PopoverContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] p-0"
      >
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            aria-label={`Search ${noun}s`}
            placeholder={`Search ${noun}s…`}
          />
          <CommandList id={listId}>
            <CommandEmpty>No matching {noun}s.</CommandEmpty>
            <CommandGroup>
              {[{ value: "all", label: all }, ...options].map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  data-checked={value === option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
