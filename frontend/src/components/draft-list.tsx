import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { Trash2 } from "@/components/icons";
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
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import type { Draft } from "@/lib/drafts";
import { date } from "@/lib/format";

export function DraftList({
  drafts,
  onDelete,
}: {
  drafts: Draft[];
  onDelete: (path: string) => void;
}) {
  return (
    <ItemGroup className="has-data-[size=xs]:gap-0">
      {drafts.map((draft, index) => (
        <Fragment key={draft.path}>
          <div className="group/draft flex min-w-0 items-center gap-3">
            <Item
              size="xs"
              className="min-w-0 flex-1 border-0 px-0 [a]:hover:bg-transparent"
              asChild
            >
              <Link
                to={draft.path}
                title={draft.title || "Untitled experiment"}
                aria-label={draft.title || "Untitled experiment"}
              >
                <ItemContent className="min-w-0 flex-row items-center group-data-[size=xs]/item:gap-3">
                  <ItemTitle className="min-w-0 flex-1">
                    <span className="truncate">
                      {draft.title || "Untitled experiment"}
                    </span>
                  </ItemTitle>
                  {Number.isFinite(Date.parse(draft.updated)) && (
                    <ItemDescription className="shrink-0 whitespace-nowrap">
                      <time dateTime={draft.updated}>
                        Edited {date(draft.updated)}
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
          aria-label={`Delete ${title} draft`}
          title="Delete draft"
          className="opacity-0 group-hover/draft:opacity-100 group-focus-within/draft:opacity-100 [@media(hover:none)]:opacity-100 [@media(pointer:coarse)]:opacity-100"
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
