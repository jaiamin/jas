import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import type { StudySummary } from "@/lib/types";

export function DeleteExperiments({
  studies,
  onDeleted,
}: {
  studies: StudySummary[];
  onDeleted: (ids: string[]) => void;
}) {
  const [targets, setTargets] = useState<StudySummary[] | null>(null);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const client = useQueryClient();
  const blocked = studies.some((study) =>
    ["running", "queued", "pausing"].includes(study.status),
  );
  const deletion = useMutation({
    mutationFn: async (records: StudySummary[]) => {
      const deleted: string[] = [];
      const failed: StudySummary[] = [];
      let reason = "";
      for (const study of records) {
        try {
          await api(`/studies/${study.id}`, undefined, "DELETE");
          deleted.push(study.id);
        } catch (error) {
          failed.push(study);
          reason ||= error instanceof Error ? error.message : "Try again.";
        }
      }
      return { deleted, failed, reason };
    },
    onSuccess: async ({ deleted, failed, reason }) => {
      onDeleted(deleted);
      setTargets(failed.length ? failed : null);
      setError(
        failed.length
          ? `${deleted.length ? `${deleted.length} deleted. ` : ""}${failed.length} not deleted. ${reason}`
          : "",
      );
      await client.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === "string" &&
          /^\/(studies|runs|chats|analyses)(\/|\?|$)/.test(query.queryKey[0]),
      });
    },
  });
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={trigger}
            variant="outline"
            size="icon-sm"
            aria-label="Delete selected experiments"
            disabled={blocked}
            onClick={() => {
              setError("");
              setTargets([...studies]);
            }}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {blocked
            ? "Pause selected experiments before deleting"
            : "Delete experiments"}
        </TooltipContent>
      </Tooltip>
      <AlertDialog
        open={targets !== null}
        onOpenChange={(open) => {
          if (!open && !deletion.isPending) setTargets(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            if (trigger.current?.isConnected) {
              event.preventDefault();
              trigger.current.focus();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {targets?.length}{" "}
              {targets?.length === 1 ? "experiment" : "experiments"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All selected experiments, versions, runs, evidence and related
              chat messages will be permanently deleted. Spending records and
              local drafts are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <Alert variant="error">{error}</Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletion.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletion.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (targets) deletion.mutate(targets);
              }}
            >
              {deletion.isPending && <Spinner data-icon="inline-start" />}
              {deletion.isPending ? "Deleting…" : "Delete experiments"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
