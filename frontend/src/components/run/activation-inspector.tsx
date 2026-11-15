import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert, Empty } from "@/components/feedback";
import { Json, Status } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label } from "@/lib/format";
import type { ParticipantActivation } from "@/lib/types";

export function ActivationInspector({
  activations,
}: {
  activations: ParticipantActivation[];
}) {
  return (
    <section className="mt-8 flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Participant activations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Includes unfinished and failed attempts, even when no turn committed.
        </p>
      </div>
      {!activations.length && <Empty title="No participant activations" />}
      {activations.map((activation, index) => (
        <div key={activation.id} className="min-w-0 border-b pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span>
              Turn {activation.turn} · {activation.actor} ·{" "}
              {label(activation.identity.harness.kind)}
            </span>
            <Status value={activation.status} />
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {activation.stop_reason ?? "In progress"}
          </p>
          {activation.error && (
            <Alert variant="error" title="Activation stopped">
              {activation.error}
            </Alert>
          )}
          <Disclosure className="mt-2 min-w-0">
            <DisclosureTrigger>
              Activation {index + 1} · {activation.id.slice(0, 8)}
            </DisclosureTrigger>
            <DisclosureContent className="flex min-w-0 flex-col gap-4 pt-3">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Model</dt>
                  <dd className="break-all">
                    {activation.identity.model ?? "Non-model control"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Effort</dt>
                  <dd>
                    {activation.requests} /{" "}
                    {activation.identity.harness.max_requests} inference
                    attempts
                  </dd>
                </div>
              </dl>
              {activation.identity.harness.kind === "scripted" && (
                <p className="text-sm text-muted-foreground">
                  {activation.identity.harness.policy} · actor observation and
                  legal schema only. No provider requests.
                </p>
              )}
              {activation.identity.harness.kind === "tool_using" && (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(activation.identity.harness.capabilities).map(
                    ([name, policy]) => (
                      <div key={name}>
                        <dt className="text-muted-foreground">{label(name)}</dt>
                        <dd className="break-words">
                          {policy === "disabled" ? "Disabled" : policy}
                        </dd>
                      </div>
                    ),
                  )}
                  <div>
                    <dt className="text-muted-foreground">Context limit</dt>
                    <dd>
                      {activation.identity.harness.max_context_chars} characters
                    </dd>
                  </div>
                </dl>
              )}
              <p className="text-sm text-muted-foreground">
                Plans and notes are participant self-reports. Source checks
                confirm accessible text; action checks use legal options and do
                not predict outcomes. Each result retains its source and cutoff
                in the operation receipt.
              </p>
              <Disclosure className="min-w-0">
                <DisclosureTrigger>
                  Model, harness and inference identity
                </DisclosureTrigger>
                <DisclosureContent>
                  <Json value={activation.identity} />
                </DisclosureContent>
              </Disclosure>
              <div className="min-w-0 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activation.operations.map((operation) => (
                      <TableRow key={operation.number}>
                        <TableCell>{operation.kind}</TableCell>
                        <TableCell>{operation.status}</TableCell>
                        <TableCell>
                          <Disclosure className="min-w-0">
                            <DisclosureTrigger>
                              Result of operation {operation.number}
                            </DisclosureTrigger>
                            <DisclosureContent>
                              <Json
                                value={{
                                  request: operation.request,
                                  result: operation.result,
                                }}
                              />
                            </DisclosureContent>
                          </Disclosure>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DisclosureContent>
          </Disclosure>
        </div>
      ))}
    </section>
  );
}
