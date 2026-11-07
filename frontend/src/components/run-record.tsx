import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { RequestInspector } from "@/components/request-inspector";
import { Json } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import { api } from "@/lib/api";
import type { RunDetail } from "@/lib/types";
import { label, money } from "@/lib/utils";

export function RunRecord({ run }: { run: RunDetail }) {
  const summary = run.summary;
  const verify = useMutation({
    mutationFn: () =>
      api<{ verified_turns: number }>(`/runs/${summary.id}/verify`, {}),
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
      <RequestInspector requests={run.requests} />
    </>
  );
}
