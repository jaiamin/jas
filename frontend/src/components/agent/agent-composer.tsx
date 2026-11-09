import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { useAgentComposer } from "@/components/agent/use-agent-composer";
import { Alert } from "@/components/feedback";
import { ArrowRight, ArrowUp } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export function AgentComposer({
  state,
  contextControl,
  placeholder,
  className,
  children,
}: {
  state: ReturnType<typeof useAgentComposer>;
  contextControl?: ReactNode;
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
      <Card className="gap-0 bg-muted p-2 shadow-xl">
        <CardContent className="px-0">
          <div className="rounded-lg bg-background">
            <InputGroup className="has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0">
              <InputGroupTextarea
                ref={composer}
                className="min-h-22 max-h-48 overflow-y-auto overscroll-contain px-3.5 text-[0.9375rem] leading-6 md:text-[0.9375rem]"
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
              <InputGroupAddon align="block-end" className="gap-3 px-3.5">
                {contextControl}
                <Button
                  type="submit"
                  size="icon"
                  className="ml-auto"
                  aria-label="Send message"
                  title="Send message (Enter)"
                  disabled={disabled || !question.trim()}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-x-1 gap-y-0 border-0 bg-transparent px-1 py-2 text-xs text-muted-foreground">
          <span>Shape an experiment with Agent, or</span>
          <Button
            variant="link"
            size="xs"
            className="h-auto px-0 font-semibold text-foreground has-data-[icon=inline-end]:pr-0"
            asChild
          >
            <Link to="/new">
              start from scratch
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
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
          {provider === "openai" ? "OpenAI" : "Anthropic"} is required to send a
          message. <Link to="/settings">Configure a provider</Link>.
        </p>
      )}
    </form>
  );
}
