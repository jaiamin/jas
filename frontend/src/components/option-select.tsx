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
  options: { value: Value; label: string }[];
  label: string;
  disabled?: boolean;
  className?: string;
}) {
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
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
