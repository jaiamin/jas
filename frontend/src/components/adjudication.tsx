import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Json } from "@/components/shared";
import { money } from "@/lib/format";
import type {
  AdjudicationDeclaration,
  Design,
  RecordedAdjudication,
  RequestSummary,
} from "@/lib/types";

export function AdjudicationReview({
  declaration,
  design,
}: {
  declaration: AdjudicationDeclaration;
  design?: Design;
}) {
  const { adjudicator, scope, price_per_million_usd: price } = declaration;
  const condition = design?.conditions.find(
    (c) => c.key === declaration.condition_key,
  );
  const participantModels =
    condition && design
      ? [
          ...new Set(
            design.profiles.map(
              (profile) =>
                condition.profile_overrides.find((p) => p.key === profile.key)
                  ?.model ??
                profile.model ??
                condition.model,
            ),
          ),
        ]
      : [];
  return (
    <section
      aria-label="Fallible adjudication"
      className="flex min-w-0 flex-col gap-2 break-words text-sm"
    >
      <h3 className="font-medium">
        Fallible adjudication · {condition?.name ?? declaration.condition_key}
      </h3>
      <p>
        Adjudicator {adjudicator.model} · configuration v{adjudicator.version} ·{" "}
        {adjudicator.openai_reasoning_effort} reasoning ·{" "}
        {adjudicator.response_tokens} response tokens
      </p>
      {participantModels.length > 0 && (
        <p>Participant: {participantModels.join(", ")}</p>
      )}
      <p>
        {scope.mechanism} · rubric v{scope.version} · {scope.artifact}.
        {scope.field}
      </p>
      <p>
        Allowed inputs: selected work fields and immutable evidence{" "}
        {scope.evidence
          .map(
            (item) =>
              `${item.artifact} v${item.version}: ${item.fields.join(", ")}`,
          )
          .join("; ")}
        .
      </p>
      <p>
        ${price.input.toFixed(2)} / million input tokens · $
        {price.output.toFixed(2)} / million output tokens · at most{" "}
        {declaration.max_requests_per_submission_attempt} separately billed
        judge request per submission attempt.
      </p>
      <p>
        Only submission status can change. Hard-fact and access checks remain
        enforced. No private facts, invented responses or beliefs are allowed
        inputs or consequences.
      </p>
      <p>
        This is a fallible rubric ruling, not semantic truth or measured
        competence. Live judgment accuracy is unverified.
      </p>
      <Disclosure>
        <DisclosureTrigger>Adjudication rubric and limits</DisclosureTrigger>
        <DisclosureContent className="whitespace-pre-wrap">
          <p>{declaration.rubric}</p>
          <p>{declaration.limits}</p>
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}

export function AdjudicationEvidence({
  record,
  request,
}: {
  record: RecordedAdjudication;
  request?: RequestSummary;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 break-words text-sm">
      <section
        aria-label="Recorded fallible judgment"
        className="flex min-w-0 flex-col gap-2"
      >
        <h3 className="font-medium">Recorded fallible judgment</h3>
        <p>
          {record.ruling.verdict} · {record.mechanism} v{record.version}
        </p>
        <p className="whitespace-pre-wrap">{record.ruling.explanation}</p>
        <p className="text-muted-foreground">
          Raw adjudicator interpretation; it cannot establish availability,
          participant responses or private beliefs.
        </p>
        <p>
          {record.adjudicator.model} · configuration v
          {record.adjudicator.version} ·{" "}
          {record.adjudicator.openai_reasoning_effort} ·{" "}
          {record.adjudicator.response_tokens} tokens
        </p>
        <p className="break-all">Request {record.request_id}</p>
        {request ? (
          <p>
            {request.input_tokens} input / {request.output_tokens} output tokens
            · {money(request.cost_usd)} · {request.status}
            {["pending", "unknown"].includes(request.status) &&
              " · includes reservation"}
          </p>
        ) : (
          <p>Request usage is unavailable in this record.</p>
        )}
        <Disclosure>
          <DisclosureTrigger>
            Recorded judgment inputs and asserted facts
          </DisclosureTrigger>
          <DisclosureContent>
            <Json
              value={{ inputs: record.inputs, facts: record.ruling.facts }}
            />
          </DisclosureContent>
        </Disclosure>
      </section>
      <section
        aria-label="Enforced consequence"
        className="flex flex-col gap-2"
      >
        <h3 className="font-medium">Enforced consequence</h3>
        <p>
          {record.consequence.applied
            ? `Submission status: ${record.consequence.submission_status}.`
            : "No submission consequence was applied."}
        </p>
        <p>
          Hard facts:{" "}
          {record.consequence.hard_facts_passed ? "passed" : "not passed"}.
          World checks enforce the permitted submission result.
        </p>
        <p className="text-muted-foreground">
          This records the submission result only. It does not validate the
          explanation or establish semantic truth.
        </p>
      </section>
    </div>
  );
}
