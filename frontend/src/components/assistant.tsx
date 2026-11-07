import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, BookOpen, LoaderCircle } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { ErrorState, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, Empty } from "@/components/ui/data";
import { Field, FieldGroup, FieldLabel, Textarea } from "@/components/ui/input";
import { api, useApi } from "@/lib/api";
import type { Analysis } from "@/lib/types";
import { money } from "@/lib/utils";

export function ResearchAssistant({
  studyId,
  runId,
}: {
  studyId?: string;
  runId?: string;
}) {
  const path = `/analyses?${runId ? `run_id=${runId}` : `study_id=${studyId}`}`;
  const analyses = useApi<Analysis[]>(path, true);
  const [question, setQuestion] = useState("");
  const client = useQueryClient();
  const busy = analyses.data?.some((row) => row.status === "pending");
  const ask = useMutation({
    mutationFn: (text: string) =>
      api("/analyses", {
        question: text,
        study_id: studyId ?? null,
        run_id: runId ?? null,
      }),
    onSuccess: () => {
      setQuestion("");
      client.invalidateQueries({ queryKey: [path] });
    },
  });
  return (
    <section className="research-assistant">
      <div className="section-heading">
        <div>
          <h2>Ask the evidence</h2>
          <p>Read-only investigation with GPT-6.1 Sol.</p>
        </div>
        <BookOpen />
      </div>
      {analyses.error ? (
        <ErrorState error={analyses.error} />
      ) : !analyses.data ? (
        <Loading />
      ) : !analyses.data.length ? (
        <Empty
          title="A better question, a closer look"
          description="Ask about a strategy, a surprising decision, an apparent false claim, or how conditions compare."
        />
      ) : (
        <div className="research-thread">
          {analyses.data.map((row) => (
            <article className="research-entry" key={row.id}>
              <h3>{row.question}</h3>
              <p className="evidence-cutoff">
                Evidence captured{" "}
                {Object.entries(row.cutoffs).length === 1
                  ? `through turn ${Object.values(row.cutoffs)[0]}`
                  : `from ${Object.keys(row.cutoffs).length} runs`}{" "}
                ·{" "}
                {new Date(row.created).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {row.usage &&
                  ` · ${money(row.usage.cost_usd)}${row.usage.partial ? "*" : ""}`}
              </p>
              {row.status === "pending" ? (
                <p className="assistant-working" role="status">
                  <LoaderCircle className="spin" />
                  Inspecting recorded evidence… You can leave this page.
                </p>
              ) : row.status === "failed" ? (
                <Alert variant="error" title="Investigation stopped">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy || ask.isPending}
                    onClick={() => ask.mutate(row.question)}
                  >
                    Ask again
                  </Button>
                  <details>
                    <summary>Error details</summary>
                    <p>{row.error}</p>
                  </details>
                </Alert>
              ) : (
                <>
                  <div className="prose">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {row.output?.answer ?? ""}
                    </Markdown>
                  </div>
                  {!!row.output?.citations?.length && (
                    <div className="citation-list">
                      <span>Evidence</span>
                      {row.output.citations.map((citation) => (
                        <Button
                          key={`${citation.run_id}-${citation.turn}`}
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link
                            to={`/runs/${citation.run_id}?turn=${citation.turn}&tab=decisions`}
                          >
                            Turn {citation.turn}
                            {Object.keys(row.cutoffs).length > 1 &&
                              ` · ${citation.run_id.slice(0, 5)}`}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}
                  {!!row.output?.caveats?.length && (
                    <details className="disclosure">
                      <summary>Limitations & uncertainty</summary>
                      <ul>
                        {row.output.caveats.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}
      <form
        className="assistant-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask.mutate(question);
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="analysis-question">Your question</FieldLabel>
            <Textarea
              id="analysis-question"
              value={question}
              maxLength={4000}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="Did anyone consistently say one thing and do another?"
            />
          </Field>
        </FieldGroup>
        <div className="form-submit">
          <Button
            type="submit"
            disabled={!question.trim() || busy || ask.isPending}
          >
            <ArrowUp data-icon="inline-start" />
            {busy || ask.isPending ? "Investigating…" : "Ask researcher"}
          </Button>
          <span>
            Analysis uses separate model requests and shares the study budget.
          </span>
        </div>
        {ask.error && <Alert variant="error">{ask.error.message}</Alert>}
      </form>
    </section>
  );
}
