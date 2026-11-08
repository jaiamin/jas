import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/data";
import { Progress } from "@/components/ui/progress";
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
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {environment === "composed" &&
        run.parameters.composition?.resources.map((resource) => (
          <section key={resource.key} className="composition-resource">
            <h3>{resource.name}</h3>
            <p>
              Shared stock:{" "}
              <strong className="numeric">
                {state.stocks?.[resource.key]?.toFixed(2)}
              </strong>{" "}
              / {resource.capacity}
              {" · "}Stock:{" "}
              {resource.stock_visibility === "public"
                ? "public"
                : "controllers only"}
              {" · "}Allocations: {resource.allocation_visibility}
            </p>
            <p className="muted">
              Researcher view includes private inventories and consumption.
            </p>
            <div className="table-frame">
              <Table className="table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Permission</th>
                    <th className="numeric">Inventory</th>
                    <th className="numeric">Consumed</th>
                    <th className="numeric">Unmet need</th>
                  </tr>
                </thead>
                <tbody>
                  {run.design.profiles.map((profile) => (
                    <tr key={profile.key}>
                      <td>{profile.name}</td>
                      <td>
                        {resource.controllers.includes(profile.key)
                          ? "Allocate"
                          : resource.controllers.length
                            ? "Receive"
                            : "Extract"}
                      </td>
                      <td className="numeric">
                        {state.inventories?.[resource.key]?.[
                          profile.key
                        ]?.toFixed(2)}
                      </td>
                      <td className="numeric">
                        {state.consumed?.[resource.key]?.[profile.key]?.toFixed(
                          2,
                        )}
                      </td>
                      <td className="numeric">
                        {state.unmet?.[resource.key]?.[profile.key]?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </section>
        ))}
      {environment === "renewable_resource" && (
        <div className="resource-state">
          <div>
            <span>Available stock</span>
            <strong className="numeric">
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
        <div className="pool-summary">
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
      <div className="table-frame">
        <Table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>
                {environment === "institution" ? "Permission" : "Latest action"}
              </th>
              <th className="numeric">Payoff</th>
            </tr>
          </thead>
          <tbody>
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
                <tr key={profile.key}>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAgent(profile.key)}
                    >
                      {profile.name}
                    </Button>
                  </td>
                  <td>
                    {environment === "institution"
                      ? run.parameters.institution.authorities.includes(
                          profile.key,
                        )
                        ? "Allocate · sanction"
                        : run.parameters.institution.appeal
                          ? "Work · wait · appeal"
                          : "Work · wait"
                      : (last?.kind.replaceAll("_", " ") ?? "—")}
                  </td>
                  <td className="numeric">
                    {state.balances[profile.key]?.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      {latest.length > 0 && (
        <div className="table-frame">
          <Table className="table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Agent</th>
                <th>Event</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((event) => (
                <tr key={event.id}>
                  <td className="numeric">{event.round}</td>
                  <td>
                    {event.actor ? names.get(event.actor) : "Environment"}
                  </td>
                  <td>{event.text}</td>
                  <td>{event.visibility}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
}
