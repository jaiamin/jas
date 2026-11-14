import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { AgentIcon, ArrowRight, Play } from "@/components/icons";
import { ErrorState } from "@/components/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useApi } from "@/lib/api";
import { label } from "@/lib/format";
import type { Environment, EnvironmentId, Starter } from "@/lib/types";

const mechanics: Record<EnvironmentId, { observes: string; enforces: string }> =
  {
    reviewed_finite: {
      observes:
        "The independently reviewed finite contract, current state, credits and escrow, permitted operations and the actor's own static private facts. Other actors' private fields stay outside observations and memory.",
      enforces:
        "An external exhaustive transition table is required for independent admission. Admitted import-free artifacts propose bounded transitions; World permissions, resource conservation, terminal states and the horizon settle consequences. This narrow profile does not establish natural-language understanding or implement richer dynamic information policies.",
    },
    institutional_workflow: {
      observes:
        "Six to twelve participants see owned work, prerequisite status, finite materials, permitted artifact versions and their addressed inbox. Contents and private memory follow actor permissions.",
      enforces:
        "Exclusive claims, declared delegation, accepted prerequisites and selected-recipient handoffs. A work start atomically spends materials and a write; completion and mail follow logical time. Conflict priority is explicit, and prose cannot change procedures.",
    },
    reliance_commitments: {
      observes:
        "Four participants have local values, actor-scoped evidence, private commitment opportunities and addressed mail. Only a voluntary recipient can entrust its declared artifact's read access to the promisor.",
      enforces:
        "Typed promises and reliance, declared opening/deadline windows, final alternative choices and independent recipient effects. Feasibility, actual opportunities, unresolved deadlines and null outcomes remain explicit. A mechanical breach does not establish deception or betrayal.",
    },
    sealed_relay: {
      observes:
        "Public phase, action credits, own explicit permission and authorized memory. Only the reviewer receives the private docket.",
      enforces:
        "Independently admitted finite transitions, explicit permissions, three shared credits, bounded isolated execution and complete replay. Unsupported mechanics cannot execute.",
    },
    distributed_coordination: {
      observes:
        "An explicit directory and topology, actor-scoped evidence, shared draft versions and addressed inbox. The shared-information control opens evidence readers; private value content requires an authorized read.",
      enforces:
        "Independent final alternatives or abstention, local values and a declared all-match bonus. Sequential or phased settlement, stable conflict priority and delayed logical-time mail are explicit factors. Provider completion speed grants no World priority.",
    },
    artifact_workspace: {
      observes:
        "Permitted document identities, versions, write allowance and actual read/check results. Contents require an authorized read; private sources stay scoped to their readers.",
      enforces:
        "Fixed access rules, immutable evidence, versioned work, atomic version conflicts and a finite write allowance. Submit checks content and source versions; stop or horizon ends unsuccessfully.",
    },
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

export function EnvironmentDetails({
  environment: env,
}: {
  environment: Environment;
}) {
  const starters = useApi<Starter[]>("/starters");
  const starter = starters.data?.find(
    (item) => item.design.environment === env.key,
  );
  return (
    <>
      <SheetHeader className="gap-3 px-6 pt-6">
        <div className="flex items-center gap-3 pr-8">
          <EnvironmentMark environment={env.key} />
          <SheetTitle>{env.name}</SheetTitle>
        </div>
        <SheetDescription>{env.description}</SheetDescription>
      </SheetHeader>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
        {starters.error && (
          <ErrorState error={starters.error} onRetry={starters.refetch} />
        )}
        {starter && (
          <Button variant="outline" className="self-start" asChild>
            <Link to={`/watch/${starter.id}`}>
              <Play data-icon="inline-start" />
              Watch a recorded run
            </Link>
          </Button>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">What agents observe</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {mechanics[env.key].observes}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">What the environment enforces</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {mechanics[env.key].enforces}
          </p>
        </section>
        <Accordion type="multiple">
          <AccordionItem value="controls">
            <AccordionTrigger>Available controls</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {env.parameters.map((parameter) => (
                  <Badge key={parameter} variant="secondary">
                    {label(parameter)}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Edit controls, agent roles, memory and the horizon in an
                experiment. A narrative changes the context; these rules
                determine the consequences.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="measurements">
            <AccordionTrigger>Metrics ({env.measures.length})</AccordionTrigger>
            <AccordionContent>
              <dl className="flex flex-col gap-4">
                {env.measures.map((measure) => (
                  <div key={measure} className="flex flex-col gap-1">
                    <dt className="font-medium">{label(measure)}</dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">
                      {env.measure_definitions[measure]}
                    </dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {env.key === "composed" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Compose custom resource economies from tested mechanics. Other new
            mechanics require an environment implementation and correctness
            checks.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Rules {env.rule_version}
        </p>
      </div>
      <Separator />
      <SheetFooter className="gap-2 px-6 pt-0 pb-6">
        <Button asChild>
          <Link to={`/new?environment=${env.key}`}>
            Configure experiment
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link
            to="/assistant"
            state={{
              question: `Help me design an experiment using ${env.name}. Explain which behavior it can identify, suggest an isolated comparison, and flag limitations before proposing a protocol.`,
            }}
          >
            <AgentIcon data-icon="inline-start" />
            Design with Assistant
          </Link>
        </Button>
      </SheetFooter>
    </>
  );
}
