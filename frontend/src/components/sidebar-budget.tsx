import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApi } from "@/lib/api";
import { money } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function SidebarBudget() {
  const settings = useApi<Settings>("/settings", true);
  if (!settings.data)
    return settings.error ? (
      <Link
        to="/settings"
        aria-label="Budget unavailable. Open budget settings."
        className="mx-2 w-[calc(var(--sidebar-width)-2rem-1px)] shrink-0 whitespace-nowrap px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
      >
        Budget unavailable
      </Link>
    ) : (
      <div
        role="status"
        aria-label="Loading budget"
        className="mx-2 w-[calc(var(--sidebar-width)-2rem-1px)] shrink-0 px-2 py-2 group-data-[collapsible=icon]:hidden"
      >
        <Skeleton className="h-3 w-full" />
      </div>
    );
  const s = settings.data;
  const unpriced = s.usage.cost_usd == null;
  const tokenCap = s.preferences.token_budget;
  const title = unpriced ? "Tokens" : "Usage";
  const used = unpriced ? s.committed_tokens : s.charged_usd;
  const cap = unpriced ? tokenCap : s.budget_usd;
  const percentage =
    cap != null && cap > 0 ? Math.min(100, (used / cap) * 100) : null;
  const usedLabel = unpriced
    ? used.toLocaleString()
    : used > 0 && used < 0.001
      ? "<$0.001"
      : money(used, 3);
  const capLabel =
    cap == null ? "uncapped" : unpriced ? cap.toLocaleString() : money(cap, 2);
  const amount = `${usedLabel} / ${capLabel}`;
  const description = unpriced
    ? `Cost unknown; ${money(s.charged_usd, 6)} priced. ${amount} tokens, including reservations.`
    : `${money(used, 6)} / ${cap == null ? "uncapped" : money(cap, 6)} committed, including reservations.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/settings"
          aria-label={`${title}: ${description}`}
          className="mx-2 flex w-[calc(var(--sidebar-width)-2rem-1px)] shrink-0 flex-col gap-2.5 whitespace-nowrap rounded-lg border border-sidebar-border bg-muted/40 px-3 pt-3 pb-3.5 text-xs text-muted-foreground transition-colors hover:border-sidebar-foreground/20 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium text-sidebar-foreground">{title}</span>
            <span className="tabular-nums">{amount}</span>
          </span>
          <Progress aria-label={title} value={percentage} className="h-1.25" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-64">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
