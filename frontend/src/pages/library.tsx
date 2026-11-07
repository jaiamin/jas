import { ArrowUpRight, Check, Database, KeyRound, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ErrorState,
  Loading,
  PageHeading,
  RunTable,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Empty, Table } from "@/components/ui/data";
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
      <PageHeading
        title="Runs"
        description="Watch execution, revisit decisions, and compare recorded outcomes."
      >
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
      <PageHeading
        title="Environments"
        description="Explicit rules for different kinds of interaction. Context is flexible; mechanics are verifiable."
      />
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
                <p className="muted">
                  Rules v{env.rule_version} · Recorded state · Exact replay
                </p>
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
      <Alert title="Bring your own mechanics">
        Add an environment with a Python adapter. AI designs experiments using
        the environments available here.
      </Alert>
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
      <PageHeading
        title="Workspace settings"
        description="Local configuration, provider access, and usage."
      />
      <div className="settings-layout">
        <section>
          <div className="section-heading">
            <h2>Model providers</h2>
            <KeyRound />
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
            Set keys in <code>.env</code> and restart. Keys stay on the backend.
            Configuration does not guarantee model access.
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
              Estimates use configured token rates, before credits or cache
              discounts. Confirm rates with your provider.
            </p>
          </div>
        </section>
        <section>
          <h2>Usage & storage</h2>
          <dl className="key-values">
            <div>
              <dt>Workspace committed cost</dt>
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
          <Alert title="Spending is explicit">
            Each request reserves its upper allowance before sending. Unknown
            usage retains that reservation. Adjust <code>ASS_BUDGET_USD</code>{" "}
            in <code>.env</code> for the workspace ceiling; each study has its
            own ceiling too.
          </Alert>
          <div className="local-info">
            <Database />
            <div>
              <h3>Local by design</h3>
              <p>
                Your database stays on this machine. Model requests send only
                the information needed by the selected provider. This app has no
                public-hosting authentication layer.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
