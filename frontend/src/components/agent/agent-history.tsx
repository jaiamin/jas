import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { forgetAssistantChat } from "@/components/agent/assistant-workspace";
import { Alert } from "@/components/feedback";
import {
  ChevronDown,
  History,
  MessageSquare,
  Trash2,
} from "@/components/icons";
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
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/use-now";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { ChatSummary } from "@/lib/types";

function shortTitle(title: string) {
  return title.length > 40 ? `${title.slice(0, 40).trimEnd()}…` : title;
}

export function AgentHistory({
  currentChat,
  currentTitle,
  onSelect,
  onDeleted,
}: {
  currentChat?: string | null;
  currentTitle?: string;
  onSelect?: (id: string) => void;
  onDeleted?: (id: string) => void;
}) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => api(`/chats/${id}`, undefined, "DELETE"),
    onSuccess: (_, id) => {
      forgetAssistantChat(client, id);
      onDeleted?.(id);
      setDeleting(null);
      setOpen(false);
    },
  });
  const titleId = useId();
  const [params] = useSearchParams();
  const current = currentChat === undefined ? params.get("chat") : currentChat;
  const chats = useQuery({
    queryKey: ["/chats"],
    queryFn: () => api<ChatSummary[]>("/chats"),
    enabled: open,
    refetchInterval: open ? 1500 : false,
  });
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="default"
            className="-ml-2.5 h-7 min-w-0 max-w-full shrink justify-start gap-1 has-data-[icon=inline-start]:pl-2.5 has-data-[icon=inline-end]:pr-2.5"
            aria-label={`${current ? (currentTitle ?? "Chat") : "New chat"} · Chat history`}
          >
            <History
              data-icon="inline-start"
              className="text-foreground/70"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">
              {current ? shortTitle(currentTitle ?? "Chat") : "New chat"}
            </span>
            <ChevronDown
              data-icon="inline-end"
              className="text-muted-foreground"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={16}
          className="w-80 max-w-[calc(100vw-2rem)] gap-1.5"
          aria-labelledby={titleId}
        >
          <PopoverHeader className="-mx-2.5 gap-1.5">
            <PopoverTitle
              id={titleId}
              className="px-2.5 text-xs text-muted-foreground"
            >
              Recent chats
            </PopoverTitle>
            <Separator />
          </PopoverHeader>
          {chats.error && (
            <Alert variant="error">
              Could not {chats.data ? "refresh" : "load"} chats.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => chats.refetch()}
              >
                Retry
              </Button>
            </Alert>
          )}
          {!chats.data ? (
            !chats.error && (
              <div
                role="status"
                aria-label="Loading chats"
                className="flex flex-col gap-1"
              >
                <Skeleton className="h-6.5" />
                <Skeleton className="h-6.5" />
                <Skeleton className="h-6.5" />
              </div>
            )
          ) : chats.data.length ? (
            <ScrollArea className="-mx-2.5 min-w-0 [&_[data-slot=scroll-area-viewport]>div]:block! [&_[data-slot=scroll-area-viewport]]:max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-3.5rem))]">
              <nav aria-label="Past chats" className="flex flex-col gap-1 px-1">
                {chats.data.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex min-w-0 items-center gap-0.5"
                  >
                    <Button
                      size="sm"
                      variant={current === chat.id ? "secondary" : "ghost"}
                      className="h-6.5 min-w-0 flex-1 justify-start gap-1.5 border-0 px-1.5 has-data-[icon=inline-start]:pl-1.5"
                      asChild
                    >
                      <Link
                        to={`/assistant?chat=${chat.id}`}
                        aria-label={`${chat.title} · Last message ${relativeTime(chat.updated, now)}`}
                        aria-current={current === chat.id ? "page" : undefined}
                        onClick={(event) => {
                          if (
                            onSelect &&
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            !event.altKey
                          ) {
                            event.preventDefault();
                            onSelect(chat.id);
                          }
                          setOpen(false);
                        }}
                      >
                        <MessageSquare
                          data-icon="inline-start"
                          aria-hidden="true"
                          className="text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate font-normal">
                          {shortTitle(chat.title)}
                        </span>
                        {chat.status === "pending" && (
                          <Spinner aria-label="In progress" />
                        )}
                        <time
                          dateTime={chat.updated}
                          title={`Last message ${new Date(chat.updated).toLocaleString()}`}
                          className="shrink-0 text-xs font-normal text-muted-foreground"
                        >
                          <span aria-hidden="true">
                            {relativeTime(chat.updated, now, "compact")}
                          </span>
                          <span className="sr-only">
                            Last message {relativeTime(chat.updated, now)}
                          </span>
                        </time>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete chat: ${chat.title}`}
                      title={
                        chat.status === "pending"
                          ? "Wait for this chat to finish"
                          : "Delete chat"
                      }
                      disabled={chat.status === "pending"}
                      onClick={() => {
                        remove.reset();
                        setDeleting(chat);
                      }}
                    >
                      <Trash2
                        aria-hidden="true"
                        className="text-muted-foreground"
                      />
                    </Button>
                  </div>
                ))}
              </nav>
            </ScrollArea>
          ) : (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyDescription>No chats yet</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </PopoverContent>
      </Popover>
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
            trigger.current?.focus();
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
                if (deleting && !remove.isPending) remove.mutate(deleting.id);
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
