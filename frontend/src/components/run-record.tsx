import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, Json, Loading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Table } from "@/components/ui/data";
import { api } from "@/lib/api";
import type { RequestEvidence, RunDetail } from "@/lib/types";
import { label, money } from "@/lib/utils";

export function RunRecord({ run }: { run: RunDetail }) {
  const summary = run.summary;
  const [requestId, setRequestId] = useState<string | null>(null);
  const client = useQueryClient();
  const request = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => api<RequestEvidence>(`/requests/${requestId}`),
    enabled: !!requestId,
  });
  const verify = useMutation({
    mutationFn: () =>
      api<{ verified_turns: number }>(`/runs/${summary.id}/verify`, {}),
    onSuccess: () => client.invalidateQueries(),
  });
  return (
    <>
      <div className="settings-layout">
        <section>
          <h2>Execution record</h2>
          <dl className="key-values">
            <div>
              <dt>Run ID</dt>
              <dd>
                <code>{summary.id}</code>
              </dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{summary.model}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>
                {label(summary.environment)} · rules {run.state.rule_version}
              </dd>
            </div>
            <div>
              <dt>Usage</dt>
              <dd>
                {summary.usage.input_tokens.toLocaleString()} input /{" "}
                {summary.usage.output_tokens.toLocaleString()} output tokens
              </dd>
            </div>
            <div>
              <dt>Price estimate</dt>
              <dd>
                {money(summary.usage.cost_usd)}
                {summary.usage.partial &&
                  " · includes pending/unknown reservations"}
              </dd>
            </div>
            <div>
              <dt>Response limit</dt>
              <dd>{run.design.response_tokens} tokens including reasoning</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            disabled={verify.isPending}
            onClick={() => verify.mutate()}
          >
            <Check data-icon="inline-start" />
            Verify exact replay
          </Button>
          {verify.data && (
            <Alert>
              {verify.data.verified_turns} turns verified locally. No model
              calls.
            </Alert>
          )}
          {verify.error && (
            <Alert variant="error">{verify.error.message}</Alert>
          )}
        </section>
        <section>
          <h2>Resolved condition</h2>
          <Json value={run.parameters} />
          <Disclosure className="disclosure">
            <DisclosureTrigger>Full experiment specification</DisclosureTrigger>
            <DisclosureContent>
              <Json value={run.design} />
            </DisclosureContent>
          </Disclosure>
        </section>
      </div>
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
              {run.requests.map((call) => (
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
          {!run.requests.length && (
            <p className="table-no-results">No provider requests sent.</p>
          )}
        </div>
        {requestId && (
          <div className="request-inspector">
            {request.error ? (
              <ErrorState error={request.error} />
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
    </>
  );
}
