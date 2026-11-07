import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ErrorState,
  Loading,
  PageHeading,
  StudyTable,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import { Textarea } from "@/components/ui/input";
import { api, useApi } from "@/lib/api";
import type { Analysis, Catalog, StudySummary } from "@/lib/types";

export function Home() {
  const studies = useApi<StudySummary[]>("/studies", true);
  const catalog = useApi<Catalog>("/catalog");
  const plans = useApi<Analysis[]>("/analyses", true);
  const [question, setQuestion] = useState("");
  const navigate = useNavigate();
  const plan = useMutation({
    mutationFn: () => api<{ id: string }>("/plan", { question }),
    onSuccess: (result) => navigate(`/new?plan=${result.id}`),
  });
  return (
    <>
      <section className="home-intro">
        <div className="home-title">
          <div className="brand-symbol">
            <FlaskConical />
          </div>
          <h1>Make agent behavior observable.</h1>
          <p>Ask a question. Design an experiment. Follow the evidence.</p>
        </div>
        <form
          className="question-composer"
          onSubmit={(e) => {
            e.preventDefault();
            plan.mutate();
          }}
        >
          <label htmlFor="research-question" className="sr-only">
            Your research question
          </label>
          <Textarea
            id="research-question"
            placeholder="When do agents choose themselves over the group?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={4000}
            rows={3}
          />
          <div className="composer-footer">
            <span>AI drafts the study. You review before running.</span>
            <Button disabled={!question.trim() || plan.isPending} type="submit">
              {plan.isPending ? (
                <LoaderCircle className="spin" data-icon="inline-start" />
              ) : (
                <ArrowUpRight data-icon="inline-start" />
              )}
              Design experiment
            </Button>
          </div>
        </form>
        {plan.error && <Alert variant="error">{plan.error.message}</Alert>}
        <div className="composer-alternative">
          <span>Have a protocol in mind?</span>
          <Link to="/new">
            Configure it yourself
            <ArrowRight />
          </Link>
        </div>
      </section>
      <section className="home-starters">
        <div className="section-heading">
          <h2>Start with a question</h2>
          <Link to="/environments">
            Explore environments
            <ArrowRight />
          </Link>
        </div>
        <div className="starter-list">
          {catalog.data?.templates.map((template) => (
            <Link
              key={template.id}
              to={`/new?template=${template.id}`}
              className="starter-row"
            >
              <div>
                <h3>{template.design.title}</h3>
                <p>{template.design.question}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
        </div>
      </section>
      {plans.data?.some(
        (p) => p.status === "pending" || p.status === "complete",
      ) && (
        <details className="disclosure home-plans">
          <summary>Recent AI designs</summary>
          <div className="plan-history">
            {plans.data
              .slice(-4)
              .reverse()
              .map((p) => (
                <Link to={`/new?plan=${p.id}`} key={p.id}>
                  {p.question}
                  <span>{p.status}</span>
                </Link>
              ))}
          </div>
        </details>
      )}
      <section>
        <div className="section-heading">
          <h2>Recent experiments</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/studies">
              View all
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        {studies.error ? (
          <ErrorState error={studies.error} />
        ) : studies.data ? (
          <StudyTable studies={studies.data.slice(0, 5)} compact />
        ) : (
          <Loading />
        )}
      </section>
    </>
  );
}

export function Studies() {
  const studies = useApi<StudySummary[]>("/studies", true);
  return (
    <>
      <PageHeading
        title="Experiments"
        description="Questions, conditions, and the evidence they produce."
      >
        <Button asChild>
          <Link to="/new">
            <Plus data-icon="inline-start" />
            New experiment
          </Link>
        </Button>
      </PageHeading>
      {studies.error ? (
        <ErrorState error={studies.error} />
      ) : studies.data ? (
        <StudyTable studies={studies.data} />
      ) : (
        <Loading />
      )}
    </>
  );
}
