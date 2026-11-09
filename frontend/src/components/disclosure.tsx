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
  ...props
}: ComponentProps<typeof CollapsibleTrigger> & { indicator?: boolean }) {
  return (
    <CollapsibleTrigger asChild {...props}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "group max-w-full justify-start whitespace-normal",
          className,
        )}
      >
        {indicator && (
          <ChevronRight className="transition-transform group-data-[state=open]:rotate-90" />
        )}
        {children}
      </Button>
    </CollapsibleTrigger>
  );
}
