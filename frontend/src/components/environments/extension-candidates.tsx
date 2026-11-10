import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Empty } from "@/components/feedback";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api";
import { label } from "@/lib/format";
import type {
  ExtensionCandidate,
  ExtensionReview,
  ExtensionRuntime,
} from "@/lib/types";

const draftKey = "jas:extension-candidate-draft:v1";
const example: ExtensionCandidate = {
  format: "jas-extension-candidate-v1",
  name: "Double plus three",
  provenance: "Manually specified example; not an admitted environment",
  source:
    '(module (func (export "step") (param i32) (result i32) local.get 0 i32.const 2 i32.mul i32.const 3 i32.add))',
  examples: [
    { state: -4, expected: -5 },
    { state: 8, expected: 19 },
  ],
};
const admissionLabels = {
  blocked: "Validation blocked",
  rejected: "Candidate rejected",
  needs_world_review: "Needs world review",
};

function Review({ report }: { report: ExtensionReview }) {
  return (
    <section
      aria-label="Candidate review"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">
          {admissionLabels[report.admission]}
        </h3>
        <p className="text-sm text-muted-foreground">{report.candidate.name}</p>
        <p className="text-sm">Experiment execution is disabled.</p>
      </div>
      <ol className="flex flex-col gap-3 text-sm">
        {report.activity.map((activity) => (
          <li key={activity.stage} className="flex flex-col gap-1">
            <span className="font-medium">
              {label(activity.stage)} · {label(activity.status)}
            </span>
            <p className="text-muted-foreground">{activity.detail}</p>
          </li>
        ))}
      </ol>
      <details className="min-w-0 text-sm">
        <summary>Pinned candidate and provenance</summary>
        <p className="mt-3 break-all text-xs text-muted-foreground">
          SHA-256 {report.candidate_sha256}
        </p>
        <Textarea
          className="mt-3"
          aria-label="Pinned candidate specification"
          readOnly
          rows={8}
          value={JSON.stringify(report.candidate, null, 2)}
        />
      </details>
    </section>
  );
}

export function ExtensionCandidates({
  search,
  selectedId,
}: {
  search: string;
  selectedId: string | null;
}) {
  const client = useQueryClient();
  const runtime = useApi<ExtensionRuntime>("/extensions/runtime");
  const history = useApi<ExtensionReview[]>("/extensions/reviews");
  const [initial] = useState(() => {
    try {
      return { text: localStorage.getItem(draftKey) ?? "", error: "" };
    } catch {
      return {
        text: "",
        error: "The saved candidate draft could not be read.",
      };
    }
  });
  const [text, setText] = useState(initial.text);
  const [error, setError] = useState(initial.error);
  const qualify = useMutation({
    mutationFn: () => api<ExtensionRuntime>("/extensions/qualify", {}),
    onSuccess: (result) => client.setQueryData(["/extensions/runtime"], result),
  });
  const validate = useMutation({
    mutationFn: (candidate: unknown) =>
      api<ExtensionReview>("/extensions/validate", candidate),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["/extensions/reviews"] });
      void client.invalidateQueries({ queryKey: ["/extensions/runtime"] });
    },
  });
  const report = selectedId
    ? history.data?.find((record) => record.id === selectedId)
    : validate.data;
  const query = search.trim().toLowerCase();
  const records = history.data?.filter((record) =>
    `${record.candidate.name} ${record.admission}`
      .toLowerCase()
      .includes(query),
  );
  function edit(next: string) {
    setText(next);
    setError("");
    try {
      localStorage.setItem(draftKey, next);
    } catch {
      setError(
        "This draft could not be saved locally. Keep a copy before leaving.",
      );
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-6 py-4">
      <section
        aria-label="Extension containment"
        className="flex flex-col gap-3"
      >
        <h2 className="text-base font-medium">Review an extension candidate</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Check a small integer transition against supplied examples. Candidates
          remain separate from runnable experiment environments.
        </p>
        {runtime.error && (
          <ErrorState error={runtime.error} onRetry={runtime.refetch} />
        )}
        {!runtime.data && !runtime.error && <Skeleton className="h-5 w-48" />}
        {runtime.data && (
          <>
            <p role="status" className="text-sm font-medium">
              {runtime.data.validation_enabled
                ? "Containment qualified"
                : "Validation disabled"}
            </p>
            <p className="max-w-prose text-sm text-muted-foreground">
              {runtime.data.detail}
            </p>
            {runtime.data.checks.length > 0 && (
              <details className="text-sm">
                <summary>Containment evidence</summary>
                <ul className="mt-3 flex flex-col gap-2">
                  {runtime.data.checks.map((check) => (
                    <li key={check.name}>
                      {label(check.name)} · {check.passed ? "Passed" : "Failed"}
                      {!check.cleaned && " · Cleanup failed"}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  Runtime {runtime.data.fingerprint}
                </p>
              </details>
            )}
          </>
        )}
        {qualify.error && (
          <Alert variant="error">{qualify.error.message}</Alert>
        )}
        <div>
          <Button
            variant="outline"
            disabled={qualify.isPending || validate.isPending || !runtime.data}
            onClick={() => qualify.mutate()}
          >
            {qualify.isPending && <Spinner data-icon="inline-start" />}
            {qualify.isPending ? "Checking containment…" : "Check containment"}
          </Button>
        </div>
      </section>
      <Separator />
      <form
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (validate.isPending || !runtime.data?.validation_enabled) return;
          try {
            const candidate: unknown = JSON.parse(text);
            setError("");
            validate.mutate(candidate);
          } catch {
            setError(
              "Candidate specification must be valid JSON. Your draft is retained.",
            );
          }
        }}
      >
        <FieldGroup>
          <Field data-invalid={!!error} data-disabled={validate.isPending}>
            <FieldLabel htmlFor="extension-specification">
              Candidate specification
            </FieldLabel>
            <FieldDescription id="extension-help">
              Use jas-extension-candidate-v1 with provenance, WAT source
              exporting step(i32) → i32, and state/expected examples. Host
              imports are denied.
            </FieldDescription>
            <Textarea
              id="extension-specification"
              aria-describedby="extension-help"
              aria-invalid={!!error}
              value={text}
              onChange={(event) => edit(event.target.value)}
              disabled={validate.isPending}
              rows={12}
              spellCheck={false}
              maxLength={80000}
            />
          </Field>
        </FieldGroup>
        {error && <Alert variant="error">{error}</Alert>}
        {validate.error && (
          <Alert variant="error">{validate.error.message}</Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={
              !text.trim() ||
              !runtime.data?.validation_enabled ||
              validate.isPending ||
              qualify.isPending
            }
          >
            {validate.isPending && <Spinner data-icon="inline-start" />}
            {validate.isPending ? "Validating…" : "Validate candidate"}
          </Button>
          {!text && (
            <Button
              type="button"
              variant="outline"
              onClick={() => edit(JSON.stringify(example, null, 2))}
            >
              Use safe example
            </Button>
          )}
        </div>
      </form>
      {report && <Review report={report} />}
      {selectedId && history.data && !report && (
        <Alert title="Candidate review not found">
          <Link to="/environments?view=candidates">
            Review another candidate
          </Link>
        </Alert>
      )}
      <Separator />
      <section
        aria-label="Candidate review history"
        className="flex flex-col gap-3"
      >
        <h2 className="text-base font-medium">Review history</h2>
        {history.error && (
          <ErrorState error={history.error} onRetry={history.refetch} />
        )}
        {!history.data && !history.error && (
          <Skeleton className="h-12 w-full" />
        )}
        {records?.map((record) => (
          <div key={record.id} className="flex flex-col gap-1 text-sm">
            <Link
              className="w-fit hover:underline"
              to={`/environments?view=candidates&review=${record.id}`}
            >
              {record.candidate.name}
            </Link>
            <span className="text-muted-foreground">
              {admissionLabels[record.admission]}
            </span>
          </div>
        ))}
        {records?.length === 0 && (
          <Empty
            title={
              query
                ? "No matching candidate reviews"
                : "No candidate reviews yet"
            }
          />
        )}
      </section>
    </div>
  );
}
