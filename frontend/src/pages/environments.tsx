import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import { listSetups, removeSetup, type Setup } from "@/lib/setups";
import type { Catalog, EnvironmentId } from "@/lib/types";
import { label } from "@/lib/utils";

const mechanics: Record<EnvironmentId, { observes: string; enforces: string }> =
  {
    commons: {
      observes:
        "Own resources and signal; settled public contributions when history is retained. Choices within a round stay sealed.",
      enforces:
        "Contributions settle together. The pool is multiplied and shared equally. Scheduled resource changes can make earlier promises infeasible.",
    },
    trust_exchange: {
      observes:
        "A paired partner, the current transfer and permitted history. Private notes remain with their author.",
      enforces:
        "Sender transfers are multiplied. The receiver chooses how much to return. Only due, feasible promises enter fulfillment rates.",
    },
    coordination: {
      observes:
        "A shared task graph with progress, prerequisites and completed work, plus permitted messages and memory.",
      enforces:
        "Blocked and duplicate work consume turns without progress. Custom task dependencies determine whether the available horizon is sufficient.",
    },
    institution: {
      observes:
        "Role, balances, allocation and sanctions. Oversight determines whether unjustified sanctions can be reversed.",
      enforces:
        "Authority allocates, workers choose work or wait, and appeals are adjudicated by explicit rules. Role permissions constrain every action.",
    },
    bargaining: {
      observes:
        "The current binding offer, remaining surplus and own outside option. Retained history depends on the memory setting.",
      enforces:
        "Two agents alternate proposals and responses. Accepted splits bind; delay discounts the pie; exit uses specified outside options.",
    },
    information: {
      observes:
        "A noisy private signal and earlier reports when communication permits them. Hidden truth is withheld from participants.",
      enforces:
        "Choices are scored against seeded hidden truth. Signal accuracy, reporting and outcome feedback are separate controls.",
    },
    renewable_resource: {
      observes:
        "Current common stock, extraction limits and settled history when retained. Current extraction requests stay sealed.",
      enforces:
        "Scarce stock is rationed, then regenerates subject to capacity and collapse rules. Exhaustion can have irreversible consequences.",
    },
  };

export default function Environments() {
  const horizontal = useIsMobile(701);
  const [pendingRemoval, setPendingRemoval] = useState<Setup | null>(null);
  const [storageError, setStorageError] = useState("");
  const catalog = useApi<Catalog>("/catalog");
  const setups = useQuery({
    queryKey: ["environment-setups"],
    queryFn: listSetups,
  });
  const [params, setParams] = useSearchParams();
  const environments = catalog.data?.environments ?? [];
  const selected =
    environments.find((e) => e.key === params.get("environment"))?.key ??
    environments[0]?.key;
  return (
    <>
      <PageHeading
        title="Environments"
        description="Understand the rules. Configure the world your agents act in."
      />
      {catalog.error ? (
        <ErrorState error={catalog.error} onRetry={catalog.refetch} />
      ) : !catalog.data ? (
        <Loading />
      ) : (
        <Tabs
          className="environment-workbench"
          orientation={horizontal ? "horizontal" : "vertical"}
          value={selected}
          onValueChange={(value) =>
            setParams({ environment: value }, { replace: true })
          }
        >
          <TabsList className="environment-index" aria-label="Environments">
            {environments.map((env) => (
              <TabsTrigger key={env.key} value={env.key}>
                <span>{env.name}</span>
                <span className="muted">
                  {env.measures.length} measurements
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {environments.map((env) => (
            <TabsContent
              key={env.key}
              value={env.key}
              className="environment-detail"
            >
              <div className="environment-detail-heading">
                <div>
                  <h2>{env.name}</h2>
                  <p>{env.description}</p>
                </div>
                <Badge variant="secondary">Rules {env.rule_version}</Badge>
              </div>
              <div className="actions">
                <Button asChild>
                  <Link to={`/new?template=${env.key}&step=conditions`}>
                    Configure experiment
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    to="/agent?context=new"
                    state={{
                      question: `Help me design an experiment using ${env.name}. Explain which behavior it can identify, suggest an isolated comparison, and flag limitations before proposing a protocol.`,
                    }}
                  >
                    <MessageSquare data-icon="inline-start" />
                    Design with Agent
                  </Link>
                </Button>
              </div>
              <div className="environment-contract">
                <section>
                  <h3>What agents observe</h3>
                  <p>{mechanics[env.key].observes}</p>
                </section>
                <section>
                  <h3>What the environment enforces</h3>
                  <p>{mechanics[env.key].enforces}</p>
                </section>
              </div>
              <section>
                <h3>Available controls</h3>
                <div className="environment-measures">
                  {env.parameters.map((parameter) => (
                    <Badge key={parameter} variant="secondary">
                      {label(parameter)}
                    </Badge>
                  ))}
                </div>
                <p className="environment-footnote">
                  Edit controls, agent roles, memory and the horizon in an
                  experiment. A narrative changes the context; these rules
                  determine the consequences.
                </p>
              </section>
              <section>
                <h3>Measurements</h3>
                <dl className="environment-measurements">
                  {env.measures.map((measure) => (
                    <div key={measure}>
                      <dt>{label(measure)}</dt>
                      <dd>{env.measure_definitions[measure]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <p className="environment-footnote">
                New mechanics are installed as validated Python environment
                adapters. Existing rules support custom task graphs, resource
                shocks, oversight, private evidence and renewable systems.
              </p>
            </TabsContent>
          ))}
        </Tabs>
      )}
      {storageError && <Alert variant="error">{storageError}</Alert>}
      <section className="saved-setups">
        <div className="section-heading">
          <div>
            <h2>Saved setups</h2>
            <p className="muted">
              Reusable configurations in this browser. Edit a setup without
              changing saved experiments.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/new?step=conditions">New setup</Link>
          </Button>
        </div>
        {setups.error ? (
          <ErrorState error={setups.error} onRetry={setups.refetch} />
        ) : !setups.data ? (
          <Loading />
        ) : setups.data.length === 0 ? (
          <p className="environment-footnote">
            Configure an experiment, then choose Save reusable setup. Setups
            include roles, task graphs, conditions and execution settings.
          </p>
        ) : (
          <div className="saved-setup-list">
            {setups.data.map((item) => (
              <div key={item.id}>
                <div>
                  <Link to={`/new?setup=${item.id}&step=conditions`}>
                    {item.title}
                  </Link>
                  <p className="muted">
                    {label(item.environment)} · Rules {item.rules}
                  </p>
                </div>
                <div className="actions">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/new?setup=${item.id}&step=conditions`}>
                      Edit & reuse
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingRemoval(item)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove “{pendingRemoval?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the reusable setup from this browser. Saved
              experiments and their evidence remain available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingRemoval) return;
                try {
                  removeSetup(pendingRemoval.id);
                  setStorageError("");
                  void setups.refetch();
                } catch (error) {
                  setStorageError((error as Error).message);
                }
              }}
            >
              Remove setup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
