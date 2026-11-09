import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Empty } from "@/components/feedback";
import { ArrowRight, MessageSquare } from "@/components/icons";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompact } from "@/hooks/use-compact";
import { api, useApi } from "@/lib/api";
import { label } from "@/lib/format";
import type { Catalog, EnvironmentId, SavedEnvironment } from "@/lib/types";

const mechanics: Record<EnvironmentId, { observes: string; enforces: string }> =
  {
    composed: {
      observes:
        "Own inventory, needs and utility. Stock and other inventories follow the selected visibility rules; controllers know the stocks they allocate.",
      enforces:
        "Finite stocks, allocation permissions, transfers, round consumption, unmet-need penalties, replenishment and terminal inventory utility. One action per agent per round.",
    },
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
  const horizontal = useCompact(701);
  const [pendingRemoval, setPendingRemoval] = useState<SavedEnvironment | null>(
    null,
  );
  const client = useQueryClient();
  const catalog = useApi<Catalog>("/catalog");
  const setups = useApi<SavedEnvironment[]>("/environments");
  const remove = useMutation({
    mutationFn: (record: SavedEnvironment) =>
      api(
        `/environments/${record.id}?revision=${record.revision}`,
        undefined,
        "DELETE",
      ),
    onSuccess: () => {
      setPendingRemoval(null);
      void client.invalidateQueries({ queryKey: ["/environments"] });
    },
  });
  const [params, setParams] = useSearchParams();
  const environments = catalog.data?.environments ?? [];
  const selected =
    environments.find((e) => e.key === params.get("environment"))?.key ??
    environments[0]?.key;
  return (
    <>
      <PageHeading title="Environments" />
      {catalog.error ? (
        <ErrorState error={catalog.error} onRetry={catalog.refetch} />
      ) : !catalog.data ? (
        <Loading />
      ) : (
        <Tabs
          className="min-w-0 gap-6"
          orientation={horizontal ? "horizontal" : "vertical"}
          value={selected}
          onValueChange={(value) =>
            setParams({ environment: value }, { replace: true })
          }
        >
          <TabsList
            className="max-w-full shrink-0 justify-start overflow-auto"
            aria-label="Environments"
          >
            {environments.map((env) => (
              <TabsTrigger key={env.key} value={env.key}>
                <span>{env.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {environments.map((env) => (
            <TabsContent
              key={env.key}
              value={env.key}
              className="flex min-w-0 flex-col gap-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 [&_p]:mt-2 [&_p]:max-w-prose [&_p]:text-muted-foreground">
                <div>
                  <h2 className="text-base font-semibold">{env.name}</h2>
                  <p>{env.description}</p>
                </div>
                <Badge variant="secondary">Rules {env.rule_version}</Badge>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
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
              <div className="grid gap-6 lg:grid-cols-2 [&_p]:mt-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
                <section>
                  <h3 className="text-sm font-medium">What agents observe</h3>
                  <p>{mechanics[env.key].observes}</p>
                </section>
                <section>
                  <h3 className="text-sm font-medium">
                    What the environment enforces
                  </h3>
                  <p>{mechanics[env.key].enforces}</p>
                </section>
              </div>
              <Accordion type="multiple">
                <AccordionItem value="controls">
                  <AccordionTrigger>Available controls</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap items-center gap-2">
                      {env.parameters.map((parameter) => (
                        <Badge key={parameter} variant="secondary">
                          {label(parameter)}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                      Edit controls, agent roles, memory and the horizon in an
                      experiment. A narrative changes the context; these rules
                      determine the consequences.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="measurements">
                  <AccordionTrigger>
                    Measurements ({env.measures.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid gap-4 [&>div]:grid [&>div]:gap-1 [&_dt]:font-medium [&_dd]:text-sm [&_dd]:text-muted-foreground">
                      {env.measures.map((measure) => (
                        <div key={measure}>
                          <dt>{label(measure)}</dt>
                          <dd>{env.measure_definitions[measure]}</dd>
                        </div>
                      ))}
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                Compose custom resource economies from tested mechanics. Other
                new mechanics require an environment implementation and
                correctness checks.
              </p>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <h2 className="text-base font-semibold">Custom environments</h2>
            <p className="text-muted-foreground">
              Reusable rules and experiment setups saved in this workspace.
              Editing or deleting one leaves saved experiments and evidence
              intact.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/new?template=composed&step=conditions">
              Create environment
            </Link>
          </Button>
        </div>
        {setups.error ? (
          <ErrorState error={setups.error} onRetry={setups.refetch} />
        ) : !setups.data ? (
          <Loading />
        ) : setups.data.length === 0 ? (
          <Empty
            title="No custom environments yet"
            description="Compose resource mechanics or adapt a template, then save the setup for reuse."
          />
        ) : (
          <ItemGroup>
            {setups.data.map((item) => (
              <Item key={item.id} variant="outline">
                <ItemContent>
                  <ItemTitle>
                    <Link to={`/new?setup=${item.id}&step=conditions`}>
                      {item.design.title}
                    </Link>
                  </ItemTitle>
                  <ItemDescription>
                    {label(item.design.environment)} · Revision {item.revision}{" "}
                    · Rules {item.rules}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/new?setup=${item.id}&step=conditions`}>
                      Edit & reuse
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      remove.reset();
                      setPendingRemoval(item);
                    }}
                  >
                    Delete
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
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
              Delete “{pendingRemoval?.design.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the custom environment from your workspace library.
              Saved experiments keep their own rules and evidence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && (
            <Alert variant="error">{remove.error.message}</Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingRemoval) remove.mutate(pendingRemoval);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete environment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
