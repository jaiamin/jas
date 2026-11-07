import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, BookOpen, Check, Search } from "lucide-react";
import { memo, useState } from "react";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { ErrorState, Loading } from "@/components/shared";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Alert, Empty } from "@/components/ui/data";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { api, useApi } from "@/lib/api";
import type { Analysis } from "@/lib/types";
import { money } from "@/lib/utils";

export function ResearchAssistant({
  studyId,
  runId,
}:
  | {
      studyId: string;
      runId?: never;
    }
  | { runId: string; studyId?: never }) {
  const path = `/analyses?${runId ? `run_id=${runId}` : `study_id=${studyId}`}`;
  const analyses = useApi<Analysis[]>(path, true);
  const [question, setQuestion] = useState("");
  const client = useQueryClient();
  const busy = analyses.data?.some((row) => row.status === "pending") ?? false;
  const ask = useMutation({
    mutationFn: (text: string) =>
      api("/analyses", {
        question: text,
        study_id: studyId ?? null,
        run_id: runId ?? null,
      }),
    onSuccess: () => {
      setQuestion("");
      client.invalidateQueries({ queryKey: [path] });
    },
  });
  return (
    <section className="research-assistant">
      {analyses.error ? (
        <ErrorState error={analyses.error} onRetry={analyses.refetch} />
      ) : !analyses.data ? (
        <Loading />
      ) : !analyses.data.length ? (
        <Empty
          title="Explore the evidence"
          description="Ask about decisions, strategies, and differences between runs."
        >
          <div className="agent-suggestions">
            {[
              "Who contributed most to the group?",
              "Did any claims contradict the recorded facts?",
              "Which strategies worked best?",
            ].map((text) => (
              <Button
                key={text}
                variant="outline"
                onClick={() => setQuestion(text)}
              >
                {text}
              </Button>
            ))}
          </div>
        </Empty>
      ) : (
        <MessageScrollerProvider
          autoScroll={busy}
          defaultScrollPosition="last-anchor"
        >
          <MessageScroller>
            <MessageScrollerViewport aria-label="Research conversation">
              <MessageScrollerContent className="research-thread">
                {analyses.data.flatMap((row) => [
                  <MessageScrollerItem
                    key={`${row.id}-question`}
                    messageId={`${row.id}-question`}
                    scrollAnchor
                  >
                    <Message align="end">
                      <MessageContent>
                        <MessageHeader>You</MessageHeader>
                        <Bubble variant="muted" align="end">
                          <BubbleContent>{row.question}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>,
                  <MessageScrollerItem key={row.id} messageId={row.id}>
                    <ResearchAnswer
                      row={row}
                      disabled={busy || ask.isPending}
                      onRetry={ask.mutate}
                    />
                  </MessageScrollerItem>,
                ])}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim() && !busy && !ask.isPending) ask.mutate(question);
        }}
      >
        <InputGroup>
          <InputGroupTextarea
            aria-label="Your question"
            value={question}
            maxLength={4000}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            placeholder="Ask about the recorded evidence…"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
                event.currentTarget.form?.requestSubmit();
            }}
          />
          <InputGroupAddon>
            <span>GPT-6.1 Sol · Experiment budget</span>
            <Button
              type="submit"
              size="icon"
              title="Send question (⌘/Ctrl Enter)"
              aria-label="Send question"
              disabled={!question.trim() || busy || ask.isPending}
            >
              <ArrowUp />
            </Button>
          </InputGroupAddon>
        </InputGroup>
        {ask.error && <Alert variant="error">{ask.error.message}</Alert>}
      </form>
    </section>
  );
}

const ResearchAnswer = memo(function ResearchAnswer({
  row,
  disabled,
  onRetry,
}: {
  row: Analysis;
  disabled: boolean;
  onRetry: (question: string) => void;
}) {
  const examined = [
    ...new Map(
      (row.output?.examined ?? []).map((range) => [
        JSON.stringify(range),
        range,
      ]),
    ).values(),
  ];
  return (
    <Message>
      <MessageContent>
        <MessageHeader>
          <span className="agent-wordmark">ASS</span>Research assistant
        </MessageHeader>
        {row.status === "failed" ? (
          <Alert variant="error" title="Investigation stopped">
            <p>{row.error}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onRetry(row.question)}
            >
              Try again
            </Button>
          </Alert>
        ) : (
          <>
            <Trace>
              {row.status === "pending" ? (
                <TraceLine status="running" role="status">
                  <TraceIcon>
                    <Search />
                  </TraceIcon>
                  <TraceTitle>
                    {row.output?.stage === "indexing"
                      ? "Indexing the experiment"
                      : row.output?.stage === "reading"
                        ? "Reading recorded turns"
                        : "Investigating the evidence"}
                  </TraceTitle>
                  {examined.length > 0 && (
                    <TraceDescription>
                      {examined.length} ranges
                    </TraceDescription>
                  )}
                </TraceLine>
              ) : null}
              {examined.length > 0 && (
                <TraceCollapsible>
                  <TraceCollapsibleTrigger>
                    <TraceLine>
                      <TraceIcon>
                        <Check />
                      </TraceIcon>
                      <TraceTitle>
                        Inspected {examined.length} evidence range
                        {examined.length === 1 ? "" : "s"}
                      </TraceTitle>
                    </TraceLine>
                  </TraceCollapsibleTrigger>
                  <TraceCollapsibleContent>
                    <Trace>
                      {examined.map((range) => (
                        <Link
                          key={JSON.stringify(range)}
                          to={`/runs/${range.run_id}?turn=${range.start}&tab=decisions`}
                        >
                          <TraceLine>
                            <TraceIcon>
                              <BookOpen />
                            </TraceIcon>
                            <TraceTitle>
                              Turns {range.start}–{range.end}
                            </TraceTitle>
                            <TraceDescription>
                              {range.run_id.slice(0, 6)}
                            </TraceDescription>
                          </TraceLine>
                        </Link>
                      ))}
                    </Trace>
                  </TraceCollapsibleContent>
                </TraceCollapsible>
              )}
            </Trace>
            {row.status === "complete" && (
              <>
                <Bubble variant="ghost">
                  <BubbleContent>
                    <div className="prose">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {row.output?.answer ?? ""}
                      </Markdown>
                    </div>
                  </BubbleContent>
                </Bubble>
                {!!row.output?.citations?.length && (
                  <div className="citation-list">
                    <span>Sources</span>
                    {row.output.citations.map((citation) => (
                      <Button
                        key={`${citation.run_id}-${citation.turn}`}
                        variant="secondary"
                        size="sm"
                        asChild
                      >
                        <Link
                          to={`/runs/${citation.run_id}?turn=${citation.turn}&tab=decisions`}
                        >
                          Turn {citation.turn}
                          {Object.keys(row.cutoffs).length > 1 &&
                            ` · ${citation.run_id.slice(0, 5)}`}
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
                {!!row.output?.caveats?.length && (
                  <Disclosure className="disclosure">
                    <DisclosureTrigger>
                      Limitations & uncertainty
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <ul>
                        {row.output.caveats.map((caveat) => (
                          <li key={caveat}>{caveat}</li>
                        ))}
                      </ul>
                    </DisclosureContent>
                  </Disclosure>
                )}
              </>
            )}
          </>
        )}
        <MessageFooter>
          {Object.keys(row.cutoffs).length === 1
            ? `Evidence through turn ${Object.values(row.cutoffs)[0]}`
            : `${Object.keys(row.cutoffs).length} captured runs`}
          {row.usage &&
            ` · ${money(row.usage.cost_usd)}${row.usage.partial ? "*" : ""}`}
        </MessageFooter>
      </MessageContent>
    </Message>
  );
});
