import { useMutation } from "@tanstack/react-query";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ExposureInspection } from "@/components/exposure-inspection";
import { Alert } from "@/components/feedback";
import { Check } from "@/components/icons";
import { ActivationInspector } from "@/components/run/activation-inspector";
import { RequestInspector } from "@/components/run/request-inspector";
import { Json } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { label, money } from "@/lib/format";
import type { RunDetail } from "@/lib/types";

export function RunRecord({ run }: { run: RunDetail }) {
  const summary = run.summary;
  const verify = useMutation({
    mutationFn: () =>
      api<{ verified_turns: number }>(`/runs/${summary.id}/verify`, {}),
  });
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Execution record</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <dl className="grid gap-3 text-sm [&>div]:grid [&>div]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] [&>div]:gap-4 [&_dt]:text-muted-foreground [&_dd]:min-w-0 [&_dd]:break-words">
            <div>
              <dt>Run ID</dt>
              <dd>
                <code>{summary.id}</code>
              </dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{summary.model ?? "Non-model control"}</dd>
            </div>
            <div>
              <dt>Participant harness</dt>
              <dd>
                {label(run.harness.kind)} · v{run.harness.version} · up to{" "}
                {run.harness.max_requests} requests and{" "}
                {run.harness.max_tool_operations} operations per activation
              </dd>
            </div>
            {run.harness.kind === "scripted" && (
              <div>
                <dt>Reference policy</dt>
                <dd>{run.harness.policy} · actor-authorized input only</dd>
              </div>
            )}
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
              <dd>
                {run.harness.kind === "scripted"
                  ? "No model inference"
                  : `${run.design.response_tokens} tokens including reasoning`}
              </dd>
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
          <Disclosure>
            <DisclosureTrigger>Resolved condition</DisclosureTrigger>
            <DisclosureContent>
              <Json value={run.parameters} />
            </DisclosureContent>
          </Disclosure>
          <Disclosure className="min-w-0">
            <DisclosureTrigger>Full experiment specification</DisclosureTrigger>
            <DisclosureContent>
              <Json value={run.design} />
            </DisclosureContent>
          </Disclosure>
        </CardContent>
      </Card>
      <ExposureInspection path={`/runs/${summary.id}/exposure`} />
      <ActivationInspector activations={run.activations} />
      <RequestInspector requests={run.requests} />
    </>
  );
}
