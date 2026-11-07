import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AgentContext,
  contextLabel,
  messageContext,
} from "@/components/agent-context";
import { AgentHistory } from "@/components/agent-history";
import { AgentReply } from "@/components/agent-reply";
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
import { api, useApi } from "@/lib/api";
import type { Analysis, RunSummary, Settings, StudySummary } from "@/lib/types";

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
  return (
    <div className="agent-layout">
      <AgentHistory />
      <div className="agent-canvas">
        {chat.error ? (
          <div className="agent-load-state">
            <ErrorState error={chat.error} />
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
}: {
  chatId: string | null;
  messages: Analysis[];
  studies: StudySummary[];
  runs: RunSummary[];
  contextError: Error | null;
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
    <section className="agent-workspace" aria-label="Agent workspace">
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
        <div className="agent-welcome">
          <div>
            <h1>
              {context === "new"
                ? "What would you like to test?"
                : context === "general"
                  ? "What would you like to explore?"
                  : "What does the evidence tell us?"}
            </h1>
            <div className="agent-suggestions">
              {(context === "new"
                ? [
                    "Does communication improve cooperation?",
                    "Compare private notes with shared history",
                  ]
                : context === "general"
                  ? [
                      "How do matched seeds help comparisons?",
                      "What makes a useful experiment?",
                    ]
                  : [
                      "Which strategies worked best?",
                      "What evidence supports the observed differences?",
                    ]
              ).map((text) => (
                <Button
                  variant="outline"
                  key={text}
                  onClick={() => {
                    setQuestion(text);
                    composer.current?.focus();
                  }}
                >
                  {text}
                  <ArrowUpRight aria-hidden="true" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <InputGroup>
          <InputGroupTextarea
            ref={composer}
            aria-label="Message Agent"
            placeholder={
              context === "new"
                ? "Describe the experiment you have in mind…"
                : "Ask anything…"
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
          <p className="capability-note">Could not load experiment contexts.</p>
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
