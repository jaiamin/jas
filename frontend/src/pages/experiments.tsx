import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { MessageSquare, Plus, Trash2 } from "@/components/icons";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { StudyTable } from "@/components/study-table";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { listDrafts, removeDraft } from "@/lib/drafts";
import type { StudySummary } from "@/lib/types";

export default function Experiments() {
  const studies = useApi<StudySummary[]>("/studies", true);
  const [drafts, setDrafts] = useState(() => {
    try {
      return { ...listDrafts(), error: "" };
    } catch (error) {
      return { items: [], unreadable: [], error: (error as Error).message };
    }
  });
  return (
    <>
      <PageHeading
        title="Experiments"
        description="Ask a question. Control the conditions. Follow the evidence."
      >
        <Button variant="outline" asChild>
          <Link to="/agent?context=new">
            <MessageSquare data-icon="inline-start" />
            Design with Agent
          </Link>
        </Button>
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
      {drafts.error && (
        <Alert variant="error">
          Drafts could not be loaded: {drafts.error}
        </Alert>
      )}
      {drafts.unreadable.length > 0 && (
        <Alert variant="error">
          Some drafts could not be read. Other drafts remain available.
          {drafts.unreadable.map((path) => (
            <Button
              key={path}
              variant="outline"
              size="sm"
              aria-label={`Discard unreadable draft · ${path}`}
              onClick={() => {
                try {
                  removeDraft(path);
                  setDrafts({ ...listDrafts(), error: "" });
                } catch (error) {
                  setDrafts({ ...drafts, error: (error as Error).message });
                }
              }}
            >
              Discard unreadable draft · {path}
            </Button>
          ))}
        </Alert>
      )}
      {drafts.items.length > 0 && (
        <Disclosure className="min-w-0 mb-6">
          <DisclosureTrigger>Drafts · {drafts.items.length}</DisclosureTrigger>
          <DisclosureContent>
            <div className="flex flex-col gap-2">
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
                        setDrafts({ ...listDrafts(), error: "" });
                      } catch (error) {
                        setDrafts({
                          ...drafts,
                          error: (error as Error).message,
                        });
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </DisclosureContent>
        </Disclosure>
      )}
    </>
  );
}
