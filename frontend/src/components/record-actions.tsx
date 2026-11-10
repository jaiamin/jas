import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, type RefObject, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { Ellipsis } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import type { RunSummary, StudySummary } from "@/lib/types";

function RecordActionsMenu({
  name,
  children,
  triggerRef,
}: {
  name: string;
  children: ReactNode;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`Actions for ${name}`}
          ref={triggerRef}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ExperimentActions({ study }: { study: StudySummary }) {
  const [confirm, setConfirm] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const client = useQueryClient();
  const deletion = useMutation({
    mutationFn: () => api(`/studies/${study.id}`, undefined, "DELETE"),
    onSuccess: async () => {
      setConfirm(false);
      await client.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === "string" &&
          /^\/(studies|runs|chats|analyses)(\/|\?|$)/.test(query.queryKey[0]),
      });
    },
  });
  return (
    <>
      <RecordActionsMenu name={study.title} triggerRef={triggerRef}>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to={`/studies/${study.id}`}>Open experiment</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/new?study=${study.id}`}>Edit as new revision</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/new?copy=${study.id}`}>Duplicate</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/studies/${study.id}/export`}>Export evidence</a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              deletion.reset();
              setConfirm(true);
            }}
          >
            Delete experiment…
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </RecordActionsMenu>
      <AlertDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!deletion.isPending) setConfirm(open);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            if (triggerRef.current?.isConnected) {
              event.preventDefault();
              triggerRef.current.focus();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete experiment?</AlertDialogTitle>
            <AlertDialogDescription>
              “{study.title}” and all its revisions, runs, evidence, and related
              chat messages will be permanently deleted. Spending records and
              local drafts are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletion.error && (
            <Alert variant="error">{deletion.error.message}</Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletion.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletion.isPending}
              onClick={(event) => {
                event.preventDefault();
                deletion.mutate();
              }}
            >
              {deletion.isPending && (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              )}
              {deletion.isPending ? "Deleting…" : "Delete experiment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RunActions({ run }: { run: RunSummary }) {
  return (
    <RecordActionsMenu
      name={`${run.condition}, seed ${run.seed}, revision ${run.revision}, repetition ${run.repetition}`}
    >
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link to={`/runs/${run.id}`}>Inspect run</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/studies/${run.study_id}?revision=${run.revision}`}>
            Open experiment
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/studies/${run.study_id}/export`}>
            Export experiment evidence
          </a>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </RecordActionsMenu>
  );
}
