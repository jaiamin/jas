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
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
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
      return { ...listDrafts(), error: "" };
    } catch (error) {
      return { items: [], unreadable: [], error: (error as Error).message };
    }
  });
  function discardDraft(path: string) {
    try {
      removeDraft(path);
      setDrafts({ ...listDrafts(), error: "" });
    } catch (error) {
      setDrafts((drafts) => ({ ...drafts, error: (error as Error).message }));
    }
  }
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
        <PageHeading title="What would you like to explore?">
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
              <span>Design with AI, then review before running.</span>
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
      <div className="home-starters">
        {catalog.error && (
          <ErrorState error={catalog.error} onRetry={catalog.refetch} />
        )}
        {catalog.data?.templates.slice(0, 3).map((template) => (
          <Button key={template.id} variant="outline" size="sm" asChild>
            <Link to={`/new?template=${template.id}`}>
              {template.design.title}
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        ))}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/environments">
            All environments
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
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
          <ErrorState error={studies.error} onRetry={studies.refetch} />
        ) : studies.data ? (
          <StudyTable studies={studies.data.slice(0, 5)} compact />
        ) : (
          <Loading />
        )}
      </section>{" "}
      {drafts.error && (
        <Alert variant="error">
          Drafts could not be loaded: {drafts.error}
        </Alert>
      )}
      {drafts.unreadable.length > 0 && (
        <Alert variant="error" title="Some drafts could not be read">
          <p>
            Your other drafts are still available. Unreadable drafts remain in
            browser storage until you discard them.
          </p>
          {drafts.unreadable.map((path) => (
            <Button
              key={path}
              variant="outline"
              onClick={() => discardDraft(path)}
            >
              Discard unreadable draft · {path}
            </Button>
          ))}
        </Alert>
      )}
      {drafts.items.length > 0 && (
        <Disclosure className="disclosure home-plans">
          <DisclosureTrigger>Drafts · {drafts.items.length}</DisclosureTrigger>
          <DisclosureContent>
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
                    onClick={() => discardDraft(draft.path)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </DisclosureContent>
        </Disclosure>
      )}
      {plans.error && (
        <ErrorState error={plans.error} onRetry={plans.refetch} />
      )}
      {!!plans.data?.length && (
        <Disclosure className="disclosure home-plans">
          <DisclosureTrigger>Recent AI designs</DisclosureTrigger>
          <DisclosureContent>
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
          </DisclosureContent>
        </Disclosure>
      )}
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
        <ErrorState error={studies.error} onRetry={studies.refetch} />
      ) : studies.data ? (
        <StudyTable studies={studies.data} />
      ) : (
        <Loading />
      )}
    </>
  );
}
