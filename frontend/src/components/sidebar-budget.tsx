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

function BudgetRing({ value, label }: { value: number | null; label: string }) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      className="relative hidden size-7 items-center justify-center group-data-[collapsible=icon]:flex"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle cx="18" cy="18" r="15" className="text-border" />
        <circle
          cx="18"
          cy="18"
          r="15"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - (value ?? 0)}
          strokeLinecap="round"
          opacity={value ? 1 : 0}
          className="text-primary"
        />
      </svg>
      <img src="/logo.svg" alt="" className="size-3 opacity-40" />
    </span>
  );
}

export function SidebarBudget() {
  const settings = useApi<Settings>("/settings", true);
  if (!settings.data)
    return settings.error ? (
      <Link
        to="/settings"
        aria-label="Budget unavailable. Open budget settings."
        className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
      >
        <span className="group-data-[collapsible=icon]:hidden">
          Budget unavailable
        </span>
        <BudgetRing value={null} label="Budget unavailable" />
      </Link>
    ) : (
      <div
        role="status"
        aria-label="Loading budget"
        className="px-2 py-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
      >
        <Skeleton className="h-3 w-full group-data-[collapsible=icon]:hidden" />
        <BudgetRing value={null} label="Loading budget" />
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
          className="flex flex-col gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <span className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            <span className="flex items-center justify-between gap-2">
              <span>{title}</span>
              <span className="tabular-nums">{amount}</span>
            </span>
            <Progress aria-label={title} value={percentage ?? 0} />
          </span>
          <BudgetRing value={percentage} label={`${title}: ${description}`} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-64">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
