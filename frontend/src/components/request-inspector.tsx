import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, Json, Loading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/data";
import { api } from "@/lib/api";
import type { RequestEvidence, RunDetail } from "@/lib/types";
import { money } from "@/lib/utils";
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
    <section className="section-space">
      <div className="section-heading">
        <h2>Model requests</h2>
        <span className="muted">Includes unsuccessful attempts</span>
      </div>
      <div className="table-frame">
        <Table className="table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Turn</th>
              <th>Status</th>
              <th>Tokens in / out</th>
              <th>Estimated cost</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((call) => (
              <tr key={call.id} data-selected={requestId === call.id}>
                <td>
                  <Button
                    variant="link"
                    size="sm"
                    type="button"
                    className="turn-link"
                    onClick={() => setRequestId(call.id)}
                  >
                    {call.id.slice(0, 8)}
                  </Button>
                </td>
                <td>{call.turn ?? "—"}</td>
                <td>
                  <Status value={call.status} />
                  <span className="table-secondary">{call.error}</span>
                </td>
                <td className="numeric">
                  {call.input_tokens.toLocaleString()} /{" "}
                  {call.output_tokens.toLocaleString()}
                </td>
                <td className="numeric">
                  {money(call.cost_usd)}
                  {["unknown", "pending"].includes(call.status) && "*"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!requests.length && (
          <p className="table-no-results">No provider requests sent.</p>
        )}
      </div>
      {requestId && (
        <div className="request-inspector">
          {request.error ? (
            <ErrorState error={request.error} onRetry={request.refetch} />
          ) : !request.data ? (
            <Loading />
          ) : (
            <>
              <h3>Request {request.data.id.slice(0, 8)}</h3>
              {!request.data.request ? (
                <p className="muted">
                  This pilot request predates payload tracing.
                </p>
              ) : (
                <Disclosure className="disclosure">
                  <DisclosureTrigger>
                    Exact request, schema & settings
                  </DisclosureTrigger>
                  <DisclosureContent>
                    <Json value={request.data.request} />
                  </DisclosureContent>
                </Disclosure>
              )}
              <Disclosure className="disclosure" defaultOpen>
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
