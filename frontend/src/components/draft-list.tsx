import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { FlaskConical, Trash2 } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { useNow } from "@/hooks/use-now";
import type { Draft } from "@/lib/drafts";
import { relativeTime } from "@/lib/format";

export function DraftList({
  drafts,
  onDelete,
}: {
  drafts: Draft[];
  onDelete: (path: string) => void;
}) {
  const now = useNow();
  return (
    <ItemGroup className="has-data-[size=xs]:gap-0">
      {drafts.map((draft, index) => (
        <Fragment key={draft.path}>
          <div className="flex min-w-0 items-center gap-2.5 pl-1.75 transition-colors hover:bg-muted/50">
            <Item
              size="xs"
              className="min-w-0 flex-1 gap-2.5 rounded-none border-0 px-0 py-3 [a]:hover:bg-transparent"
              asChild
            >
              <Link
                to={draft.path}
                title={draft.title || "Untitled experiment"}
                aria-label={draft.title || "Untitled experiment"}
              >
                <ItemMedia
                  variant="icon"
                  className="group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center [&_svg:not([class*='size-'])]:size-3.5"
                >
                  <FlaskConical aria-hidden="true" />
                </ItemMedia>
                <ItemContent className="min-w-0 flex-row items-center group-data-[size=xs]/item:gap-3">
                  <ItemTitle className="min-w-0 flex-1 font-normal">
                    <span className="truncate">
                      {draft.title || "Untitled experiment"}
                    </span>
                  </ItemTitle>
                  {Number.isFinite(Date.parse(draft.updated)) && (
                    <ItemDescription className="shrink-0 text-foreground/60 whitespace-nowrap">
                      <time
                        dateTime={draft.updated}
                        title={`Edited ${new Date(draft.updated).toLocaleString()}`}
                      >
                        {relativeTime(draft.updated, now)}
                      </time>
                    </ItemDescription>
                  )}
                </ItemContent>
              </Link>
            </Item>
            <ItemActions>
              <DeleteDraft draft={draft} onDelete={onDelete} />
            </ItemActions>
          </div>
          {index < drafts.length - 1 && <ItemSeparator className="my-0" />}
        </Fragment>
      ))}
    </ItemGroup>
  );
}

function DeleteDraft({
  draft,
  onDelete,
}: {
  draft: Draft;
  onDelete: (path: string) => void;
}) {
  const [error, setError] = useState("");
  const title = draft.title || "Untitled experiment";
  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (open) setError("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-foreground/60 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent [&_svg:not([class*='size-'])]:size-3.5"
          aria-label={`Delete ${title} draft`}
          title="Delete draft"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete draft?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” will be removed from this browser. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <Alert variant="error">{error}</Alert>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              try {
                onDelete(draft.path);
              } catch (cause) {
                event.preventDefault();
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Draft could not be deleted.",
                );
              }
            }}
          >
            Delete draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
