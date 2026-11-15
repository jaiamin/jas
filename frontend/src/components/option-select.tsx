import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function OptionSelect<Value extends string>({
  id,
  value,
  onValueChange,
  options,
  label,
  disabled,
  className,
}: {
  id?: string;
  value: Value;
  onValueChange: (value: Value) => void;
  options: { value: Value; label: string; description?: string }[];
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const descriptionId = useId();
  return (
    <Select
      value={value}
      onValueChange={(value) => {
        const option = options.find((option) => option.value === value);
        if (option) onValueChange(option.value);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn("min-w-0", className)}
      >
        <SelectValue>
          {options.find((option) => option.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        className={
          options.some((option) => option.description)
            ? "w-(--radix-select-trigger-width) max-w-[calc(100vw-2rem)]"
            : undefined
        }
      >
        <SelectGroup>
          {options.map((option, index) => (
            <SelectItem
              key={option.value}
              value={option.value}
              textValue={option.label}
              aria-labelledby={`${descriptionId}-${index}-label`}
              aria-describedby={
                option.description ? `${descriptionId}-${index}` : undefined
              }
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span id={`${descriptionId}-${index}-label`}>
                  {option.label}
                </span>
                {option.description && (
                  <span
                    id={`${descriptionId}-${index}`}
                    className="text-xs leading-relaxed text-muted-foreground whitespace-normal"
                  >
                    {option.description}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
