import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AgentContext,
  contextLabel,
  messageContext,
} from "@/components/agent/agent-context";
import { AgentHistory } from "@/components/agent/agent-history";
import { AgentReply } from "@/components/agent/agent-reply";
import { Alert } from "@/components/feedback";
import {
  ArrowUp,
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
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
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
import type {
  Analysis,
  Design,
  RunSummary,
  Settings,
  StudySummary,
} from "@/lib/types";

type Submission = { question: string; context: string };

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
  const [question, setQuestion] = useState<string>(() => {
    if (typeof location.state?.question === "string")
      return location.state.question;
    try {
      return sessionStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const composer = useRef<HTMLTextAreaElement>(null);
  const [draftUnavailable, setDraftUnavailable] = useState(false);
  useEffect(() => {
    try {
      if (question) sessionStorage.setItem(draftKey, question);
      else sessionStorage.removeItem(draftKey);
      setDraftUnavailable(false);
    } catch {
      setDraftUnavailable(true);
    }
  }, [draftKey, question]);
  const settings = useApi<Settings>("/settings");
  const plannerModel = settings.data?.planner_model ?? "";
  const assistantModel = settings.data?.assistant_model ?? "";
  const provider = (context === "new" ? plannerModel : assistantModel).split(
    ":",
  )[0];
  const unavailable = settings.data?.providers[provider] === false;
  const busy = messages.some((message) => message.status === "pending");
  const client = useQueryClient();
  const send = useMutation({
    mutationFn: (submission: Submission) =>
      api<{ id: string; chat_id: string }>("/chats", {
        ...submission,
        chat_id: chatId,
      }),
    onSuccess: (result, submitted) => {
      setQuestion((current) => (current === submitted.question ? "" : current));
      try {
        if (sessionStorage.getItem(draftKey) === submitted.question)
          sessionStorage.removeItem(draftKey);
      } catch {
        setDraftUnavailable(true);
      }
      client.invalidateQueries({ queryKey: ["/chats"] });
      client.invalidateQueries({ queryKey: [`/chats/${result.chat_id}`] });
      if (!chatId)
        setParams({ chat: result.chat_id }, { replace: true, state: null });
    },
  });
  function submit() {
    if (
      question.trim() &&
      !busy &&
      !send.isPending &&
      !unavailable &&
      settings.data
    )
      send.mutate({ question, context });
  }
  function changeContext(value: string) {
    const next = new URLSearchParams(params);
    next.set("context", value);
    setParams(next, { replace: true });
    send.reset();
  }
  const blocked = busy || send.isPending || !settings.data;
  const disabled = blocked || !!unavailable;
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
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 [&>div]:min-w-0 [&_strong]:block [&_strong]:truncate [&_strong]:text-sm [&_span]:mt-1 [&_span]:block [&_span]:text-xs [&_span]:text-muted-foreground">
        <div>
          <strong>
            {context === "new"
              ? "Experiment design"
              : (selectedStudy?.title ??
                selectedRun?.study_title ??
                "Research assistant")}
          </strong>
          {(selectedRun || selectedStudy) && (
            <span>
              {selectedRun
                ? `${selectedRun.condition} · seed ${selectedRun.seed} · ${selectedRun.turn} recorded decisions`
                : `${selectedStudy?.completed_runs} / ${selectedStudy?.run_count} runs complete`}
            </span>
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
            {context === "general" && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/agent?context=new">
                    Design an experiment
                    <ArrowUpRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/environments">Explore environments</Link>
                </Button>
              </div>
            )}
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
      <form
        aria-label="Agent composer"
        className="mx-auto w-full max-w-3xl shrink-0 p-4 sm:px-6 sm:pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="min-w-0">
          <InputGroup>
            <InputGroupTextarea
              ref={composer}
              aria-label="Message Agent"
              placeholder={
                context === "new"
                  ? "What behavior do you want to investigate?"
                  : selectedStudy || selectedRun
                    ? "Ask about the selected evidence…"
                    : "Ask a research question…"
              }
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={4000}
              rows={3}
              disabled={send.isPending}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <InputGroupAddon
              align="block-end"
              className="justify-between gap-3"
            >
              <AgentContext
                value={context}
                onChange={changeContext}
                studies={studies}
                runs={runs}
                disabled={send.isPending}
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                title="Send message (Enter)"
                disabled={disabled || !question.trim()}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
        {send.error && (
          <Alert variant="error">
            {send.error.message} Your message is kept above.
          </Alert>
        )}
        {settings.error && (
          <Alert variant="error">
            Could not check provider availability.{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => settings.refetch()}
            >
              Retry
            </Button>
          </Alert>
        )}
        {contextError && (
          <Alert variant="error">
            {contextError.message}
            <Button variant="outline" size="sm" onClick={retryContexts}>
              Retry
            </Button>
          </Alert>
        )}
        {draftUnavailable && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground [&_a]:underline [&_a]:underline-offset-4">
            This browser could not keep your message draft.
          </p>
        )}
        {unavailable && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground [&_a]:underline [&_a]:underline-offset-4">
            {provider === "openai" ? "OpenAI" : "Anthropic"} is required for
            this context. <Link to="/settings">Configure a provider</Link>
            {context === "new" && (
              <>
                {" "}
                or <Link to="/new">configure an experiment manually</Link>
              </>
            )}
            .
          </p>
        )}
      </form>
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
