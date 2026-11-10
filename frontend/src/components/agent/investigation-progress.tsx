import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { ErrorState, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { label } from "@/lib/format";
import type { InvestigationRecord } from "@/lib/types";

const terminal = new Set(["complete", "stopped", "failed", "cancelled"]);

export function InvestigationProgress({ id }: { id: string }) {
  return <InvestigationBody key={id} id={id} />;
}

function InvestigationBody({ id }: { id: string }) {
  const path = `/investigations/${id}`;
  const client = useQueryClient();
  const draftKey = `jas:investigation-adaptation:${id}`;
  const inputId = useId();
  const submitting = useRef(false);
  const [instruction, setInstruction] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const [draftUnavailable, setDraftUnavailable] = useState(false);
  useEffect(() => {
    try {
      if (instruction) sessionStorage.setItem(draftKey, instruction);
      else sessionStorage.removeItem(draftKey);
    } catch {
      setDraftUnavailable(true);
    }
  }, [draftKey, instruction]);
  const investigation = useQuery({
    queryKey: [path],
    queryFn: () => api<InvestigationRecord>(path),
    refetchInterval: (query) =>
      query.state.data && terminal.has(query.state.data.status) ? false : 1000,
  });
  const control = useMutation({
    mutationFn: (action: "pause" | "resume" | "cancel") =>
      api<InvestigationRecord>(`${path}/control`, { action }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [path] });
      client.invalidateQueries({ queryKey: ["/chats"] });
      client.invalidateQueries({ queryKey: ["/studies"] });
      client.invalidateQueries({ queryKey: ["/runs"] });
    },
  });
  const adapt = useMutation({
    mutationFn: (submitted: string) =>
      api<{ id: string; chat_id: string }>(`${path}/adapt`, {
        instruction: submitted,
      }),
    onSettled: () => {
      submitting.current = false;
    },
    onSuccess: (identity, submitted) => {
      setInstruction((current) => (current === submitted ? "" : current));
      try {
        if (sessionStorage.getItem(draftKey) === submitted)
          sessionStorage.removeItem(draftKey);
      } catch {
        setDraftUnavailable(true);
      }
      client.invalidateQueries({ queryKey: [path] });
      client.invalidateQueries({ queryKey: [`/chats/${identity.chat_id}`] });
      client.invalidateQueries({ queryKey: ["/chats"] });
    },
  });
  if (investigation.error)
    return (
      <ErrorState error={investigation.error} onRetry={investigation.refetch} />
    );
  const row = investigation.data;
  if (!row)
    return (
      <div role="status" aria-label="Loading investigation">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  const scope = row.authorization;
  return (
    <section
      aria-label="Investigation progress"
      className="flex min-w-0 flex-col gap-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <Status value={row.status} />
        <span>{label(row.stage)}</span>
        {row.stop_reason && (
          <span className="break-words text-muted-foreground">
            {label(row.stop_reason)}
          </span>
        )}
      </div>
      <p className="text-sm tabular-nums">
        ${row.charged_usd.toFixed(6)} of ${scope.budget_usd} · {row.requests}/
        {scope.max_requests} requests · {row.runs}/{scope.max_runs} runs ·{" "}
        {row.turns}/{scope.max_turns} turns
      </p>
      {row.usage.partial && (
        <p className="text-xs text-muted-foreground">
          Pending or unknown usage retains its reservation. In-flight work may
          still settle.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {row.status === "running" && (
          <Button
            size="sm"
            variant="outline"
            disabled={control.isPending}
            onClick={() => control.mutate("pause")}
          >
            Pause investigation
          </Button>
        )}
        {row.status === "paused" && (
          <Button
            size="sm"
            variant="outline"
            disabled={control.isPending}
            onClick={() => control.mutate("resume")}
          >
            Resume investigation
          </Button>
        )}
        {!terminal.has(row.status) && (
          <Button
            size="sm"
            variant="outline"
            disabled={control.isPending || row.status === "cancelling"}
            onClick={() => control.mutate("cancel")}
          >
            Cancel investigation
          </Button>
        )}
        {row.attempts.some((attempt) => attempt.revision !== null) && (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/studies/${row.study_id}`}>Inspect experiment</Link>
          </Button>
        )}
      </div>
      {control.error && (
        <Alert variant="error">
          {control.error.message} Progress will refresh; no work was
          resubmitted.
        </Alert>
      )}
      {row.clarification && (
        <Alert title="Clarification required">{row.clarification}</Alert>
      )}
      {(row.status === "stopped" || row.status === "failed") &&
        scope.intent === "exploratory" &&
        !row.confirmation && (
          <form
            aria-label="Adapt investigation"
            onSubmit={(event) => {
              event.preventDefault();
              if (!instruction.trim() || adapt.isPending || submitting.current)
                return;
              submitting.current = true;
              adapt.mutate(instruction);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={inputId}>
                  Adaptation instruction
                </FieldLabel>
                <Textarea
                  id={inputId}
                  value={instruction}
                  maxLength={2000}
                  required
                  disabled={adapt.isPending}
                  onChange={(event) => setInstruction(event.target.value)}
                />
                <FieldDescription>
                  Retain prior attempts and design a new revision within the
                  original scope and remaining allowances. Changed scope or
                  exhausted allowance requires a new investigation.
                </FieldDescription>
              </Field>
              {adapt.error && (
                <Alert variant="error">
                  {adapt.error.message} Your adaptation draft is kept.
                </Alert>
              )}
              {draftUnavailable && (
                <Alert>This browser could not keep the adaptation draft.</Alert>
              )}
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={adapt.isPending || !instruction.trim()}
              >
                Adapt within remaining allowance
              </Button>
            </FieldGroup>
          </form>
        )}
      <Disclosure>
        <DisclosureTrigger>
          Authorized scope & stopping decisions
        </DisclosureTrigger>
        <DisclosureContent>
          <div className="flex flex-col gap-2">
            <p>{scope.question}</p>
            <p>
              {scope.environments.join(", ")} ·{" "}
              {scope.harnesses.map(label).join(", ")} · {scope.intent}
            </p>
            <p>
              Researcher {scope.researcher_model}; participants{" "}
              {scope.participant_model}.
            </p>
            <p>
              At most {scope.max_agents} participants, {scope.max_rounds} rounds
              per run, {scope.max_operations} research operations and{" "}
              {scope.max_design_attempts} protocol revisions. Study ceiling $
              {row.study_budget_usd}; workspace ceiling also applies.
            </p>
            <p>
              {scope.pilot
                ? "Exploratory pilot authorized."
                : "No pilot authorized."}{" "}
              {scope.adapt_after_pilot
                ? "Checked adaptation after pilot authorized."
                : "Checked protocol retained after any pilot."}{" "}
              Material ambiguity, changed scope, allowance exhaustion or failure
              stops work.
            </p>
            {row.decisions.map((decision) => (
              <p key={`${decision.at}-${decision.decision}`}>
                <time dateTime={decision.at}>
                  {new Date(decision.at).toLocaleTimeString()}
                </time>{" "}
                · {label(decision.decision)}
                {decision.reason && ` · ${label(decision.reason)}`}
              </p>
            ))}
          </div>
        </DisclosureContent>
      </Disclosure>
      {row.confirmation && (
        <p>
          Confirmation frozen before trials · revision{" "}
          {row.confirmation.revision}.{" "}
          <span className="text-muted-foreground">
            Later changes require a separate investigation.
          </span>
        </p>
      )}
      {row.attempts.map((attempt) => (
        <Disclosure key={`${attempt.design_id}-${attempt.kind}`}>
          <DisclosureTrigger>
            {label(attempt.kind)} ·{" "}
            {attempt.revision
              ? `revision ${attempt.revision}`
              : "design attempt"}{" "}
            · {label(attempt.status)}
          </DisclosureTrigger>
          <DisclosureContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/agent?chat=${attempt.chat_id}`}>
                  Inspect design attempt
                </Link>
              </Button>
              {attempt.run_ids.map((runId) => (
                <Button key={runId} variant="outline" size="sm" asChild>
                  <Link to={`/runs/${runId}`}>Run {runId.slice(0, 6)}</Link>
                </Button>
              ))}
            </div>
          </DisclosureContent>
        </Disclosure>
      ))}
      {row.analysis && (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/agent?chat=${row.analysis.chat_id}`}>
            Inspect latest retained interpretation
          </Link>
        </Button>
      )}
      <Disclosure>
        <DisclosureTrigger>Requests & charges</DisclosureTrigger>
        <DisclosureContent>
          <ul className="flex flex-col gap-2">
            {row.ledger.map((call) => (
              <li key={call.id} className="break-words tabular-nums">
                {label(call.purpose)} · {call.model} · {call.status} · $
                {(call.charged / 1_000_000).toFixed(6)}
                {call.error && ` · ${call.error}`}
              </li>
            ))}
          </ul>
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}
