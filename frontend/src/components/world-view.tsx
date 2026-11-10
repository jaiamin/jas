import { ArtifactView } from "@/components/artifact-view";
import { CoordinationView } from "@/components/coordination-view";
import { Empty } from "@/components/feedback";
import { Check, Circle, Clock3 } from "@/components/icons";
import { MechanismView } from "@/components/mechanism-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkflowView } from "@/components/workflow-view";
import { label } from "@/lib/format";
import type { Event, Profile, RunDetail, State } from "@/lib/types";

function isContributions(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (amount) => typeof amount === "number" && Number.isFinite(amount),
    )
  );
}

export function WorldView({
  run,
  state,
  events,
  onAgent,
}: {
  run: RunDetail;
  state: State;
  events: Event[];
  onAgent: (key: string) => void;
}) {
  const profiles = run.design.profiles;
  if (run.design.environment === "institutional_workflow")
    return (
      <WorkflowView run={run} state={state} events={events} onAgent={onAgent} />
    );
  if (run.design.environment === "sealed_relay") {
    const outcome =
      state.outcome && "success" in state.outcome ? state.outcome : null;
    const rules = run.parameters.relay;
    return (
      <section
        aria-label="Sealed relay state"
        className="flex min-w-0 flex-col gap-4"
      >
        <h2 className="text-base font-semibold">Sealed relay</h2>
        <p className="text-sm text-muted-foreground">
          Researcher view of enforced mechanics. Participant observations use
          their explicit permissions; explanations cannot settle a transition.
        </p>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Phase</dt>
            <dd>
              {["Sealed", "Lodged", "Released", "Stopped"][state.phase ?? 0]}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Action credits</dt>
            <dd>{state.credits} of 3 remaining</dd>
          </div>
          {rules && (
            <div>
              <dt className="text-muted-foreground">Permissions</dt>
              <dd>
                Submitter {rules.submitter} · Reviewer {rules.reviewer}
              </dd>
            </div>
          )}
          {outcome && (
            <div>
              <dt className="text-muted-foreground">Terminal result</dt>
              <dd>
                {label(outcome.reason)} ·{" "}
                {outcome.success ? "Success" : "Unsuccessful"}
              </dd>
            </div>
          )}
        </dl>
        <details className="min-w-0 text-sm">
          <summary>Pinned executable package</summary>
          <p className="mt-3 break-all text-muted-foreground">
            SHA-256 {state.package_sha256}
          </p>
        </details>
      </section>
    );
  }
  if (
    ["distributed_coordination", "reliance_commitments"].includes(
      run.design.environment,
    )
  )
    return <CoordinationView run={run} state={state} events={events} />;
  if (run.design.environment === "artifact_workspace")
    return <ArtifactView run={run} state={state} />;
  if (run.design.environment === "coordination") {
    const tasks = state.tasks;
    if (!tasks) throw new Error("Coordination checkpoint is missing tasks");
    return (
      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Shared project</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.filter((t) => t.completed_by).length} of {tasks.length} work
            packages complete
          </p>
        </div>
        {tasks.map((task) => (
          <Card size="sm" key={task.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {task.completed_by ? (
                  <Check className="size-4" />
                ) : (
                  <Circle className="size-4" />
                )}
                {task.name}
              </CardTitle>
              <CardDescription>
                {task.dependencies.length
                  ? `After ${task.dependencies.join(", ")}`
                  : "No prerequisites"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Progress
                max={task.effort}
                value={task.progress}
                aria-label={`${task.name} ${task.progress} of ${task.effort}`}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {task.progress} / {task.effort}
                </span>
                {task.completed_by && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      task.completed_by && onAgent(task.completed_by)
                    }
                  >
                    {profiles.find((p) => p.key === task.completed_by)?.name}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }
  if (run.design.environment === "trust_exchange")
    return (
      <section className="flex min-w-0 flex-col gap-4">
        <h2 className="text-base font-semibold">Exchange network</h2>
        <InteractionTable
          profiles={profiles}
          events={events}
          onAgent={onAgent}
        />
        <AgentBalances profiles={profiles} state={state} onAgent={onAgent} />
      </section>
    );
  if (run.design.environment !== "commons")
    return (
      <MechanismView
        run={run}
        state={state}
        events={events}
        onAgent={onAgent}
      />
    );
  if (!state.pending)
    throw new Error("Commons checkpoint is missing sealed choices");
  const previous = state.history.findLast((item) =>
    isContributions(item.contributions),
  );
  const contributions = isContributions(previous?.contributions)
    ? previous.contributions
    : undefined;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">The shared pool</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {previous
              ? `Contributions from settled round ${previous.round}`
              : "Contributions appear after the first round settles."}
          </p>
        </div>
        <Badge variant="outline">
          <Clock3 />
          {Object.keys(state.pending).length} / {profiles.length} choices sealed
        </Badge>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
              <TableHead className="text-right">Total payoff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.key}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAgent(profile.key)}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>
                        {profile.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    {profile.name}
                  </Button>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {contributions
                    ? `${contributions[profile.key]} / ${run.parameters.endowment}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {state.balances?.[profile.key]?.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            Total contribution{" "}
            <span className="ml-auto tabular-nums">
              {contributions
                ? Object.values(contributions).reduce((a, b) => a + b, 0)
                : "—"}
            </span>
          </ItemTitle>
          <p className="text-xs text-muted-foreground">
            Multiplied by {run.parameters.multiplier}, shared equally across{" "}
            {profiles.length} agents.
          </p>
        </ItemContent>
      </Item>
    </section>
  );
}
function AgentBalances({
  profiles,
  state,
  onAgent,
}: {
  profiles: Profile[];
  state: State;
  onAgent: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((profile) => (
        <Button
          key={profile.key}
          variant="outline"
          size="sm"
          onClick={() => onAgent(profile.key)}
        >
          {profile.name}
          <span className="tabular-nums">
            {state.balances?.[profile.key]?.toFixed(1)} credits
          </span>
        </Button>
      ))}
    </div>
  );
}
export function InteractionTable({
  profiles,
  events,
  onAgent,
}: {
  profiles: Profile[];
  events: Event[];
  onAgent: (key: string) => void;
}) {
  const edges = new Map<
    string,
    { source: string; target: string; amount: number; count: number }
  >();
  for (const event of events) {
    if (
      !event.actor ||
      !event.target ||
      !profiles.some((p) => p.key === event.target) ||
      !["transfer", "message"].includes(event.kind)
    )
      continue;
    const key = `${event.actor}:${event.target}`;
    const old = edges.get(key) ?? {
      source: event.actor,
      target: event.target,
      amount: 0,
      count: 0,
    };
    edges.set(key, {
      ...old,
      amount:
        old.amount +
        (event.kind === "transfer" ? Number(event.data.amount) : 0),
      count: old.count + 1,
    });
  }
  if (!edges.size) return <Empty title="No interactions yet" />;
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <Table aria-label="Directed agent interactions">
        <TableHeader>
          <TableRow>
            <TableHead>From → To</TableHead>
            <TableHead className="text-right">Credits</TableHead>
            <TableHead className="text-right">Interactions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...edges].map(([key, edge]) => {
            const a = profiles.find((p) => p.key === edge.source);
            const b = profiles.find((p) => p.key === edge.target);
            if (!a || !b) return null;
            return (
              <TableRow key={key}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onAgent(a.key)}
                    >
                      {a.name}
                    </Button>
                    <span aria-hidden="true">→</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onAgent(b.key)}
                    >
                      {b.name}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {edge.amount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {edge.count}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
export function RelationshipTable({
  events,
  profiles,
}: {
  events: Event[];
  profiles: Profile[];
}) {
  const claims = events.filter((e) => e.kind === "claim");
  const commitments = events.filter((e) => e.kind === "commitment_resolved");
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>False factual reports</TableHead>
            <TableHead>Promises kept</TableHead>
            <TableHead>Credits transferred</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => {
            const reported = claims.filter((e) => e.actor === profile.key);
            const eligible = commitments.filter(
              (e) => e.actor === profile.key && e.data.eligible !== false,
            );
            return (
              <TableRow key={profile.key}>
                <TableCell>{profile.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {reported.length
                    ? `${reported.filter((e) => e.data.accurate === false).length} / ${reported.length}`
                    : "No reports"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {eligible.length
                    ? `${eligible.filter((e) => e.data.fulfilled).length} / ${eligible.length}`
                    : "No eligible promises"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {events
                    .filter(
                      (e) => e.kind === "transfer" && e.actor === profile.key,
                    )
                    .reduce((sum, e) => sum + Number(e.data.amount), 0)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="p-4 text-xs leading-relaxed text-muted-foreground">
        Counts describe observable actions and opportunities. They do not
        establish deceptive intent, friendship, or private feelings.
      </div>
    </div>
  );
}
