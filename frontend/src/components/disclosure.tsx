import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
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
    <CollapsibleTrigger
      className={cn("disclosure-trigger", className)}
      {...props}
    >
      {indicator && <ChevronRight className="disclosure-indicator" />}
      {children}
    </CollapsibleTrigger>
  );
}
