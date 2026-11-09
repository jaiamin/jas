import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import type { ExperimentPreflight } from "@/lib/types";

export function ExperimentCheck({ report }: { report: ExperimentPreflight }) {
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
                Question fidelity has not been checked. These checks assess
                mechanics only.
              </p>
            )}
            {report.comparisons.map((comparison) => (
              <p key={comparison.condition}>
                <strong>
                  {comparison.condition} vs {comparison.baseline}:
                </strong>{" "}
                {comparison.changed_parameters.length
                  ? comparison.changed_parameters.join(", ")
                  : "No parameter changes"}
                {comparison.agent_assignment_changed &&
                  "; agent assignments differ"}
                .{" "}
                {
                  comparison.witnesses.filter(
                    (w) => w.observation_difference || w.outcome_difference,
                  ).length
                }
                /{comparison.witnesses.length} instruments witnessed a
                difference.
              </p>
            ))}
            <p className="text-muted-foreground">{report.limits}</p>
          </DisclosureContent>
        </Disclosure>
      </Alert>
    </section>
  );
}
