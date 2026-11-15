import { useId } from "react";
import { Input } from "@/components/ui/input";
import type { Catalog, ModelId } from "@/lib/types";

export function ModelPicker({
  id,
  label,
  value,
  models,
  onChange,
  disabled,
  inherit = false,
}: {
  id?: string;
  label: string;
  value: string;
  models: Catalog["models"];
  onChange: (value: ModelId | "inherit") => void;
  disabled?: boolean;
  inherit?: boolean;
}) {
  const list = useId();
  return (
    <>
      <Input
        id={id}
        aria-label={label}
        list={list}
        value={value}
        disabled={disabled}
        autoComplete="off"
        placeholder="provider:model"
        onChange={(event) => onChange(event.target.value as ModelId)}
      />
      <datalist id={list}>
        {inherit && <option value="inherit">Condition default</option>}
        {models.map((model) => (
          <option key={model.id} value={model.id} />
        ))}
      </datalist>
    </>
  );
}
