import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { useAgentChat } from "@/components/agent/use-agent-chat";
import { AgentIcon } from "@/components/icons";
import { ErrorState, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Conversation = lazy(() =>
  import("@/pages/agent").then((module) => ({
    default: module.AgentConversation,
  })),
);

export function AssistantPanel({
  context,
  revision,
  throughTurn,
}: {
  context: string;
  revision: number;
  throughTurn?: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <AgentIcon data-icon="inline-start" />
          Ask about this
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="pr-12">
          <SheetTitle>Assistant</SheetTitle>
          <SheetDescription>
            Version {revision}
            {throughTurn !== undefined
              ? ` · evidence through turn ${throughTurn}`
              : " · selected experiment"}
          </SheetDescription>
        </SheetHeader>
        <Suspense fallback={<Loading />}>
          <PanelConversation
            key={`${context}:${revision}`}
            context={context}
            revision={revision}
            throughTurn={throughTurn}
          />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}

function PanelConversation({
  context,
  revision,
  throughTurn,
}: {
  context: string;
  revision: number;
  throughTurn?: number;
}) {
  const storageKey = `jas:assistant-panel:${context}:${revision}`;
  const identityKey = ["assistant-panel-chat", storageKey];
  const client = useQueryClient();
  const identity = useQuery<string | null>({
    queryKey: identityKey,
    queryFn: async () => localStorage.getItem(storageKey),
    staleTime: Infinity,
    initialData: () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
  });
  const chatId = identity.data ?? null;
  const [draftId] = useState(() => `panel:${context}:${revision}`);
  const [storageError, setStorageError] = useState(false);
  const chat = useAgentChat(chatId);
  const scope = {
    revision,
    ...(throughTurn !== undefined ? { through_turn: throughTurn } : {}),
  };
  if (chat.error)
    return (
      <div className="p-4">
        <ErrorState error={chat.error} onRetry={chat.refetch} />
      </div>
    );
  if (chatId && !chat.data) return <Loading />;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {chatId && (
        <div className="px-4 pb-2 text-xs">
          <Link
            className="underline underline-offset-4"
            to={`/assistant?${new URLSearchParams({ chat: chatId, context, revision: String(revision), ...(throughTurn !== undefined ? { through_turn: String(throughTurn) } : {}) })}`}
          >
            Open conversation in Assistant
          </Link>
        </div>
      )}
      {storageError && (
        <p role="status" className="px-4 text-xs text-muted-foreground">
          This browser could not remember the panel. Open the conversation in
          Assistant to keep its link.
        </p>
      )}
      <Conversation
        chatId={chatId}
        messages={chat.data ?? []}
        studies={[]}
        runs={[]}
        contextLoading={false}
        contextError={null}
        retryContexts={() => {}}
        pinnedContext={context}
        scope={scope}
        draftId={draftId}
        embedded
        onChatCreated={() => {}}
        onChatRecorded={(id) => {
          // Mutation settlement survives closing the panel while Send is pending.
          client.setQueryData(identityKey, id);
          try {
            localStorage.setItem(storageKey, id);
          } catch {
            setStorageError(true);
          }
        }}
      />
    </div>
  );
}
