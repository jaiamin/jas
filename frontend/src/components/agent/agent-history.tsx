import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompact } from "@/hooks/use-compact";
import { useApi } from "@/lib/api";
import type { ChatSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AgentHistory() {
  const chats = useApi<ChatSummary[]>("/chats", true);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const current = params.get("chat") ?? "";
  const compact = useCompact(1100);
  const [open, setOpen] = useState(false);
  function newChat() {
    setOpen(false);
    navigate(`/agent?new=${crypto.randomUUID()}`);
  }
  const content = (
    <>
      <SidebarHeader
        className={cn(
          "flex-row items-center justify-between px-4 py-3",
          compact && "pr-14",
        )}
      >
        <h2 className="text-sm font-medium">Conversations</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New chat"
          title="New chat"
          onClick={newChat}
        >
          <Plus />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {chats.error ? (
            <Alert variant="error">
              Could not load chats.
              <Button
                size="sm"
                variant="outline"
                onClick={() => chats.refetch()}
              >
                Retry
              </Button>
            </Alert>
          ) : !chats.data ? (
            <div
              className="flex flex-col gap-3 p-2"
              role="status"
              aria-label="Loading chats"
            >
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : !chats.data.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No chats yet</EmptyTitle>
                <EmptyDescription>
                  Start a conversation to design an experiment or explore
                  evidence.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <nav aria-label="Past chats">
              <SidebarMenu>
                {chats.data.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton asChild isActive={current === chat.id}>
                      <Link
                        to={`/agent?chat=${chat.id}`}
                        title={chat.title}
                        aria-current={current === chat.id ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <span>{chat.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {chat.status === "pending" && (
                      <SidebarMenuBadge role="img" aria-label="In progress">
                        …
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          )}
        </SidebarGroup>
      </SidebarContent>
    </>
  );
  if (compact)
    return (
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              Conversations
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col gap-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Agent conversations</SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New chat"
          onClick={newChat}
        >
          <Plus />
        </Button>
      </div>
    );
  return (
    <Sidebar
      collapsible="none"
      role="complementary"
      className="w-56 shrink-0 border-r"
      aria-label="Chat history"
    >
      {content}
    </Sidebar>
  );
}
