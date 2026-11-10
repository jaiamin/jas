import type { ReactNode } from "react";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { CoordinationAssumptions } from "@/components/distributed-fields";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { label, modelLabel, money } from "@/lib/format";
import type { Catalog, Design } from "@/lib/types";

function ReviewSection({
  title,
  section,
  onEdit,
  children,
}: {
  title: string;
  section: string;
  onEdit: (section: string) => void;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(section)}
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

export function ExperimentReview({
  design,
  catalog,
  onEdit,
}: {
  design: Design;
  catalog: Catalog;
  onEdit: (section: string) => void;
}) {
  const environment = catalog.environments.find(
    (item) => item.key === design.environment,
  );
  const runCount =
    design.conditions.length * design.seeds.length * design.repetitions;
  return (
    <section
      aria-label="Experiment review"
      className="flex min-w-0 flex-col gap-5 text-sm"
    >
      <ReviewSection
        title="Question and environment"
        section="question"
        onEdit={onEdit}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-medium break-words">
            {design.title || "Untitled experiment"}
          </h2>
          <p className="leading-relaxed break-words">{design.question}</p>
          <p className="text-muted-foreground">{environment?.name}</p>
          {design.environment_source && (
            <section
              aria-label="Environment source"
              className="flex flex-col gap-1 text-muted-foreground"
            >
              <p>
                {design.environment_source.definition.name} · Revision{" "}
                {design.environment_source.revision} · Rules{" "}
                {design.environment_source.definition.rule_version}
              </p>
              <p>
                Based on a pinned mechanics example. This experiment keeps its
                own configured rules.
              </p>
              {design.environment_source.definition.extension && (
                <details className="text-sm">
                  <summary>Admitted extension and independent checks</summary>
                  <p className="mt-3 break-all">
                    Package v
                    {design.environment_source.definition.extension.version} ·
                    SHA-256{" "}
                    {design.environment_source.definition.extension.sha256}
                  </p>
                  <p className="mt-3">
                    {design.environment_source.definition.extension.capabilities.join(
                      " · ",
                    )}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {design.environment_source.definition.extension.checks.map(
                      (check) => (
                        <li key={check.stage}>{check.detail}</li>
                      ),
                    )}
                  </ul>
                </details>
              )}
            </section>
          )}
          {(design.hypothesis || design.context) && (
            <Disclosure>
              <DisclosureTrigger>Analysis plan and context</DisclosureTrigger>
              <DisclosureContent className="flex flex-col gap-3 pt-3 text-muted-foreground whitespace-pre-wrap break-words">
                {design.hypothesis && <p>{design.hypothesis}</p>}
                {design.context && <p>{design.context}</p>}
              </DisclosureContent>
            </Disclosure>
          )}
        </div>
      </ReviewSection>
      <Separator />
      <ReviewSection title="Agents" section="agents" onEdit={onEdit}>
        <p className="leading-relaxed break-words">
          {design.profiles.map((profile) => profile.name).join(", ")}
        </p>
        <p className="text-muted-foreground">
          {design.profiles.length} agents per run
        </p>
      </ReviewSection>
      <Separator />
      <ReviewSection title="Conditions" section="conditions" onEdit={onEdit}>
        <dl className="flex flex-col gap-3">
          {design.conditions.map((condition) => (
            <div
              key={condition.key}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
            >
              <dt className="min-w-0 break-words">{condition.name}</dt>
              <dd className="text-muted-foreground">
                {condition.harness.kind === "scripted"
                  ? "Non-model control"
                  : modelLabel(condition.model)}
                <span className="block">
                  {condition.harness.kind === "direct_action"
                    ? "Direct action"
                    : condition.harness.kind === "scripted"
                      ? "Scripted control"
                      : "Tool using"}{" "}
                  · v{condition.harness.version}
                </span>
                {condition.harness.kind === "scripted" && (
                  <span className="block">
                    {condition.harness.policy} · actor-authorized input only
                  </span>
                )}
                <span className="block">
                  Memory: {condition.parameters.memory}
                </span>
                <span className="block">
                  {condition.harness.max_requests} requests ·{" "}
                  {condition.harness.max_tool_operations} operations per
                  activation
                </span>
                {condition.harness.tools.length > 0 && (
                  <span className="block">
                    {condition.harness.tools.join(", ")}
                  </span>
                )}
                {condition.parameters.relay && (
                  <p className="text-sm text-muted-foreground">
                    Sealed relay · Submitter{" "}
                    {condition.parameters.relay.submitter} · Reviewer{" "}
                    {condition.parameters.relay.reviewer} · Three action credits
                  </p>
                )}
                {condition.parameters.artifacts && (
                  <div className="mt-2 flex flex-col gap-1">
                    <span>
                      {condition.parameters.artifacts.write_limit} writes
                    </span>
                    {condition.parameters.artifacts.objects.map((obj) => (
                      <span key={obj.key}>
                        {obj.name} ({obj.key}) · owner: {obj.owner ?? "none"} ·
                        readers: {obj.readers.join(", ") || "none"} · writers:{" "}
                        {obj.writers.join(", ") || "none"}
                      </span>
                    ))}
                    {condition.parameters.artifacts.requirements.map((r) => (
                      <span key={`${r.artifact}-${r.field}`}>
                        {r.artifact}.{r.field} must match {r.source}.
                        {r.source_field} at v1, with a source reference.
                      </span>
                    ))}
                  </div>
                )}
                {condition.parameters.coordination && (
                  <CoordinationAssumptions
                    rules={condition.parameters.coordination}
                  />
                )}
                {condition.harness.kind === "tool_using" && (
                  <>
                    {Object.entries(condition.harness.capabilities).map(
                      ([name, policy]) => (
                        <span className="block" key={name}>
                          {name}: {policy === "disabled" ? "Disabled" : policy}
                        </span>
                      ),
                    )}
                    <span className="block">
                      {condition.harness.max_context_chars} context characters ·{" "}
                      {condition.harness.max_memory_items} memory results
                    </span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </ReviewSection>
      <Separator />
      <ReviewSection title="Run plan" section="execution" onEdit={onEdit}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&_dt]:text-muted-foreground [&_dd]:mt-1 [&_dd]:break-words">
          <div>
            <dt>Planned runs</dt>
            <dd>{runCount}</dd>
          </div>
          <div>
            <dt>Rounds per run</dt>
            <dd>{design.rounds}</dd>
          </div>
          <div>
            <dt>Matched seeds</dt>
            <dd>{design.seeds.join(", ") || "None provided"}</dd>
          </div>
          <div>
            <dt>Repetitions per seed</dt>
            <dd>{design.repetitions}</dd>
          </div>
          <div>
            <dt>Maximum decisions</dt>
            <dd className="tabular-nums">
              {(
                runCount *
                design.rounds *
                design.profiles.length
              ).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Spending ceiling</dt>
            <dd>{money(design.budget_usd)}</dd>
          </div>
          <div className="sm:col-span-full">
            <dt>Measurements</dt>
            <dd>{design.measures.map(label).join(", ") || "None selected"}</dd>
          </div>
        </dl>
      </ReviewSection>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Private goals, roles and condition profile overrides are declared study
        factors. Harness selection does not prescribe a social outcome. Creating
        an experiment saves its protocol and planned runs. Model calls begin
        only when you choose to run it. Earlier revisions keep their original
        rules and evidence.
      </p>
    </section>
  );
}
