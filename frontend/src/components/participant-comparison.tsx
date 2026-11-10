import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Json } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label, modelLabel, money } from "@/lib/format";
import type { Comparison } from "@/lib/types";

export function ParticipantComparison({
  comparison,
}: {
  comparison: Comparison;
}) {
  return (
    <Disclosure>
      <DisclosureTrigger>
        Participant configuration &amp; effort
      </DisclosureTrigger>
      <DisclosureContent className="flex min-w-0 flex-col gap-4 text-sm">
        <p className="max-w-prose text-muted-foreground">
          {comparison.effort_scope ??
            "Participant effort was not captured in this saved comparison."}
        </p>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Condition",
                  "Inference attempts / requests",
                  "Tool operations / attempts",
                  "Scripted decisions / attempts",
                  "Input / output tokens",
                  "Cost",
                ].map((name) => (
                  <TableHead key={name}>{name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.conditions.map((c) => (
                <TableRow key={c.condition_key}>
                  <TableCell>{c.condition}</TableCell>
                  <TableCell className="tabular-nums">
                    {c.effort
                      ? `${c.effort.inference_attempts} / ${c.effort.usage.requests}`
                      : "Not captured"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.effort
                      ? `${c.effort.tool_operations} / ${c.effort.tool_attempts}`
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.effort
                      ? `${c.effort.scripted_decisions} / ${c.effort.scripted_attempts}`
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.effort
                      ? `${c.effort.usage.input_tokens.toLocaleString()} / ${c.effort.usage.output_tokens.toLocaleString()}${c.effort.usage.partial ? " · partial" : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.effort
                      ? `${money(c.effort.usage.cost_usd)}${c.effort.usage.partial ? " · includes unknown/pending charges" : ""}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {comparison.conditions.map((c) => {
          const participant = c.participant;
          if (!participant || !c.effort) return null;
          return (
            <section
              key={c.condition_key}
              className="flex min-w-0 flex-col gap-2"
            >
              <h3 className="font-medium">{c.condition}</h3>
              <p>
                {participant.kind === "non_model_control"
                  ? "Non-model control"
                  : participant.models.map(modelLabel).join(", ")}{" "}
                · {label(participant.harness.kind)} v
                {participant.harness.version} · memory: {participant.memory}
              </p>
              {participant.harness.kind === "scripted" ? (
                <p>
                  {participant.harness.policy} · actor-authorized input only ·
                  no model inference
                </p>
              ) : (
                <p>
                  Per activation: up to {participant.harness.max_requests}{" "}
                  requests and {participant.harness.max_tool_operations} tool
                  operations. Per request:{" "}
                  {participant.inference?.response_tokens.toLocaleString()}{" "}
                  output tokens including reasoning · reasoning effort:{" "}
                  {participant.inference?.openai_reasoning_effort ??
                    "provider default"}
                  .
                </p>
              )}
              <p>
                {c.effort.captured_runs} / {c.planned} runs captured ·{" "}
                {c.effort.activations} activations ·{" "}
                {c.effort.committed_decisions} committed decisions ·{" "}
                {c.effort.reasoning_tokens.toLocaleString()} reasoning tokens
                (included in output).
              </p>
              <p className="break-words">
                Stops:{" "}
                {Object.entries(c.effort.stop_reasons)
                  .map(([reason, count]) => `${reason}: ${count}`)
                  .join(" · ") || "No activation recorded"}
              </p>
              <Disclosure>
                <DisclosureTrigger>
                  Configuration and recorded sources · {c.condition}
                </DisclosureTrigger>
                <DisclosureContent>
                  <Json value={{ participant, effort: c.effort }} />
                </DisclosureContent>
              </Disclosure>
            </section>
          );
        })}
      </DisclosureContent>
    </Disclosure>
  );
}
