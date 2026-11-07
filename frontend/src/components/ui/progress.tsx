"use client";

import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const maximum = Number.isFinite(max) && max > 0 ? max : 100;
  const current =
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= maximum
      ? value
      : null;
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={current}
      max={maximum}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-sm bg-primary/20",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{
          transform: `translateX(-${100 - ((current ?? 0) / maximum) * 100}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
