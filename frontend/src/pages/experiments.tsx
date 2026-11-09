import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { MessageSquare, PenLine, Plus, Trash2 } from "@/components/icons";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { StudyTable } from "@/components/study-table";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useApi } from "@/lib/api";
import { listDrafts, removeDraft } from "@/lib/drafts";
import { date } from "@/lib/format";
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
      <PageHeading title="Experiments">
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
        <Disclosure className="mt-6 min-w-0">
          <DisclosureTrigger>Drafts · {drafts.items.length}</DisclosureTrigger>
          <DisclosureContent className="pt-3">
            <ItemGroup>
              {drafts.items.map((draft) => (
                <Item
                  key={draft.path}
                  variant="outline"
                  size="sm"
                  className="flex-nowrap"
                >
                  <ItemMedia variant="icon">
                    <PenLine />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="max-w-full">
                      <Link
                        to={draft.path}
                        className="truncate hover:underline"
                        title={draft.title || "Untitled experiment"}
                      >
                        {draft.title || "Untitled experiment"}
                      </Link>
                    </ItemTitle>
                    {Number.isFinite(Date.parse(draft.updated)) && (
                      <ItemDescription>
                        Edited {date(draft.updated)}
                      </ItemDescription>
                    )}
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </DisclosureContent>
        </Disclosure>
      )}
    </>
  );
}
