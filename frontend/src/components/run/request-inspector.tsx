import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Empty } from "@/components/feedback";
import { ErrorState, Json, Loading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { RequestEvidence, RunDetail } from "@/lib/types";
export function RequestInspector({
  requests,
}: {
  requests: RunDetail["requests"];
}) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const request = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => api<RequestEvidence>(`/requests/${requestId}`),
    enabled: !!requestId,
  });
  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2 className="text-base font-semibold">Model requests</h2>
        <span className="text-muted-foreground">
          Includes unsuccessful attempts
        </span>
      </div>
      <div className="min-w-0 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Work</TableHead>
              <TableHead>Turn</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens in / out</TableHead>
              <TableHead>Estimated cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((call) => (
              <TableRow
                key={call.id}
                data-state={requestId === call.id ? "selected" : undefined}
              >
                <TableCell>
                  <Button
                    variant="link"
                    size="sm"
                    type="button"
                    onClick={() => setRequestId(call.id)}
                  >
                    {call.id.slice(0, 8)}
                  </Button>
                </TableCell>
                <TableCell>
                  {call.analysis_id ? (
                    <a
                      className="underline underline-offset-4"
                      href={`/api/analyses/${call.analysis_id}`}
                    >
                      Analysis {call.analysis_id.slice(0, 5)}
                    </a>
                  ) : (
                    "Participant"
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {call.model.replace("openai:", "")}
                  </span>
                </TableCell>
                <TableCell>{call.turn ?? "—"}</TableCell>
                <TableCell>
                  <Status value={call.status} />
                  <span className="mt-1 block max-w-prose truncate text-xs font-normal text-muted-foreground">
                    {call.error}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {call.input_tokens.toLocaleString()} /{" "}
                  {call.output_tokens.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(call.cost_usd)}
                  {["unknown", "pending"].includes(call.status) && "*"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!requests.length && <Empty title="No provider requests sent" />}
      </div>
      {requestId && (
        <div className="mt-6">
          {request.error ? (
            <ErrorState error={request.error} onRetry={request.refetch} />
          ) : !request.data ? (
            <Loading />
          ) : (
            <>
              <h3 className="text-sm font-medium">
                Request {request.data.id.slice(0, 8)}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.data.analysis_id ? "Analysis" : "Participant"} ·{" "}
                {request.data.model} · {request.data.purpose}
              </p>
              {request.data.activation_id && (
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  Participant activation {request.data.activation_id}
                </p>
              )}
              {!request.data.request ? (
                <p className="text-muted-foreground">
                  No request payload was recorded.
                </p>
              ) : (
                <Disclosure className="min-w-0">
                  <DisclosureTrigger>
                    Exact request, schema & settings
                  </DisclosureTrigger>
                  <DisclosureContent>
                    <Json value={request.data.request} />
                  </DisclosureContent>
                </Disclosure>
              )}
              <Disclosure className="min-w-0" defaultOpen>
                <DisclosureTrigger>Provider response</DisclosureTrigger>
                <DisclosureContent>
                  <Json value={request.data.response} />
                </DisclosureContent>
              </Disclosure>
            </>
          )}
        </div>
      )}
    </section>
  );
}
