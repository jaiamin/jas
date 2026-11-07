import { ArrowUpRight, Check, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ErrorState,
  Loading,
  PageHeading,
  RunTable,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge, Empty, Table } from "@/components/ui/data";
import { useApi } from "@/lib/api";
import type { Catalog, RunSummary, Settings } from "@/lib/types";
import { modelLabel, money } from "@/lib/utils";

export default function Library({
  view,
}: {
  view: "runs" | "environments" | "settings";
}) {
  if (view === "runs") return <Runs />;
  if (view === "environments") return <Environments />;
  return <SettingsPage />;
}
function Runs() {
  const runs = useApi<RunSummary[]>("/runs", true);
  return (
    <>
      <PageHeading title="Runs">
        <Button variant="outline" asChild>
          <Link to="/new">
            <Plus data-icon="inline-start" />
            New experiment
          </Link>
        </Button>
      </PageHeading>
      {runs.error ? (
        <ErrorState error={runs.error} />
      ) : !runs.data ? (
        <Loading />
      ) : runs.data.length ? (
        <RunTable runs={runs.data} selectable />
      ) : (
        <Empty
          title="No runs yet"
          description="Create an experiment to define the agents, conditions, and rules."
        >
          <Button asChild>
            <Link to="/new">Create experiment</Link>
          </Button>
        </Empty>
      )}
    </>
  );
}
function Environments() {
  const catalog = useApi<Catalog>("/catalog");
  return (
    <>
      <PageHeading title="Environments" />
      {catalog.error ? (
        <ErrorState error={catalog.error} />
      ) : !catalog.data ? (
        <Loading />
      ) : (
        <div className="environment-catalog">
          {catalog.data.environments.map((env, i) => (
            <section className="environment-row" key={env.key}>
              <div className="environment-sample" data-series={i}>
                {env.key === "commons" ? (
                  <div className="commons-symbol">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <div />
                  </div>
                ) : env.key === "trust_exchange" ? (
                  <div className="exchange-symbol">
                    <span>A</span>
                    <ArrowUpRight />
                    <span>B</span>
                  </div>
                ) : (
                  <div className="task-symbol">
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                )}
              </div>
              <div className="environment-description">
                <h2>{env.name}</h2>
                <p>{env.description}</p>
                <div className="environment-measures">
                  {env.measures.slice(0, 4).map((m) => (
                    <Badge key={m}>{m.replaceAll("_", " ")}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to={`/new?template=${env.key}`}>
                  Use environment
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </section>
          ))}
        </div>
      )}
      <details className="disclosure">
        <summary>Add an environment</summary>
        <p className="muted">
          Implement a Python environment adapter to add new mechanics. AI uses
          the environments installed here.
        </p>
      </details>
    </>
  );
}
function SettingsPage() {
  const settings = useApi<Settings>("/settings", true);
  if (settings.error) return <ErrorState error={settings.error} />;
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
                  {configured ? "Key configured" : "Not configured"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="muted">
            Set keys in <code>.env</code> and restart.
          </p>
          <div className="section-space">
            <h2>Model pricing</h2>
            <div className="table-frame">
              <Table>
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
            <p className="muted">
              Token estimates before credits, cache discounts or web search.
            </p>
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
              <dd>{s.storage} · persistent local data</dd>
            </div>
            <div>
              <dt>Concurrent runs</dt>
              <dd>{s.concurrent_runs}</dd>
            </div>
          </dl>
          <details className="disclosure">
            <summary>Spending & deployment</summary>
            <p className="muted">
              Each request reserves its upper allowance before sending. Unknown
              usage retains that reservation. Adjust <code>ASS_BUDGET_USD</code>{" "}
              in <code>.env</code> for the workspace ceiling.
            </p>
            <p className="muted">
              Single-user local app. Data stays in the local database; model
              requests send evidence to the selected provider. Public hosting
              requires authentication.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
