import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Design, ExecutionEstimate } from "@/lib/types";

export function ProtocolEstimate({
  design,
  value,
}: {
  design: Design;
  value?: ExecutionEstimate;
}) {
  const estimate = useQuery({
    queryKey: ["design-estimate", design],
    queryFn: () => api<ExecutionEstimate>("/design/estimate", { design }),
    retry: false,
    enabled: !value,
  });
  const data = value ?? estimate.data;
  if (!data && estimate.error)
    return (
      <ErrorState
        title="Estimate unavailable"
        error={estimate.error}
        onRetry={estimate.refetch}
      />
    );
  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      {data ? (
        <>
          {data.runs} runs · up to {data.max_requests.toLocaleString()} calls ·{" "}
          {data.upper_usd == null
            ? "dollar cost unknown"
            : `up to ${money(data.upper_usd)}`}
          <span className="block">
            Conservative bound · spending ceiling {money(design.budget_usd)}
          </span>
        </>
      ) : (
        "Estimating runs and cost…"
      )}
    </p>
  );
}
