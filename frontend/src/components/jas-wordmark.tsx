import { cn } from "@/lib/utils";

export function JasWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-baseline font-brand font-extrabold tracking-[-0.04em]",
        className,
      )}
    >
      jas
    </span>
  );
}
