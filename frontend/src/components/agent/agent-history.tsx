import { useQuery } from "@tanstack/react-query";
import { type Ref, useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { ChevronDown, History, MessageSquare } from "@/components/icons";
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
import { cn } from "@/lib/utils";

function shortTitle(title: string) {
  return title.length > 40 ? `${title.slice(0, 40).trimEnd()}…` : title;
}

export function AgentHistory({
  ref,
  className,
  currentChat,
  currentTitle,
  onSelect,
}: {
  ref?: Ref<HTMLButtonElement>;
  className?: string;
  currentChat?: string | null;
  currentTitle?: string;
  onSelect?: (id: string) => void;
}) {
  const now = useNow();
  const [open, setOpen] = useState(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="default"
          className={cn(
            "-ml-2.5 h-7 min-w-0 max-w-full shrink justify-start gap-1 has-data-[icon=inline-start]:pl-2.5 has-data-[icon=inline-end]:pr-2.5",
            className,
          )}
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
                <Button
                  key={chat.id}
                  size="sm"
                  variant={current === chat.id ? "secondary" : "ghost"}
                  className="h-6.5 w-full min-w-0 justify-start gap-1.5 border-0 px-1.5 has-data-[icon=inline-start]:pl-1.5"
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
  );
}
