import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AgentContext } from "@/components/agent/agent-context";
import type { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert } from "@/components/feedback";
import { ArrowUp } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import type { RunSummary, StudySummary } from "@/lib/types";

export function AgentComposer({
  state,
  context,
  studies,
  runs,
  onContextChange,
  placeholder,
  className,
  children,
}: {
  state: ReturnType<typeof useAgentComposer>;
  context: string;
  studies: StudySummary[];
  runs: RunSummary[];
  onContextChange: (value: string) => void;
  placeholder: string;
  className?: string;
  children?: ReactNode;
}) {
  const {
    question,
    setQuestion,
    composer,
    send,
    submit,
    disabled,
    settings,
    draftUnavailable,
    unavailable,
    provider,
  } = state;
  return (
    <form
      aria-label="Agent composer"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="rounded-lg bg-background">
        <InputGroup>
          <InputGroupTextarea
            ref={composer}
            aria-label="Message Agent"
            placeholder={placeholder}
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
          <InputGroupAddon align="block-end" className="justify-between gap-3">
            <AgentContext
              value={context}
              onChange={onContextChange}
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
          <Button variant="ghost" size="sm" onClick={() => settings.refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {children}
      {draftUnavailable && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          This browser could not keep your message draft.
        </p>
      )}
      {unavailable && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground [&_a]:underline [&_a]:underline-offset-4">
          {provider === "openai" ? "OpenAI" : "Anthropic"} is required for this
          context. <Link to="/settings">Configure a provider</Link>
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
  );
}
