import { AdjudicationReview } from "@/components/adjudication";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import type { Design, ExperimentPreflight } from "@/lib/types";

export function ExperimentCheck({
  report,
  design,
}: {
  report: ExperimentPreflight;
  design?: Design;
}) {
  const blocked = report.status === "blocked";
  return (
    <section className="my-4 min-w-0 break-words" aria-label="Experiment check">
      <Alert
        title={
          blocked
            ? "Resolve before execution"
            : report.issues.length
              ? "Review experiment limits"
              : "No mechanical issues found"
        }
        variant={blocked ? "error" : "default"}
      >
        <p>
          {report.probe_turns.toLocaleString()} scripted decisions · No model
          calls
        </p>
        <Disclosure className="min-w-0" defaultOpen={blocked}>
          <DisclosureTrigger>
            {report.issues.length
              ? `Review ${report.issues.length} findings`
              : "Review scope and question mapping"}
          </DisclosureTrigger>
          <DisclosureContent>
            <ExperimentCheckDetails report={report} design={design} />
          </DisclosureContent>
        </Disclosure>
      </Alert>
    </section>
  );
}

/** Shared check evidence without a surrounding callout or extra outer spacing. */
export function ExperimentCheckDetails({
  report,
  design,
}: {
  report: ExperimentPreflight;
  design?: Design;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 break-words">
      {report.issues.length > 0 && (
        <ul>
          {report.issues.map((issue) => (
            <li key={`${issue.code}-${issue.message}`}>
              {issue.severity === "error" && <strong>Blocked: </strong>}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      {report.original_question && (
        <p>
          <strong>Original question:</strong> {report.original_question}
        </p>
      )}
      {report.research && (
        <Disclosure>
          <DisclosureTrigger>
            Scientific design review · {report.research.issues.length} cautions
          </DisclosureTrigger>
          <DisclosureContent className="flex flex-col gap-3 pt-3">
            <p>Mechanical admission does not certify scientific validity.</p>
            {report.research.variation.map((row) => (
              <p key={row.condition_key}>
                {row.condition_key}: {row.distinct_initial_states} distinct
                initial states across {row.seeds} seed labels.
              </p>
            ))}
            {report.research.issues.map((issue) => (
              <div key={`${issue.code}-${issue.message}`}>
                <p>{issue.message}</p>
                <p className="text-muted-foreground">
                  Next test: {issue.next_test}
                </p>
              </div>
            ))}
            <p className="text-muted-foreground">{report.research.limits}</p>
          </DisclosureContent>
        </Disclosure>
      )}
      {report.question_mapping?.length ? (
        <div>
          <p>Planner mapping; review against the enforced rules.</p>
          <ul>
            {report.question_mapping.map((item) => (
              <li key={`${item.capability}-${item.source}`}>
                <q>{item.source}</q>{" "}
                <Badge variant="secondary">{item.mapping}</Badge>
                <p>{item.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>
          Question fidelity has not been checked. These checks assess mechanics
          only.
        </p>
      )}
      {report.adjudications?.map((declaration) => (
        <AdjudicationReview
          key={declaration.condition_key}
          declaration={declaration}
          design={design}
        />
      ))}
      {report.comparisons.map((comparison) => (
        <p key={comparison.condition}>
          <strong>
            {comparison.condition} vs {comparison.baseline}:
          </strong>{" "}
          {comparison.changed_parameters.length
            ? comparison.changed_parameters.join(", ")
            : "No parameter changes"}
          {comparison.agent_assignment_changed && "; agent assignments differ"}.{" "}
          {comparison.changed_harness.length > 0 &&
            `Harness changes: ${comparison.changed_harness.join(", ")}. `}
          {
            comparison.witnesses.filter(
              (w) => w.observation_difference || w.outcome_difference,
            ).length
          }
          /{comparison.witnesses.length} instruments witnessed a difference.
        </p>
      ))}
      <p className="text-muted-foreground">{report.limits}</p>
    </div>
  );
}
