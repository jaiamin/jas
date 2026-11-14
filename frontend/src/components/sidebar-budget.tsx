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
        className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
      >
        Budget unavailable
      </Link>
    ) : (
      <div
        role="status"
        aria-label="Loading budget"
        className="px-2 py-2 group-data-[collapsible=icon]:hidden"
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
  const format = (value: number) =>
    unpriced ? value.toLocaleString() : money(value);
  const amount = `${format(used)} / ${cap == null ? "uncapped" : format(cap)}`;
  const description = unpriced
    ? `Dollar cost unknown. ${amount} tokens, including reservations. ${money(s.charged_usd)} in priced usage.`
    : `${amount} committed across this workspace, including pending reservations. Open budget settings.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/settings"
          aria-label={`${title}: ${description}`}
          className="flex flex-col gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
        >
          <span className="flex items-center justify-between gap-2">
            <span>{title}</span>
            <span className="tabular-nums">{amount}</span>
          </span>
          <Progress
            aria-label={title}
            value={cap && cap > 0 ? Math.min(100, (used / cap) * 100) : 0}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-64">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
