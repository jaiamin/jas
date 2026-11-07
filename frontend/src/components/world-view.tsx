import { ArrowRight, Check, Circle, Clock3 } from "lucide-react";
import { MechanismView } from "@/components/mechanism-view";
import { Button } from "@/components/ui/button";
import { Empty, Table } from "@/components/ui/data";
import type { Event, Profile, RunDetail, State } from "@/lib/types";

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
  if (run.design.environment === "coordination")
    return (
      <section className="task-board">
        <div className="section-heading">
          <div>
            <h2>Shared project</h2>
            <p>
              {state.tasks.filter((t) => t.completed_by).length} of{" "}
              {state.tasks.length} work packages complete
            </p>
          </div>
        </div>
        <div className="task-grid">
          {state.tasks.map((task) => (
            <div
              className="task-node"
              data-complete={!!task.completed_by}
              key={task.key}
            >
              <div className="task-node-title">
                {task.completed_by ? <Check /> : <Circle />}
                <h3>{task.name}</h3>
                <span>
                  {task.progress}/{task.effort}
                </span>
              </div>
              <div
                className="task-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={task.effort}
                aria-valuenow={task.progress}
                aria-label={`${task.name} ${task.progress} of ${task.effort}`}
              >
                <span
                  style={{ width: `${(task.progress / task.effort) * 100}%` }}
                />
              </div>
              <div className="task-node-detail">
                {task.dependencies.length ? (
                  <span>After {task.dependencies.join(", ")}</span>
                ) : (
                  <span>No prerequisites</span>
                )}
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
            </div>
          ))}
        </div>
      </section>
    );
  if (run.design.environment === "trust_exchange")
    return (
      <section>
        <div className="section-heading">
          <div>
            <h2>Exchange network</h2>
            <p>
              Directed transfers between participants. Edge weight reflects
              credits sent.
            </p>
          </div>
        </div>
        <RelationshipGraph
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
  const previous = state.history.findLast((item) => "contributions" in item);
  const contributions = previous?.contributions as
    | Record<string, number>
    | undefined;
  return (
    <section className="commons-panel">
      <div className="section-heading">
        <div>
          <h2>The shared pool</h2>
          <p>
            {previous
              ? `Contributions from settled round ${previous.round}`
              : "Contributions appear after the first round settles."}
          </p>
        </div>
        <span className="settlement-note">
          <Clock3 />
          {Object.keys(state.pending).length} / {profiles.length} choices sealed
        </span>
      </div>
      <div className="commons-agents">
        {profiles.map((profile, i) => (
          <div className="commons-agent" key={profile.key}>
            <Button
              variant="ghost"
              type="button"
              className="agent-name h-auto p-0"
              onClick={() => onAgent(profile.key)}
            >
              <span className="profile-avatar" data-series={i % 6}>
                {profile.name.slice(0, 1)}
              </span>
              <span>
                {profile.name}
                <small>{profile.role}</small>
              </span>
            </Button>
            <div className="contribution-track">
              <span
                data-series={i % 6}
                style={{
                  width: `${contributions ? ((contributions[profile.key] ?? 0) / run.parameters.endowment) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="numeric contribution-value">
              {contributions
                ? `${contributions[profile.key]} / ${run.parameters.endowment}`
                : "—"}
            </span>
            <span className="balance-value numeric">
              {state.balances[profile.key]?.toFixed(1)}
              <small>total payoff</small>
            </span>
          </div>
        ))}
      </div>
      <div className="pool-summary">
        <span>Total contribution</span>
        <strong>
          {contributions
            ? Object.values(contributions).reduce((a, b) => a + b, 0)
            : "—"}
        </strong>
        <ArrowRight />
        <span>× {run.parameters.multiplier}</span>
        <ArrowRight />
        <span>Shared equally across {profiles.length} agents</span>
      </div>
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
    <div className="balance-strip">
      {profiles.map((profile, index) => (
        <div key={profile.key}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAgent(profile.key)}
          >
            <span className="agent-dot" data-series={index % 6} />
            {profile.name}
          </Button>
          <span className="numeric">
            {state.balances[profile.key]?.toFixed(1)} credits
          </span>
        </div>
      ))}
    </div>
  );
}
export function RelationshipGraph({
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
  const points = profiles.map((p, i) => ({
    ...p,
    x: 280 + Math.cos((i / profiles.length) * Math.PI * 2 - Math.PI / 2) * 150,
    y: 190 + Math.sin((i / profiles.length) * Math.PI * 2 - Math.PI / 2) * 145,
  }));
  if (!edges.size) return <Empty title="No interactions yet" />;
  return (
    <div className="relationship-graph">
      <svg
        viewBox="0 0 560 380"
        role="img"
        aria-label="Directed agent interaction network"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="18"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" />
          </marker>
        </defs>
        {[...edges].map(([key, edge]) => {
          const a = points.find((p) => p.key === edge.source);
          const b = points.find((p) => p.key === edge.target);
          if (!a || !b) return null;
          return (
            <g key={key}>
              <path
                d={`M${a.x},${a.y} Q280,190 ${b.x},${b.y}`}
                fill="none"
                stroke="var(--chart-1)"
                strokeOpacity={0.45}
                strokeWidth={Math.min(5, 1 + Math.log1p(edge.amount) / 2)}
                markerEnd="url(#arrowhead)"
              />
              <title>
                {a.name} → {b.name}: {edge.amount} credits, {edge.count}{" "}
                interactions
              </title>
            </g>
          );
        })}
        {points.map((p, i) => (
          <g key={p.key}>
            <circle
              cx={p.x}
              cy={p.y}
              r="22"
              fill={`var(--series-${i % 6}-background)`}
              stroke={`var(--chart-${(i % 6) + 1})`}
              strokeWidth="1"
            />
            <text
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="14"
            >
              {p.name.slice(0, 1)}
            </text>
            <text
              x={p.x}
              y={p.y + 41}
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="13"
            >
              {p.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="network-agent-links">
        {profiles.map((p) => (
          <Button
            key={p.key}
            variant="ghost"
            size="sm"
            onClick={() => onAgent(p.key)}
          >
            {p.name}
          </Button>
        ))}
      </div>
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
    <div className="table-frame">
      <Table className="table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>False factual reports</th>
            <th>Promises kept</th>
            <th>Credits transferred</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => {
            const reported = claims.filter((e) => e.actor === profile.key);
            const eligible = commitments.filter(
              (e) => e.actor === profile.key && e.data.eligible !== false,
            );
            return (
              <tr key={profile.key}>
                <td>{profile.name}</td>
                <td className="numeric">
                  {reported.length
                    ? `${reported.filter((e) => e.data.accurate === false).length} / ${reported.length}`
                    : "No reports"}
                </td>
                <td className="numeric">
                  {eligible.length
                    ? `${eligible.filter((e) => e.data.fulfilled).length} / ${eligible.length}`
                    : "No eligible promises"}
                </td>
                <td className="numeric">
                  {events
                    .filter(
                      (e) => e.kind === "transfer" && e.actor === profile.key,
                    )
                    .reduce((sum, e) => sum + Number(e.data.amount), 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="table-note">
        Counts describe observable actions and opportunities. They do not
        establish deceptive intent, friendship, or private feelings.
      </div>
    </div>
  );
}
