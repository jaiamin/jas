import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { DraftList } from "@/components/draft-list";
import { Alert } from "@/components/feedback";
import { MessageSquare, Plus } from "@/components/icons";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { StudyTable } from "@/components/study-table";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { listDrafts, removeDraft } from "@/lib/drafts";
import type { StudySummary } from "@/lib/types";

export default function Experiments() {
  const location = useLocation();
  const studies = useApi<StudySummary[]>("/studies", true);
  const [drafts, setDrafts] = useState(() => {
    try {
      return { ...listDrafts(), error: "" };
    } catch (error) {
      return { items: [], unreadable: [], error: (error as Error).message };
    }
  });
  useEffect(() => {
    if (location.hash === "#drafts" && !studies.isPending)
      document.getElementById("drafts")?.scrollIntoView({ block: "start" });
  }, [location.hash, studies.isPending]);
  return (
    <>
      <PageHeading title="Experiments">
        <Button variant="outline" asChild>
          <Link to="/agent">
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
        <Disclosure
          id="drafts"
          defaultOpen={location.hash === "#drafts"}
          className="mt-6 min-w-0"
        >
          <DisclosureTrigger>Drafts · {drafts.items.length}</DisclosureTrigger>
          <DisclosureContent className="pt-3">
            <DraftList
              drafts={drafts.items}
              onDelete={(path) => {
                removeDraft(path);
                setDrafts((current) => ({
                  ...current,
                  items: current.items.filter((draft) => draft.path !== path),
                }));
              }}
            />
          </DisclosureContent>
        </Disclosure>
      )}
    </>
  );
}
