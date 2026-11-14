import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { AgentHistory } from "@/components/agent/agent-history";
import {
  type AssistantPageContext,
  recordAssistantChat,
} from "@/components/agent/assistant-workspace";
import { useAgentChat } from "@/components/agent/use-agent-chat";
import { Maximize, PanelRightClose, SquarePen } from "@/components/icons";
import { ErrorState, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useApi } from "@/lib/api";
import type { RunSummary, StudySummary } from "@/lib/types";

const Conversation = lazy(() =>
  import("@/pages/agent").then((module) => ({
    default: module.AgentConversation,
  })),
);

type Identity = { chatId: string | null; draftId: string };

export function AssistantPanel({
  pageContext,
  onClose,
}: {
  pageContext: AssistantPageContext | null;
  onClose: () => void;
}) {
  const slot = pageContext
    ? `${pageContext.context}:${pageContext.revision}`
    : "general";
  return (
    <PanelConversation
      key={slot}
      slot={slot}
      pageContext={pageContext}
      onClose={onClose}
    />
  );
}

function PanelConversation({
  slot,
  pageContext,
  onClose,
}: {
  slot: string;
  pageContext: AssistantPageContext | null;
  onClose: () => void;
}) {
  const storageKey = `jas:assistant-panel:${slot}`;
  const identityKey = ["assistant-panel-chat", storageKey];
  const client = useQueryClient();
  function remembered(): Identity {
    let chatId = null;
    let draftId = `panel:${slot}`;
    try {
      chatId = localStorage.getItem(storageKey);
      draftId = sessionStorage.getItem(`${storageKey}:draft`) ?? draftId;
    } catch {
      /* In-memory identity still works. */
    }
    return { chatId, draftId };
  }
  const identity = useQuery({
    queryKey: identityKey,
    queryFn: async () => remembered(),
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: remembered,
  }).data;
  const { chatId, draftId } = identity;
  const [contextValue, setContextValue] = useState(() => {
    try {
      return (
        sessionStorage.getItem(`${storageKey}:context-choice`) ??
        pageContext?.context ??
        "general"
      );
    } catch {
      return pageContext?.context ?? "general";
    }
  });
  function changeContext(value: string) {
    setContextValue(value);
    try {
      sessionStorage.setItem(`${storageKey}:context-choice`, value);
    } catch {
      setStorageError(true);
    }
  }
  const [storageError, setStorageError] = useState(false);
  const chat = useAgentChat(chatId);
  const studies = useApi<StudySummary[]>("/studies");
  const runs = useApi<RunSummary[]>("/runs");
  const study = studies.data?.find(
    (record) => contextValue === `study:${record.id}`,
  );
  const run = runs.data?.find((record) => contextValue === `run:${record.id}`);
  const context =
    contextValue === pageContext?.context
      ? pageContext
      : study
        ? {
            context: contextValue,
            title: study.title,
            revision: study.revision,
          }
        : run
          ? {
              context: contextValue,
              title: run.study_title,
              revision: run.revision,
              throughTurn: run.turn,
            }
          : null;
  const scope = context
    ? {
        revision: context.revision,
        ...(context.throughTurn !== undefined
          ? { through_turn: context.throughTurn }
          : {}),
      }
    : undefined;
  const focusParams = new URLSearchParams({
    ...(chatId ? { chat: chatId } : { new: draftId }),
    context: contextValue,
    ...(scope ? { revision: String(scope.revision) } : {}),
    ...(scope?.through_turn !== undefined
      ? { through_turn: String(scope.through_turn) }
      : {}),
  });
  function select(next: Identity) {
    client.setQueryData(identityKey, next);
    try {
      sessionStorage.setItem(`${storageKey}:draft`, next.draftId);
      if (next.chatId) localStorage.setItem(storageKey, next.chatId);
      else localStorage.removeItem(storageKey);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <>
      <header className="flex h-(--workspace-header-height) shrink-0 items-center gap-0.5 border-b px-4">
        <h2 id="assistant-panel-title" className="sr-only">
          Assistant
        </h2>
        <div className="mr-auto flex min-w-0 flex-1 items-center pr-2">
          <AgentHistory
            currentChat={chatId}
            currentTitle={chat.data?.[0]?.question}
            onSelect={(id) =>
              select({ chatId: id, draftId: crypto.randomUUID() })
            }
          />
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label="Open in Assistant"
          title="Open in Assistant"
        >
          <Link
            to={`/assistant?${focusParams}`}
            state={{ assistantSession: { slot, chatId, draftId } }}
          >
            <Maximize aria-hidden="true" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New chat"
          title="New chat"
          onClick={() => select({ chatId: null, draftId: crypto.randomUUID() })}
        >
          <SquarePen aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close Assistant"
          title="Close Assistant"
          onClick={onClose}
        >
          <PanelRightClose aria-hidden="true" />
        </Button>
      </header>
      {storageError && (
        <p role="status" className="px-4 pt-3 text-xs text-muted-foreground">
          This browser could not remember the conversation. Open in Assistant to
          keep its link.
        </p>
      )}
      <div className="min-h-0 flex-1">
        {chat.error ? (
          <div className="p-4">
            <ErrorState error={chat.error} onRetry={chat.refetch} />
          </div>
        ) : chatId && !chat.data ? (
          <Loading />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spinner aria-label="Loading Assistant" />
              </div>
            }
          >
            <Conversation
              key={chatId ?? draftId}
              chatId={chatId}
              messages={chat.data ?? []}
              studies={studies.data ?? []}
              runs={runs.data ?? []}
              contextLoading={studies.isPending || runs.isPending}
              contextError={studies.error ?? runs.error}
              retryContexts={() =>
                Promise.all(
                  [studies, runs]
                    .filter((query) => query.error)
                    .map((query) => query.refetch()),
                )
              }
              pinnedContext={contextValue}
              onContextChange={changeContext}
              contextTitle={
                contextValue.startsWith("study:") ? context?.title : undefined
              }
              scope={scope}
              draftId={draftId}
              embedded
              onChatCreated={() => {}}
              onChatRecorded={(id) => {
                try {
                  recordAssistantChat(client, { slot, chatId, draftId }, id);
                } catch {
                  setStorageError(true);
                }
              }}
            />
          </Suspense>
        )}
      </div>
    </>
  );
}
