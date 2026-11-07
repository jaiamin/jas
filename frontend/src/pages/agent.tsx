import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  GitCompareArrows,
  ScanLine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AgentContext,
  contextLabel,
  messageContext,
} from "@/components/agent/agent-context";
import { AgentHistory } from "@/components/agent/agent-history";
import { AgentReply } from "@/components/agent/agent-reply";
import { ErrorState, Loading } from "@/components/shared";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
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
    <div className="agent-layout">
      <AgentHistory />
      <div className="agent-canvas">
        {chat.error ? (
          <div className="agent-load-state">
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
    params.get("scope") ??
    (params.get("mode") === "create"
      ? "new"
      : messages.length
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
  const plannerModel = settings.data?.planner_model ?? "openai:gpt-6.1-sol";
  const provider = context === "new" ? plannerModel.split(":")[0] : "openai";
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
    next.delete("mode");
    next.delete("scope");
    next.set("context", value);
    setParams(next, { replace: true });
    send.reset();
  }
  const blocked = busy || send.isPending || !settings.data;
  const disabled = blocked || !!unavailable;
  return (
    <section
      className="agent-workspace"
      aria-label="Agent workspace"
      data-empty={!messages.length}
    >
      {messages.length ? (
        <MessageScrollerProvider
          autoScroll={busy}
          defaultScrollPosition="last-anchor"
        >
          <MessageScroller>
            <MessageScrollerViewport aria-label="Agent conversation">
              <MessageScrollerContent className="research-thread">
                {messages.flatMap((row) => [
                  <MessageScrollerItem
                    key={`${row.id}-question`}
                    messageId={`${row.id}-question`}
                    scrollAnchor
                  >
                    <Message align="end">
                      <MessageContent>
                        <Bubble variant="muted" align="end">
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
                            : "openai"
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
        <div className="agent-empty-content">
          <div className="agent-welcome">
            <h1>
              {context === "new"
                ? "What would you like to test?"
                : context === "general"
                  ? "What can we explore?"
                  : "What does the evidence show?"}
            </h1>
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
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="agent-composer-frame">
          <InputGroup>
            <InputGroupTextarea
              ref={composer}
              aria-label="Message Agent"
              placeholder={
                context === "new" ? "Describe an experiment…" : "Ask anything…"
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
            <InputGroupAddon align="block-end">
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
                className="agent-send"
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
          <p className="capability-note">
            This browser could not keep your message draft.
          </p>
        )}
        {unavailable && (
          <p className="capability-note">
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
  const suggestions = agentSuggestions({
    context,
    study,
    run,
    runs,
    design: protocol.data?.design,
  });
  if (!suggestions.length) return null;
  return (
    <div className="agent-suggestions">
      {suggestions.map(({ title, prompt }, index) => {
        const Icon = [BookOpen, GitCompareArrows, ScanLine, FlaskConical][
          index
        ];
        return (
          <Button variant="ghost" key={title} onClick={() => onChoose(prompt)}>
            <Icon aria-hidden="true" />
            <span>{title}</span>
            <ArrowUpRight aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
