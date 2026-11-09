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
import { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert } from "@/components/feedback";
import {
  BookOpen,
  FlaskConical,
  GitCompareArrows,
  Plus,
  ScanLine,
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
import { agentSuggestions } from "@/lib/agent-suggestions";
import { api, useApi } from "@/lib/api";
import { chatProgress } from "@/lib/chat-progress";
import type { Analysis, Design, RunSummary, StudySummary } from "@/lib/types";

export default function AgentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chatId = params.get("chat");
  const path = `/chats/${chatId}`;
  const chat = useQuery({
    queryKey: [path],
    queryFn: () => api<Analysis[]>(path),
    enabled: !!chatId,
    refetchInterval: 1500,
  });
  const studies = useApi<StudySummary[]>("/studies");
  const runs = useApi<RunSummary[]>("/runs");
  const client = useQueryClient();
  const pending = chat.data?.find(
    (message) => message.status === "pending",
  )?.id;
  useEffect(() => {
    if (!chatId || !pending) return;
    const stream = new EventSource(`/api/chats/${chatId}/events`);
    stream.onmessage = (event) => {
      const update = chatProgress(event.data, pending);
      if (!update) {
        stream.close();
        return;
      }
      if (update.status !== "pending") {
        stream.close();
        client.invalidateQueries({ queryKey: [`/chats/${chatId}`] });
        client.invalidateQueries({ queryKey: ["/chats"] });
        return;
      }
      client.setQueryData<Analysis[]>([`/chats/${chatId}`], (messages) =>
        messages?.map((message) =>
          message.id === pending && message.status === "pending"
            ? {
                ...message,
                purpose: update.purpose,
                output: {
                  ...(update.purpose !== message.purpose ? {} : message.output),
                  partial: update.partial,
                  stage: update.stage,
                },
              }
            : message,
        ),
      );
    };
    // Polling keeps an interrupted connection recoverable without resubmitting a request.
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [chatId, pending, client]);
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-muted/50">
      <header className="flex shrink-0 items-center justify-end gap-2 py-3 pl-4 pr-2.5 sm:pl-6">
        <AgentHistory />
        {chatId && (
          <Button
            aria-label="New chat"
            onClick={() => navigate(`/agent?new=${crypto.randomUUID()}`)}
          >
            <Plus data-icon="inline-start" />
            New
          </Button>
        )}
      </header>
      <div className="min-h-0 min-w-0 flex-1">
        {chat.error ? (
          <div className="flex flex-col gap-4 p-6">
            <ErrorState error={chat.error} onRetry={chat.refetch} />
            <Button asChild variant="outline">
              <Link to="/agent">Start a new chat</Link>
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

function AgentConversation({
  chatId,
  messages,
  studies,
  runs,
  contextError,
  contextLoading,
  retryContexts,
}: {
  chatId: string | null;
  messages: Analysis[];
  studies: StudySummary[];
  runs: RunSummary[];
  contextLoading: boolean;
  contextError: Error | null;
  retryContexts: () => unknown;
}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const context =
    params.get("context") ??
    (messages.length
      ? messageContext(messages[messages.length - 1])
      : "general");
  const draftKey = `jas:agent-draft:${chatId ?? params.get("new") ?? "new"}`;
  const busy = messages.some((message) => message.status === "pending");
  const state = useAgentComposer({
    context,
    chatId,
    draftKey,
    busy,
    initialQuestion:
      typeof location.state?.question === "string"
        ? location.state.question
        : undefined,
    onSent: (result) => {
      // Lazy navigation can leave this composer mounted after the URL changes.
      if (
        !chatId &&
        window.location.pathname === location.pathname &&
        window.location.search === location.search
      )
        setParams({ chat: result.chat_id }, { replace: true, state: null });
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
    const next = new URLSearchParams(params);
    next.set("context", value);
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
      contextControl={
        <AgentContext
          value={context}
          onChange={changeContext}
          studies={studies}
          runs={runs}
          loading={contextLoading}
          disabled={state.send.isPending}
        />
      }
      placeholder={
        selectedStudy || selectedRun
          ? "Ask about the selected evidence…"
          : "Ask a question or describe an experiment…"
      }
      className={
        messages.length
          ? "mx-auto w-full max-w-3xl shrink-0 p-4 sm:px-6 sm:pb-6"
          : "w-full"
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
      aria-label="Agent workspace"
      data-empty={!messages.length}
    >
      {messages.length ? (
        <MessageScrollerProvider
          autoScroll={busy}
          defaultScrollPosition="last-anchor"
        >
          <MessageScroller className="flex-1">
            <MessageScrollerViewport aria-label="Agent conversation">
              <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
                {messages.flatMap((row) => [
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
                  <MessageScrollerItem key={row.id} messageId={row.id}>
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
                          context:
                            row.purpose === "design"
                              ? "new"
                              : messageContext(row),
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
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto_minmax(0,2fr)] overflow-y-auto px-4 py-8 sm:px-6">
          <div className="row-start-2 mx-auto flex w-full max-w-3xl flex-col gap-6">
            <AgentWelcomeHeading />
            {composer}
          </div>
          <div className="row-start-3 mx-auto w-full max-w-3xl pt-6">
            <AgentSuggestions
              context={context}
              contextLoading={contextLoading}
              studies={studies}
              runs={runs}
              onChoose={chooseSuggestion}
            />
          </div>
        </div>
      )}
      {messages.length > 0 && composer}
    </section>
  );
}

function AgentSuggestions({
  context,
  contextLoading,
  studies,
  runs,
  onChoose,
}: {
  context: string;
  contextLoading: boolean;
  studies: StudySummary[];
  runs: RunSummary[];
  onChoose: (text: string) => void;
}) {
  const [kind, id] = context.split(":");
  const study = studies.find((item) => kind === "study" && item.id === id);
  const run = runs.find((item) => kind === "run" && item.id === id);
  const scoped = !!id && (kind === "study" || kind === "run");
  const path = kind === "run" ? `/runs/${id}` : `/studies/${id}`;
  const protocol = useQuery({
    queryKey: [path],
    queryFn: () => api<{ design: Design }>(path),
    enabled: scoped,
  });
  if (protocol.error)
    return <ErrorState error={protocol.error} onRetry={protocol.refetch} />;
  if (scoped && (contextLoading || !protocol.data))
    return (
      <div
        role="status"
        aria-label="Loading suggested questions"
        className="flex flex-wrap justify-center gap-2"
      >
        <Skeleton className="h-8 w-52 max-w-full" />
        <Skeleton className="h-8 w-44 max-w-full" />
        <Skeleton className="h-8 w-48 max-w-full" />
      </div>
    );
  const suggestions = agentSuggestions({
    context,
    study,
    run,
    runs,
    design: protocol.data?.design,
  });
  if (!suggestions.length) return null;
  return (
    <section
      aria-label="Suggested questions"
      className="mx-auto flex w-full flex-wrap justify-center gap-2"
    >
      {suggestions.map(({ title, prompt }, index) => {
        const Icon = [BookOpen, GitCompareArrows, ScanLine, FlaskConical][
          index
        ];
        return (
          <Button
            variant="outline"
            className="h-auto min-h-8 max-w-full whitespace-normal text-left"
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
