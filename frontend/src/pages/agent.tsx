import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AgentComposer } from "@/components/agent/agent-composer";
import { contextLabel, messageContext } from "@/components/agent/agent-context";
import { AgentHistory } from "@/components/agent/agent-history";
import { AgentReply } from "@/components/agent/agent-reply";
import { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert } from "@/components/feedback";
import {
  AgentIcon,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  GitCompareArrows,
  ScanLine,
} from "@/components/icons";
import { ErrorState, Loading } from "@/components/shared";
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
import { agentSuggestions } from "@/lib/agent-suggestions";
import { api, useApi } from "@/lib/api";
import { chatProgress } from "@/lib/chat-progress";
import type { Analysis, Design, RunSummary, StudySummary } from "@/lib/types";

export default function AgentPage() {
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
                output: {
                  ...message.output,
                  ...(update.partial === undefined
                    ? {}
                    : { partial: update.partial }),
                  ...(update.stage === undefined
                    ? {}
                    : { stage: update.stage }),
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
    <div className="flex h-full min-h-0 min-w-0 flex-col min-[1100px]:flex-row">
      <AgentHistory />
      <div className="min-h-0 min-w-0 flex-1">
        {chat.error ? (
          <div className="flex flex-col gap-4 p-6">
            <ErrorState error={chat.error} onRetry={chat.refetch} />
            <Button asChild variant="outline">
              <Link to="/agent">Start a new chat</Link>
            </Button>
          </div>
        ) : chatId && !chat.data ? (
          <Loading />
        ) : (
          <AgentConversation
            key={chatId ?? params.get("new") ?? "new"}
            chatId={chatId}
            messages={chat.data ?? []}
            studies={studies.data ?? []}
            runs={runs.data ?? []}
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
  retryContexts,
}: {
  chatId: string | null;
  messages: Analysis[];
  studies: StudySummary[];
  runs: RunSummary[];
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
      if (!chatId)
        setParams({ chat: result.chat_id }, { replace: true, state: null });
    },
  });
  const {
    setQuestion,
    composer,
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
  return (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-label="Agent workspace"
      data-empty={!messages.length}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AgentIcon className="size-4 shrink-0" aria-hidden="true" />
            Agent
          </div>
          {(selectedRun || selectedStudy) && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {selectedRun
                ? `${selectedRun.study_title} · ${selectedRun.condition} · seed ${selectedRun.seed} · ${selectedRun.turn} recorded decisions`
                : `${selectedStudy?.title} · ${selectedStudy?.completed_runs} / ${selectedStudy?.run_count} runs complete`}
            </p>
          )}
        </div>
        {(selectedStudy || selectedRun) && (
          <Button variant="outline" size="sm" asChild>
            <Link
              to={
                selectedRun
                  ? `/runs/${selectedRun.id}`
                  : `/studies/${selectedStudy?.id}`
              }
            >
              View {selectedRun ? "run" : "experiment"}
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </header>
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
                          context: messageContext(row),
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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6">
          <div className="mx-auto mt-auto w-full max-w-xl text-center [&_p]:mt-3 [&_p]:text-muted-foreground [&_p]:leading-relaxed">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {context === "new"
                ? "What would you like to test?"
                : context === "general"
                  ? "What can we explore?"
                  : "What does the evidence show?"}
            </h1>
            <p>
              {context === "new"
                ? "Describe the behavior you want to understand. We’ll work out the controls, measurements and limits."
                : context === "general"
                  ? "Turn a question into a controlled experiment, or connect a run to understand what happened."
                  : "Separate what agents did from what they said. Compare outcomes, inspect decisions and choose your next test."}
            </p>
          </div>
          <AgentSuggestions
            context={context}
            studies={studies}
            runs={runs}
            onChoose={(text) => {
              setQuestion(text);
              composer.current?.focus();
            }}
          />
        </div>
      )}
      <AgentComposer
        state={state}
        context={context}
        studies={studies}
        runs={runs}
        onContextChange={changeContext}
        placeholder={
          context === "new"
            ? "What behavior do you want to investigate?"
            : selectedStudy || selectedRun
              ? "Ask about the selected evidence…"
              : "Ask a research question…"
        }
        className="mx-auto w-full max-w-3xl shrink-0 p-4 sm:px-6 sm:pb-6"
      >
        {contextError && (
          <Alert variant="error">
            {contextError.message}
            <Button variant="outline" size="sm" onClick={retryContexts}>
              Retry
            </Button>
          </Alert>
        )}
      </AgentComposer>
    </section>
  );
}

function AgentSuggestions({
  context,
  studies,
  runs,
  onChoose,
}: {
  context: string;
  studies: StudySummary[];
  runs: RunSummary[];
  onChoose: (text: string) => void;
}) {
  const [kind, id] = context.split(":");
  const study = studies.find((item) => kind === "study" && item.id === id);
  const run = runs.find((item) => kind === "run" && item.id === id);
  const path = kind === "run" ? `/runs/${id}` : `/studies/${id}`;
  const protocol = useQuery({
    queryKey: [path],
    queryFn: () => api<{ design: Design }>(path),
    enabled: !!(study || run),
  });
  if (protocol.error)
    return <ErrorState error={protocol.error} onRetry={protocol.refetch} />;
  if ((study || run) && !protocol.data) return <Loading />;
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
      className="mx-auto mt-6 mb-auto flex w-full max-w-xl flex-wrap justify-center gap-2"
    >
      {suggestions.map(({ title, prompt }, index) => {
        const Icon = [BookOpen, GitCompareArrows, ScanLine, FlaskConical][
          index
        ];
        return (
          <Button
            variant="outline"
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
