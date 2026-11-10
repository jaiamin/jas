import { Link } from "react-router-dom";
import { ArtifactView } from "@/components/artifact-view";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { CoordinationAssumptions } from "@/components/distributed-fields";
import { Json } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Event, RunDetail, State } from "@/lib/types";

export function CoordinationView({
  run,
  state,
  events,
}: {
  run: RunDetail;
  state: State;
  events: Event[];
}) {
  const rules = run.parameters.coordination;
  if (!rules) throw new Error("Coordination rules are missing");
  const outcome =
    state.outcome && "payoffs" in state.outcome ? state.outcome : null;
  const names = new Map(run.design.profiles.map((p) => [p.key, p.name]));
  const messages = [
    ...Object.values(state.inboxes ?? {}).flat(),
    ...(state.pending_deliveries ?? []),
  ];
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Coordination trajectory</h2>
        <p className="text-sm text-muted-foreground">
          Researcher view includes private work and mail. Participant tools
          expose only authorized content. Logical time {state.logical_time ?? 0}
          ; {Object.keys(state.pending_actions ?? {}).length} committed
          proposals in the current phase.
        </p>
        {outcome && (
          <p className="text-sm font-medium">
            {outcome.matched
              ? "All three chose the same alternative"
              : "Choices differ or include abstention"}
          </p>
        )}
      </div>
      <section aria-label="Coordination choices" className="min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Settled choice</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.design.profiles.map((p) => (
              <TableRow key={p.key}>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  {outcome
                    ? (outcome.choices[p.key] ?? "Abstained / unchosen")
                    : state.choices && Object.hasOwn(state.choices, p.key)
                      ? (state.choices[p.key] ?? "Abstained")
                      : "Pending"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {outcome?.payoffs[p.key] ?? "Pending"}
                </TableCell>
              </TableRow>
            ))}
            {outcome && (
              <TableRow>
                <TableCell colSpan={2}>Total declared value</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Object.values(outcome.payoffs).reduce((a, b) => a + b, 0)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
      <Disclosure>
        <DisclosureTrigger>
          Timing, topology and directory assumptions
        </DisclosureTrigger>
        <DisclosureContent className="pt-3">
          <CoordinationAssumptions rules={rules} />
        </DisclosureContent>
      </Disclosure>
      <section
        className="flex min-w-0 flex-col gap-2"
        aria-label="Addressed delivery history"
      >
        <h3 className="text-sm font-medium">Addressed messages</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No addressed messages recorded.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Logical time</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    {names.get(message.sender)} → {names.get(message.recipient)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    Sent {message.sent_at} · due {message.due_at} ·{" "}
                    {message.delivered_at === null
                      ? "pending"
                      : `delivered ${message.delivered_at}`}
                  </TableCell>
                  <TableCell className="max-w-80 whitespace-pre-wrap break-words">
                    {message.text}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
      <Disclosure>
        <DisclosureTrigger>Settlements and conflicts</DisclosureTrigger>
        <DisclosureContent className="flex flex-col gap-3 pt-3">
          {events
            .filter((e) =>
              [
                "artifact_conflict",
                "message_queued",
                "message_delivered",
                "alternative_chosen",
              ].includes(e.kind),
            )
            .map((e) => (
              <div key={e.id} className="flex flex-col gap-1 text-sm">
                <Link
                  className="underline underline-offset-4"
                  to={`/runs/${run.summary.id}?tab=decisions&turn=${e.turn}`}
                >
                  Turn {e.turn} · {e.kind} ·{" "}
                  {e.actor ? names.get(e.actor) : "World"}
                </Link>
                <Json value={e.data} />
              </div>
            ))}
        </DisclosureContent>
      </Disclosure>
      <ArtifactView run={run} state={state} />
    </section>
  );
}
