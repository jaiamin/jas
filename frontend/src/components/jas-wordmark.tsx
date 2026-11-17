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
      <span className="inline-block -rotate-3">j</span>
      <span className="inline-block rotate-2">a</span>
      <span className="inline-block -rotate-2">s</span>
    </span>
  );
}
