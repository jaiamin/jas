import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { History, MessageSquare } from "@/components/icons";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/use-now";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { ChatSummary } from "@/lib/types";

export function AgentHistory() {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const [params] = useSearchParams();
  const current = params.get("chat");
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
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Chat history"
          title="Chat history"
        >
          <History aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-80 max-w-[calc(100vw-2rem)]"
        aria-labelledby={titleId}
      >
        <PopoverHeader>
          <PopoverTitle id={titleId}>Recent chats</PopoverTitle>
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
              className="flex flex-col gap-2"
            >
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          )
        ) : chats.data.length ? (
          <ScrollArea className="-mx-1 min-w-0 [&_[data-slot=scroll-area-viewport]>div]:block! [&_[data-slot=scroll-area-viewport]]:max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-3.5rem))]">
            <nav aria-label="Past chats" className="flex flex-col gap-1 px-1">
              {chats.data.map((chat) => (
                <Button
                  key={chat.id}
                  variant={current === chat.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link
                    to={`/agent?chat=${chat.id}`}
                    title={chat.title}
                    aria-current={current === chat.id ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <MessageSquare
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {chat.title}
                    </span>
                    <time
                      dateTime={chat.updated}
                      title={`Last message ${new Date(chat.updated).toLocaleString()}`}
                      className="shrink-0 text-xs font-normal text-muted-foreground"
                    >
                      {relativeTime(chat.updated, now)}
                    </time>
                    {chat.status === "pending" && (
                      <Spinner aria-label="In progress" />
                    )}
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
