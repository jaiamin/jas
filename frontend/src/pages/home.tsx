import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ErrorState,
  Loading,
  PageHeading,
  StudyTable,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { api, useApi } from "@/lib/api";
import { listDrafts, removeDraft } from "@/lib/drafts";
import type { Analysis, Catalog, StudySummary } from "@/lib/types";

export function Home() {
  const location = useLocation();
  const studies = useApi<StudySummary[]>("/studies", true);
  const catalog = useApi<Catalog>("/catalog");
  const plans = useApi<Analysis[]>("/analyses", true);
  const [drafts, setDrafts] = useState(() => {
    try {
      return { items: listDrafts(), error: "" };
    } catch (error) {
      return { items: [], error: (error as Error).message };
    }
  });
  const [question, setQuestion] = useState(() =>
    typeof location.state?.question === "string" ? location.state.question : "",
  );
  const navigate = useNavigate();
  const plan = useMutation({
    mutationFn: () => api<{ id: string }>("/plan", { question }),
    onSuccess: (result) => navigate(`/new?plan=${result.id}`),
  });
  return (
    <>
      <section className="home-intro">
        <PageHeading title="Design an experiment">
          <Button variant="outline" asChild>
            <Link to="/new">Configure manually</Link>
          </Button>
        </PageHeading>
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
          <InputGroup>
            <InputGroupTextarea
              id="research-question"
              placeholder="When do agents choose themselves over the group?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={4000}
              rows={3}
            />
            <InputGroupAddon>
              <span>Review the AI draft before running.</span>
              <Button
                disabled={!question.trim() || plan.isPending}
                type="submit"
              >
                {plan.isPending ? (
                  <LoaderCircle className="spin" data-icon="inline-start" />
                ) : (
                  <ArrowUpRight data-icon="inline-start" />
                )}
                Design experiment
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </form>
        {plan.error && <Alert variant="error">{plan.error.message}</Alert>}
      </section>
      <section className="home-starters">
        <div className="section-heading">
          <h2>Templates</h2>
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
      {drafts.error && (
        <Alert variant="error">
          Drafts could not be loaded: {drafts.error}
        </Alert>
      )}
      {drafts.items.length > 0 && (
        <details className="disclosure home-plans">
          <summary>Drafts · {drafts.items.length}</summary>
          <div className="draft-list">
            {drafts.items.map((draft) => (
              <div key={draft.path}>
                <Link to={draft.path}>
                  {draft.title || "Untitled experiment"}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Discard ${draft.title || "untitled"} draft`}
                  onClick={() => {
                    try {
                      removeDraft(draft.path);
                      setDrafts({ items: listDrafts(), error: "" });
                    } catch (error) {
                      setDrafts({ ...drafts, error: (error as Error).message });
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}
      {!!plans.data?.length && (
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
      <PageHeading title="Experiments">
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
