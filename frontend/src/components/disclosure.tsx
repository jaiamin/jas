import type { ComponentProps } from "react";
import { ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export {
  Collapsible as Disclosure,
  CollapsibleContent as DisclosureContent,
} from "@/components/ui/collapsible";

export function DisclosureTrigger({
  children,
  className,
  indicator = true,
  indicatorPosition = "start",
  size = "sm",
  ...props
}: ComponentProps<typeof CollapsibleTrigger> & {
  indicator?: boolean;
  indicatorPosition?: "start" | "end";
  size?: ComponentProps<typeof Button>["size"];
}) {
  return (
    <CollapsibleTrigger asChild {...props}>
      <Button
        variant="ghost"
        size={size}
        className={cn(
          "group max-w-full justify-start whitespace-normal",
          className,
        )}
      >
        {indicator && indicatorPosition === "start" && (
          <ChevronRight
            aria-hidden="true"
            className="transition-transform group-data-[state=open]:rotate-90"
          />
        )}
        {children}
        {indicator && indicatorPosition === "end" && (
          <ChevronRight
            aria-hidden="true"
            className="transition-transform group-data-[state=open]:rotate-90"
          />
        )}
      </Button>
    </CollapsibleTrigger>
  );
}
