import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useRef, useState } from "react";
import { forgetAssistantChat } from "@/components/agent/assistant-workspace";
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
import { api } from "@/lib/api";

export function AgentDeleteChat({
  chatId,
  disabled,
  restoreFocusRef,
  onDeleted,
}: {
  chatId: string | null;
  disabled: boolean;
  restoreFocusRef: RefObject<HTMLButtonElement | null>;
  onDeleted?: (id: string) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => api(`/chats/${id}`, undefined, "DELETE"),
    onSuccess: (_, id) => {
      forgetAssistantChat(client, id);
      onDeleted?.(id);
      setDeleting(null);
    },
  });
  return (
    <>
      {chatId && (
        <Button
          ref={trigger}
          variant="ghost"
          size="icon-sm"
          aria-label="Delete chat"
          title={disabled ? "Chat is loading or in progress" : "Delete chat"}
          disabled={disabled || remove.isPending}
          onClick={() => {
            remove.reset();
            setDeleting(chatId);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(next) => {
          if (!next && !remove.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (remove.isPending) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (trigger.current ?? restoreFocusRef.current)?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the conversation. Recorded usage is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && (
            <Alert variant="error">{remove.error.message}</Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleting && !remove.isPending) remove.mutate(deleting);
              }}
            >
              {remove.isPending && <Spinner data-icon="inline-start" />}
              {remove.isPending ? "Deleting…" : "Delete chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
