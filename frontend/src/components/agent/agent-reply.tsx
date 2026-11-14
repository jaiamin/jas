import { memo } from "react";
import { Link } from "react-router-dom";
import { ReplyActivity } from "@/components/agent/agent-activity";
import { AgentMarkdown } from "@/components/agent/agent-markdown";
import { ClaimEvidence } from "@/components/claim-evidence";
import { ComparisonEvidence } from "@/components/comparison-evidence";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { AgentIcon, ArrowUpRight } from "@/components/icons";
import { ProtocolEstimate } from "@/components/protocol-estimate";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { money } from "@/lib/format";
import type { Analysis, AnalysisLensKey } from "@/lib/types";

export const AgentReply = memo(function AgentReply({
  row,
  disabled,
  onRetry,
  onReanalyze,
}: {
  row: Analysis;
  disabled: boolean;
  onRetry: () => void;
  onReanalyze?: (lens: AnalysisLensKey) => void;
}) {
  const pending = row.status === "pending";
  const complete = row.status === "complete";
  const design = row.output?.design;
  const introduction = row.output?.introduction;
  const text =
    row.purpose === "design"
      ? pending
        ? ""
        : row.output?.supported
          ? (row.output?.summary ?? "")
          : (row.output?.explanation ?? "")
      : pending
        ? (row.output?.partial ?? "")
        : (row.output?.answer ?? "");
  const messageText = introduction ?? (row.status === "failed" ? "" : text);
  const answerText = [introduction, text].filter(Boolean).join("\n\n");
  const copyText =
    row.purpose === "design" && design && row.output?.supported
      ? [
          answerText,
          design.title,
          design.question,
          `${design.profiles.length} agents · ${design.conditions.length} conditions · ${design.conditions.length * design.seeds.length * design.repetitions} runs`,
          "Ready for review. Nothing has run.",
        ]
          .filter(Boolean)
          .join("\n\n")
      : [answerText, ...(row.output?.caveats ?? [])]
          .filter(Boolean)
          .join("\n\n");
  return (
    <Message>
      <MessageContent>
        <MessageHeader className="min-h-6 items-start gap-2 px-0">
          <AgentIcon
            className="size-5 shrink-0 text-primary"
            aria-label="Assistant"
          />
          <ReplyActivity row={row} />
        </MessageHeader>
        <ClaimEvidence
          row={row}
          disabled={disabled}
          onReanalyze={onReanalyze}
        />
        {messageText && (
          <AgentMarkdown
            text={messageText}
            streaming={pending && !introduction}
          />
        )}
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
            {introduction && text && (
              <AgentMarkdown text={text} streaming={pending} />
            )}
            {complete &&
              row.purpose === "design" &&
              (design && row.output?.supported ? (
                <Card className="mx-px my-4">
                  <CardHeader className="gap-2">
                    <CardTitle>
                      <h2>{design.title}</h2>
                    </CardTitle>
                    <CardDescription>{design.question}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl
                      aria-label="Protocol summary"
                      className="flex flex-wrap gap-x-6 gap-y-3"
                    >
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs text-muted-foreground">
                          Agents
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {design.profiles.length}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs text-muted-foreground">
                          Conditions
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {design.conditions.length}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs text-muted-foreground">
                          Planned runs
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {design.conditions.length *
                            design.seeds.length *
                            design.repetitions}
                        </dd>
                      </div>
                    </dl>
                    <ProtocolEstimate design={design} />
                  </CardContent>
                  <CardFooter className="flex-col items-stretch gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
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
            {row.output?.comparisons &&
              Object.entries(row.output.comparisons).map(([key, report]) => (
                <Disclosure key={key}>
                  <DisclosureTrigger>
                    Captured comparison · version {report.comparison.revision}
                  </DisclosureTrigger>
                  <DisclosureContent>
                    <ComparisonEvidence report={report} />
                  </DisclosureContent>
                </Disclosure>
              ))}
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
          </>
        )}
        <MessageFooter className="-mt-1 -ml-1 min-h-6 flex-wrap gap-2 px-0">
          {complete && copyText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CodeBlockCopyButton value={copyText} title="Copy response" />
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
          {!pending && !!row.usage?.requests && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  className="font-normal text-muted-foreground tabular-nums"
                  aria-label="Reply usage"
                >
                  {row.usage.cost_usd == null
                    ? "Cost unknown"
                    : money(row.usage.cost_usd)}
                  {row.usage.partial && " · partial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-60 text-xs"
                aria-label="Reply usage details"
              >
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 [&_dd]:text-right [&_dd]:tabular-nums">
                  <dt>Calls</dt>
                  <dd>{row.usage.requests.toLocaleString()}</dd>
                  <dt>Input tokens</dt>
                  <dd>{row.usage.input_tokens.toLocaleString()}</dd>
                  <dt>Output tokens</dt>
                  <dd>{row.usage.output_tokens.toLocaleString()}</dd>
                </dl>
                <p className="text-muted-foreground">
                  {row.usage.partial
                    ? "Includes reservations for calls with unsettled usage."
                    : row.usage.cost_usd == null
                      ? "Price unavailable. Token usage is recorded."
                      : "Calculated from recorded usage and configured prices. Your provider bills your key."}
                </p>
              </PopoverContent>
            </Popover>
          )}
        </MessageFooter>
      </MessageContent>
    </Message>
  );
});
