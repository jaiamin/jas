import { memo } from "react";
import { Link } from "react-router-dom";
import { ReplyActivity } from "@/components/agent/agent-activity";
import { AgentMarkdown } from "@/components/agent/agent-markdown";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { AgentIcon, ArrowUpRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlockCopyButton } from "@/components/ui/code-block";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Analysis } from "@/lib/types";

export const AgentReply = memo(function AgentReply({
  row,
  disabled,
  onRetry,
}: {
  row: Analysis;
  disabled: boolean;
  onRetry: () => void;
}) {
  const pending = row.status === "pending";
  const complete = row.status === "complete";
  const design = row.output?.design;
  const text = pending
    ? (row.output?.partial ?? "")
    : row.purpose === "design"
      ? (row.output?.explanation ?? "")
      : (row.output?.answer ?? "");
  const copyText =
    row.purpose === "design" && design && row.output?.supported
      ? [
          text,
          design.title,
          design.question,
          `${design.profiles.length} agents · ${design.conditions.length} conditions · ${design.conditions.length * design.seeds.length * design.repetitions} runs`,
          "Ready for review. Nothing has run.",
        ]
          .filter(Boolean)
          .join("\n\n")
      : [text, ...(row.output?.caveats ?? [])].filter(Boolean).join("\n\n");
  return (
    <Message>
      <MessageContent>
        <MessageHeader className="min-h-6 items-start gap-2 px-0">
          <AgentIcon
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-label="Assistant"
          />
        </MessageHeader>
        <ReplyActivity row={row} />
        {row.status === "failed" ? (
          <Alert variant="error" title="Request stopped">
            <p>{row.error}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onRetry}
            >
              Try again
            </Button>
          </Alert>
        ) : (
          <>
            {text && <AgentMarkdown text={text} streaming={pending} />}
            {complete &&
              row.purpose === "design" &&
              (design && row.output?.supported ? (
                <Card className="my-4">
                  <CardHeader className="gap-2">
                    <CardTitle>
                      <h2>{design.title}</h2>
                    </CardTitle>
                    <CardDescription>{design.question}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {design.profiles.length} agents ·{" "}
                      {design.conditions.length} conditions ·{" "}
                      {design.conditions.length *
                        design.seeds.length *
                        design.repetitions}{" "}
                      runs
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button asChild>
                      <Link to={`/new?plan=${row.id}`}>
                        Review protocol
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground sm:text-left">
                      Ready for review. Nothing has run.
                    </p>
                  </CardFooter>
                </Card>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  asChild
                >
                  <Link to="/environments">Browse environments</Link>
                </Button>
              ))}
            {complete && !!row.output?.citations?.length && (
              <div className="flex flex-wrap items-center gap-2">
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
            {complete && !!row.output?.caveats?.length && (
              <Disclosure className="min-w-0">
                <DisclosureTrigger>Limitations & uncertainty</DisclosureTrigger>
                <DisclosureContent>
                  <ul>
                    {row.output.caveats.map((caveat) => (
                      <li key={caveat}>{caveat}</li>
                    ))}
                  </ul>
                </DisclosureContent>
              </Disclosure>
            )}
            <MessageFooter className="-mt-1 -ml-1 min-h-6 flex-wrap gap-2 px-0">
              {complete && copyText && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CodeBlockCopyButton
                      value={copyText}
                      title="Copy response"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Copy response</TooltipContent>
                </Tooltip>
              )}
              {row.purpose === "analysis" &&
                Object.keys(row.cutoffs).length > 0 && (
                  <span>
                    {Object.keys(row.cutoffs).length === 1
                      ? `Evidence through turn ${Object.values(row.cutoffs)[0]}`
                      : `${Object.keys(row.cutoffs).length} captured runs`}
                  </span>
                )}
            </MessageFooter>
          </>
        )}
      </MessageContent>
    </Message>
  );
});
