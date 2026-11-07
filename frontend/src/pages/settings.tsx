import { Check } from "lucide-react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Badge, Table } from "@/components/ui/data";
import { useApi } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { modelLabel, money } from "@/lib/utils";

export default function SettingsPage() {
  const settings = useApi<Settings>("/settings", true);
  if (settings.error)
    return <ErrorState error={settings.error} onRetry={settings.refetch} />;
  if (!settings.data) return <Loading />;
  const s = settings.data;
  return (
    <>
      <PageHeading title="Settings" />
      <div className="settings-layout">
        <section>
          <div className="section-heading">
            <h2>Model providers</h2>
          </div>
          <div className="provider-list">
            {Object.entries(s.providers).map(([provider, configured]) => (
              <div key={provider}>
                <strong>
                  {provider === "openai" ? "OpenAI" : "Anthropic"}
                </strong>
                <Badge
                  className={configured ? "status status-complete" : "status"}
                >
                  {configured && <Check />}
                  {configured ? "Configured" : "Not configured"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="muted">
            Set keys in <code>.env</code> and restart.
          </p>
          <div className="section-space">
            <h2 title="Token estimates before credits, cache discounts or web search">
              Model pricing
            </h2>
            <div className="table-frame">
              <Table className="table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Input / 1M</th>
                    <th>Output / 1M</th>
                  </tr>
                </thead>
                <tbody>
                  {s.models.map((m) => (
                    <tr key={m.id}>
                      <td>{modelLabel(m.id)}</td>
                      <td className="numeric">{money(m.input_per_million)}</td>
                      <td className="numeric">{money(m.output_per_million)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </section>
        <section>
          <h2>Usage & storage</h2>
          <dl className="key-values">
            <div>
              <dt>Committed cost</dt>
              <dd>
                {money(s.charged_usd)} / {money(s.budget_usd)}
              </dd>
            </div>
            <div>
              <dt>Requests</dt>
              <dd>{s.usage.requests}</dd>
            </div>
            <div>
              <dt>Input / output tokens</dt>
              <dd>
                {s.usage.input_tokens.toLocaleString()} /{" "}
                {s.usage.output_tokens.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>{s.storage}</dd>
            </div>
            <div>
              <dt>Concurrent runs</dt>
              <dd>{s.concurrent_runs}</dd>
            </div>
          </dl>
          <Disclosure className="disclosure">
            <DisclosureTrigger>Spending & deployment</DisclosureTrigger>
            <DisclosureContent>
              <p className="muted">
                Each request reserves its upper allowance before sending.
                Unknown usage retains that reservation. Adjust{" "}
                <code>JAS_BUDGET_USD</code> in <code>.env</code> for the
                workspace ceiling.
              </p>
              <p className="muted">
                Single-user local app. Data stays in the local database; model
                requests send evidence to the selected provider. Public hosting
                requires authentication.
              </p>
            </DisclosureContent>
          </Disclosure>
        </section>
      </div>
    </>
  );
}
