import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { StudyTable } from "@/components/study-table";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import { useApi } from "@/lib/api";
import { listDrafts, removeDraft } from "@/lib/drafts";
import type { StudySummary } from "@/lib/types";

export default function Experiments() {
  const studies = useApi<StudySummary[]>("/studies", true);
  const [drafts, setDrafts] = useState(() => {
    try {
      return { items: listDrafts(), error: "" };
    } catch (error) {
      return { items: [], error: (error as Error).message };
    }
  });
  return (
    <>
      <PageHeading
        title="Experiments"
        description="Design controlled trials. Follow every outcome back to a decision."
      >
        <Button variant="outline" asChild>
          <Link to="/design">
            <Sparkles data-icon="inline-start" />
            Design with AI
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
        <ErrorState error={studies.error} />
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
      {drafts.items.length > 0 && (
        <Disclosure className="disclosure drafts-section">
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
                    onClick={() => {
                      try {
                        removeDraft(draft.path);
                        setDrafts({ items: listDrafts(), error: "" });
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
