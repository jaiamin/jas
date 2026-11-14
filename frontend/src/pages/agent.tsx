import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { AgentComposer } from "@/components/agent/agent-composer";
import {
  AgentContext,
  contextLabel,
  messageContext,
} from "@/components/agent/agent-context";
import { AgentHistory } from "@/components/agent/agent-history";
import { AgentReply } from "@/components/agent/agent-reply";
import { AgentWelcomeHeading } from "@/components/agent/agent-welcome-heading";
import {
  type AssistantSession,
  recordAssistantChat,
} from "@/components/agent/assistant-workspace";
import { useAgentChat } from "@/components/agent/use-agent-chat";
import { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert } from "@/components/feedback";
import {
  BookOpen,
  FileSearch,
  FlaskConical,
  GitCompareArrows,
  PenLine,
  ScanLine,
  SquarePen,
} from "@/components/icons";
import { ErrorState } from "@/components/shared";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AgentSuggestion,
  agentSuggestions,
} from "@/lib/agent-suggestions";
import { api, useApi } from "@/lib/api";
import type { Analysis, Design, RunSummary, StudySummary } from "@/lib/types";

const suggestionIcons = {
  design: FlaskConical,
  review: FileSearch,
  compare: GitCompareArrows,
  plan: PenLine,
  measure: ScanLine,
  summarize: ScanLine,
  trace: ScanLine,
  learn: BookOpen,
} satisfies Record<AgentSuggestion["action"], typeof BookOpen>;

const suggestionClassName =
  "mx-auto flex w-full flex-wrap justify-center gap-2";

export default function AgentPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const location = useLocation();
  const session = location.state?.assistantSession as
    | AssistantSession
    | undefined;
  const [params, setParams] = useSearchParams();
  const panelIdentity = useQuery<{ chatId: string | null; draftId: string }>({
    queryKey: [
      "assistant-panel-chat",
      session ? `jas:assistant-panel:${session.slot}` : null,
    ],
    enabled: false,
    initialData: session
      ? () => {
          try {
            return {
              chatId: localStorage.getItem(
                `jas:assistant-panel:${session.slot}`,
              ),
              draftId: session.draftId,
            };
          } catch {
            return { chatId: session.chatId, draftId: session.draftId };
          }
        }
      : undefined,
  });
  const recordedChat =
    panelIdentity.data?.draftId === session?.draftId
      ? panelIdentity.data?.chatId
      : null;
  const chatId = params.get("chat") ?? recordedChat ?? null;
  useEffect(() => {
    if (
      location.pathname !== "/assistant" ||
      params.has("chat") ||
      !recordedChat
    )
      return;
    const next = new URLSearchParams(params);
    next.delete("new");
    next.set("chat", recordedChat);
    setParams(next, { replace: true, state: location.state });
  }, [recordedChat, params, setParams, location.pathname, location.state]);
  const chat = useAgentChat(chatId);
  const studies = useApi<StudySummary[]>("/studies");
  const runs = useApi<RunSummary[]>("/runs");
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-muted/50">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <h1 className="sr-only">Assistant</h1>
        <AgentHistory
          currentChat={chatId}
          currentTitle={chat.data?.[0]?.question}
          onDeleted={(id) => {
            if (chatId === id)
              navigate(`/assistant?new=${crypto.randomUUID()}`, {
                replace: true,
              });
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New chat"
          title="New chat"
          onClick={() => navigate(`/assistant?new=${crypto.randomUUID()}`)}
        >
          <SquarePen aria-hidden="true" />
        </Button>
      </header>
      <div className="min-h-0 min-w-0 flex-1">
        {chat.error ? (
          <div className="flex flex-col gap-4 p-6">
            <ErrorState error={chat.error} onRetry={chat.refetch} />
            <Button asChild variant="outline">
              <Link to="/assistant">Start a new chat</Link>
            </Button>
          </div>
        ) : chatId && !chat.data ? (
          <div
            role="status"
            aria-label="Loading conversation"
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6"
          >
            <Skeleton className="ml-auto h-12 w-2/3" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : (
          <AgentConversation
            key={chatId ?? params.get("new") ?? "new"}
            chatId={chatId}
            onChatRecorded={
              session
                ? (id) => {
                    try {
                      recordAssistantChat(client, session, id);
                    } catch {
                      /* The focused conversation has a durable URL. */
                    }
                  }
                : undefined
            }
            scope={
              params.has("revision")
                ? {
                    revision: Number(params.get("revision")),
                    ...(params.has("through_turn")
                      ? { through_turn: Number(params.get("through_turn")) }
                      : {}),
                  }
                : undefined
            }
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
          />
        )}
      </div>
    </div>
  );
}

export function AgentConversation({
  chatId,
  messages,
  studies,
  runs,
  contextError,
  contextLoading,
  retryContexts,
  pinnedContext,
  onContextChange,
  contextTitle,
  scope,
  onChatCreated,
  onChatRecorded,
  draftId,
  embedded = false,
}: {
  chatId: string | null;
  messages: Analysis[];
  studies: StudySummary[];
  runs: RunSummary[];
  contextLoading: boolean;
  contextError: Error | null;
  retryContexts: () => unknown;
  pinnedContext?: string;
  onContextChange?: (value: string) => void;
  contextTitle?: string;
  scope?: { revision: number; through_turn?: number };
  onChatCreated?: (id: string) => void;
  onChatRecorded?: (id: string) => void;
  draftId?: string;
  embedded?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const context =
    pinnedContext ??
    params.get("context") ??
    (messages.length
      ? messageContext(messages[messages.length - 1])
      : "general");
  const draftKey = `jas:agent-draft:${chatId ?? draftId ?? params.get("new") ?? "new"}`;
  const busy =
    messages.some((message) => message.status === "pending") ||
    (embedded && context !== "general" && contextLoading);
  const state = useAgentComposer({
    context,
    chatId,
    draftKey,
    busy,
    scope,
    onCreated: onChatRecorded
      ? (result) => onChatRecorded(result.chat_id)
      : undefined,
    initialQuestion:
      !embedded && typeof location.state?.question === "string"
        ? location.state.question
        : undefined,
    onSent: (result) => {
      if (onChatCreated) {
        onChatCreated(result.chat_id);
        return;
      }
      // Lazy navigation can leave this composer mounted after the URL changes.
      if (
        !chatId &&
        window.location.pathname === location.pathname &&
        window.location.search === location.search
      )
        setParams(
          {
            chat: result.chat_id,
            ...(scope
              ? {
                  context,
                  revision: String(scope.revision),
                  ...(scope.through_turn !== undefined
                    ? { through_turn: String(scope.through_turn) }
                    : {}),
                }
              : {}),
          },
          { replace: true, state: null },
        );
    },
  });
  const {
    chooseSuggestion,
    settings,
    plannerModel,
    assistantModel,
    send,
    blocked,
  } = state;
  function changeContext(value: string) {
    if (onContextChange) {
      onContextChange(value);
      send.reset();
      return;
    }
    const next = new URLSearchParams(params);
    next.set("context", value);
    next.delete("revision");
    next.delete("through_turn");
    setParams(next, { replace: true });
    send.reset();
  }
  const selectedStudy = studies.find(
    (study) => context === `study:${study.id}`,
  );
  const selectedRun = runs.find((run) => context === `run:${run.id}`);
  const composer = (
    <AgentComposer
      state={state}
      compact={embedded || messages.length > 0}
      contextControl={
        <AgentContext
          value={context}
          onChange={changeContext}
          studies={studies}
          runs={runs}
          loading={contextLoading}
          disabled={state.send.isPending}
          scope={scope}
          contextTitle={contextTitle}
        />
      }
      placeholder={
        pinnedContext && pinnedContext !== "general"
          ? "Ask about this evidence…"
          : selectedStudy || selectedRun
            ? "Ask about the selected evidence…"
            : "Ask a question or describe an experiment…"
      }
      className={
        embedded
          ? "relative mx-auto w-full shrink-0 px-4 pb-4 pt-3"
          : "relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 pt-3 sm:px-6 sm:pb-6"
      }
    >
      {contextError && (
        <Alert variant="error">
          {contextError.message}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retryContexts}
          >
            Retry
          </Button>
        </Alert>
      )}
    </AgentComposer>
  );
  return (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-label="Assistant workspace"
      data-empty={!messages.length}
    >
      {messages.length ? (
        <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
          <MessageScroller className="flex-1">
            <MessageScrollerViewport
              aria-label="Assistant conversation"
              className="[--scroll-fade-size:0.75rem]"
            >
              <MessageScrollerContent
                className={
                  embedded
                    ? "mx-auto w-full px-4 pt-4 pb-6"
                    : "mx-auto w-full max-w-3xl px-4 pt-4 pb-6 sm:px-6"
                }
              >
                {messages.flatMap((row, index) => [
                  <MessageScrollerItem
                    key={`${row.id}-question`}
                    messageId={`${row.id}-question`}
                    scrollAnchor
                  >
                    <Message align="end">
                      <MessageContent>
                        <Bubble variant="outline" align="end">
                          <BubbleContent>{row.question}</BubbleContent>
                        </Bubble>
                        {(row.run_id || row.study_id) && (
                          <MessageFooter>
                            {contextLabel(messageContext(row), studies, runs)}
                          </MessageFooter>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>,
                  <MessageScrollerItem
                    key={row.id}
                    messageId={row.id}
                    id={row.id}
                    className={
                      index === messages.length - 1
                        ? "pl-1 [content-visibility:visible]"
                        : "pl-1"
                    }
                  >
                    <AgentReply
                      row={row}
                      disabled={
                        blocked ||
                        settings.data?.providers[
                          row.purpose === "design"
                            ? plannerModel.split(":")[0]
                            : assistantModel.split(":")[0]
                        ] === false
                      }
                      onRetry={() =>
                        send.mutate({
                          question: row.question,
                          ...(messageContext(row) === context ? scope : {}),
                          context:
                            row.purpose === "design"
                              ? "new"
                              : messageContext(row),
                          ...(row.output?.lens
                            ? { lens: row.output.lens.key }
                            : {}),
                          ...(row.output?.source_analysis_id
                            ? {
                                source_analysis_id:
                                  row.output.source_analysis_id,
                              }
                            : {}),
                        })
                      }
                      onReanalyze={(lens) =>
                        send.mutate({
                          question: `Reanalyze the same frozen evidence using the ${lens} lens. Give a concise behavioral account and assess its limits.`,
                          context: messageContext(row),
                          source_analysis_id: row.id,
                          ...(messageContext(row) === context ? scope : {}),
                          lens,
                        })
                      }
                    />
                  </MessageScrollerItem>,
                ])}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      ) : (
        <div
          className={
            embedded
              ? "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-3 pt-8"
              : "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-3 pt-8 sm:px-6"
          }
        >
          <div className="mx-auto mt-auto flex w-full max-w-3xl shrink-0 flex-col gap-5">
            <AgentWelcomeHeading compact={embedded} />
            <AgentSuggestions
              context={context}
              scope={scope}
              compact={embedded}
              contextLoading={contextLoading}
              studies={studies}
              runs={runs}
              onChoose={chooseSuggestion}
            />
          </div>
        </div>
      )}
      {composer}
    </section>
  );
}

function AgentSuggestions({
  context,
  contextLoading,
  studies,
  runs,
  onChoose,
  scope,
  compact = false,
}: {
  context: string;
  contextLoading: boolean;
  studies: StudySummary[];
  runs: RunSummary[];
  onChoose: (text: string) => void;
  scope?: { revision: number; through_turn?: number };
  compact?: boolean;
}) {
  const [kind, id] = context.split(":");
  const study = studies.find((item) => kind === "study" && item.id === id);
  const run = runs.find((item) => kind === "run" && item.id === id);
  const scoped = !!id && (kind === "study" || kind === "run");
  const path =
    kind === "run"
      ? `/runs/${id}`
      : `/studies/${id}${scope ? `?revision=${scope.revision}` : ""}`;
  const protocol = useQuery({
    queryKey: [path],
    queryFn: () => api<{ design: Design; runs?: RunSummary[] }>(path),
    enabled: scoped,
  });
  if (protocol.error)
    return <ErrorState error={protocol.error} onRetry={protocol.refetch} />;
  if (scoped && (contextLoading || !protocol.data))
    return (
      <div
        role="status"
        aria-label="Loading suggested questions"
        className={suggestionClassName}
      >
        <Skeleton className="h-8 w-40 max-w-full" />
        <Skeleton className="h-8 w-32 max-w-full" />
        <Skeleton className="h-8 w-36 max-w-full" />
        <Skeleton className="h-8 w-32 max-w-full" />
      </div>
    );
  const suggestions = agentSuggestions({
    context,
    study:
      study && scope
        ? {
            ...study,
            revision: scope.revision,
            title: protocol.data?.design.title ?? study.title,
            question: protocol.data?.design.question ?? study.question,
            completed_runs:
              protocol.data?.runs?.filter((run) => run.status === "complete")
                .length ?? 0,
          }
        : study,
    run:
      run && scope
        ? {
            ...run,
            revision: scope.revision,
            turn: scope.through_turn ?? run.turn,
          }
        : run,
    runs,
    design: protocol.data?.design,
  });
  if (!suggestions.length) return null;
  return (
    <section
      aria-label="Suggested questions"
      className={
        compact ? "flex flex-col items-start gap-2 pl-4" : suggestionClassName
      }
    >
      {suggestions.map(({ title, prompt, action }) => {
        const Icon = suggestionIcons[action];
        return (
          <Button
            variant={compact ? "ghost" : "outline"}
            className={
              compact
                ? "-ml-2.5 max-w-full justify-start whitespace-normal text-left text-muted-foreground hover:bg-transparent hover:text-foreground"
                : "max-w-full whitespace-normal text-left"
            }
            key={title}
            onClick={() => onChoose(prompt)}
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            <span>{title}</span>
          </Button>
        );
      })}
    </section>
  );
}
