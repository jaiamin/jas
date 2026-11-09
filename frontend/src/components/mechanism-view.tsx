import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Event, RunDetail, State } from "@/lib/types";

export function MechanismView({
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
  const environment = run.design.environment;
  const sealed =
    state.pending === undefined ? undefined : Object.keys(state.pending).length;
  if (environment === "renewable_resource" && sealed === undefined)
    throw new Error("Resource checkpoint is missing sealed requests");
  const names = new Map(run.design.profiles.map((p) => [p.key, p.name]));
  const titles = {
    composed: "Resources & needs",
    institution: "Allocation & authority",
    bargaining: "Negotiation",
    information: "Evidence & decisions",
    renewable_resource: "Shared resource",
  };
  const title = titles[environment as keyof typeof titles];
  const latest = events
    .filter((e) =>
      [
        "resource_transfer",
        "consumption",
        "allocation",
        "sanction",
        "appeal",
        "oversight",
        "offer",
        "agreement",
        "reject",
        "exit",
        "choice",
        "outcome",
        "extraction",
      ].includes(e.kind),
    )
    .slice(-8);
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {environment === "composed" &&
        run.parameters.composition?.resources.map((resource) => (
          <section key={resource.key} className="flex min-w-0 flex-col gap-4">
            <h3 className="text-sm font-medium">{resource.name}</h3>
            <p>
              Shared stock:{" "}
              <strong className="tabular-nums">
                {state.stocks?.[resource.key]?.toFixed(2)}
              </strong>{" "}
              / {resource.capacity}
              {" · "}Stock:{" "}
              {resource.stock_visibility === "public"
                ? "public"
                : "controllers only"}
              {" · "}Allocations: {resource.allocation_visibility}
            </p>
            <p className="text-muted-foreground">
              Researcher view includes private inventories and consumption.
            </p>
            <div className="min-w-0 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-right tabular-nums">
                      Inventory
                    </TableHead>
                    <TableHead className="text-right tabular-nums">
                      Consumed
                    </TableHead>
                    <TableHead className="text-right tabular-nums">
                      Unmet need
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.design.profiles.map((profile) => (
                    <TableRow key={profile.key}>
                      <TableCell>{profile.name}</TableCell>
                      <TableCell>
                        {resource.controllers.includes(profile.key)
                          ? "Allocate"
                          : resource.controllers.length
                            ? "Receive"
                            : "Extract"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {state.inventories?.[resource.key]?.[
                          profile.key
                        ]?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {state.consumed?.[resource.key]?.[profile.key]?.toFixed(
                          2,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {state.unmet?.[resource.key]?.[profile.key]?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ))}
      {environment === "renewable_resource" && (
        <div className="flex flex-col gap-3 py-4 [&>div]:flex [&>div]:justify-between">
          <div>
            <span>Available stock</span>
            <strong className="tabular-nums">
              {state.stock?.toFixed(2)}{" "}
              <small>/ {run.parameters.resource.capacity}</small>
            </strong>
          </div>
          <Progress
            aria-label="Available resource stock"
            value={
              ((state.stock ?? 0) / run.parameters.resource.capacity) * 100
            }
            aria-valuetext={`${state.stock ?? 0} of ${run.parameters.resource.capacity}`}
          />
          <span>
            {state.done && (state.stock ?? 0) <= 1e-9
              ? "Collapsed"
              : `${sealed} of ${run.design.profiles.length} requests sealed`}
          </span>
        </div>
      )}
      {environment === "bargaining" && (
        <div className="flex flex-wrap items-center gap-3 py-4 text-sm text-muted-foreground [&>svg]:size-4">
          {state.offer ? (
            <>
              <span>Latest offer to responder</span>
              <strong>
                {state.offer.amount} / {state.offer.pie}
              </strong>
              <span>Proposed by {names.get(state.offer.actor)}</span>
            </>
          ) : (
            <span>Waiting for the first offer</span>
          )}
        </div>
      )}
      <div className="min-w-0 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>
                {environment === "institution" ? "Permission" : "Latest action"}
              </TableHead>
              <TableHead className="text-right tabular-nums">Payoff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.design.profiles.map((profile) => {
              const last = events.findLast(
                (e) =>
                  e.actor === profile.key &&
                  ![
                    "message",
                    "claim",
                    "decision_sealed",
                    "adjudication",
                  ].includes(e.kind),
              );
              return (
                <TableRow key={profile.key}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAgent(profile.key)}
                    >
                      {profile.name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {environment === "institution"
                      ? run.parameters.institution.authorities.includes(
                          profile.key,
                        )
                        ? "Allocate · sanction"
                        : run.parameters.institution.appeal
                          ? "Work · wait · appeal"
                          : "Work · wait"
                      : (last?.kind.replaceAll("_", " ") ?? "—")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {state.balances[profile.key]?.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {latest.length > 0 && (
        <div className="min-w-0 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latest.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-right tabular-nums">
                    {event.round}
                  </TableCell>
                  <TableCell>
                    {event.actor ? names.get(event.actor) : "Environment"}
                  </TableCell>
                  <TableCell>{event.text}</TableCell>
                  <TableCell>{event.visibility}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
