import { History, SquarePen } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/lib/api";
import type { ChatSummary } from "@/lib/types";

export function AgentHistory() {
  const chats = useApi<ChatSummary[]>("/chats", true);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const current = params.get("chat") ?? "";
  return (
    <aside className="agent-history" aria-label="Chat history">
      <div className="agent-history-header">
        <h2>Chats</h2>
        <div className="mobile-chat-picker">
          <SelectRoot
            value={current}
            onValueChange={(id) => navigate(`/agent?chat=${id}`)}
            disabled={!chats.data?.length}
          >
            <SelectTrigger aria-label="Past chats">
              <History aria-hidden="true" />
              <SelectValue placeholder="Past chats">
                {chats.data?.find((chat) => chat.id === current)?.title ??
                  "Past chats"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectLabel>Past chats</SelectLabel>
                {chats.data?.map((chat) => (
                  <SelectItem key={chat.id} value={chat.id}>
                    {chat.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </SelectRoot>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="New chat"
          title="New chat"
          onClick={() => navigate(`/agent?new=${crypto.randomUUID()}`)}
        >
          <SquarePen aria-hidden="true" />
        </Button>
      </div>
      {chats.error ? (
        <div className="chat-history-note" role="alert">
          Could not load chats.
          <Button size="sm" variant="ghost" onClick={() => chats.refetch()}>
            Retry
          </Button>
        </div>
      ) : !chats.data ? (
        <p className="chat-history-note" role="status">
          Loading chats…
        </p>
      ) : !chats.data.length ? (
        <p className="chat-history-note">No chats yet.</p>
      ) : (
        <nav aria-label="Past chats" className="chat-history-list">
          <ul>
            {chats.data.map((chat) => (
              <li key={chat.id}>
                <Button variant="ghost" asChild className="chat-history-link">
                  <Link
                    to={`/agent?chat=${chat.id}`}
                    title={chat.title}
                    aria-current={current === chat.id ? "page" : undefined}
                  >
                    <span>{chat.title}</span>
                    {chat.status === "pending" && (
                      <span
                        className="chat-pending"
                        role="img"
                        aria-label="In progress"
                      />
                    )}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}
