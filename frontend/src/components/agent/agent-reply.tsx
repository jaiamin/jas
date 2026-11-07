import { ArrowUpRight, BookOpen, Check } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router-dom";
import { AgentActivity } from "@/components/agent/agent-activity";
import { AgentMarkdown } from "@/components/agent/agent-markdown";
import { PlanningActivity } from "@/components/agent/planning-progress";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/data";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
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
import type { Analysis } from "@/lib/types";
import { money } from "@/lib/utils";

export const AgentReply = memo(function AgentReply({
  row,
  disabled,
  onRetry,
}: {
  row: Analysis;
  disabled: boolean;
  onRetry: () => void;
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
          <img src="/logo.svg" width={18} height={18} alt="" />
          Agent
        </MessageHeader>
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
        ) : row.purpose === "design" ? (
          <DesignReply row={row} />
        ) : (
          <>
            <Trace>
              {row.status === "pending" ? (
                <AgentActivity
                  stage={
                    row.output?.partial
                      ? "writing"
                      : (row.output?.stage ??
                        (row.purpose === "general"
                          ? "answering"
                          : "investigating"))
                  }
                />
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
            {row.status === "pending" && row.output?.partial && (
              <AgentMarkdown text={row.output.partial} streaming />
            )}
            {row.status === "complete" && (
              <>
                <AgentMarkdown text={row.output?.answer ?? ""} />
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
        {(row.purpose === "analysis" || !!row.usage?.cost_usd) && (
          <MessageFooter>
            {row.purpose === "analysis" &&
              (Object.keys(row.cutoffs).length === 1
                ? `Evidence through turn ${Object.values(row.cutoffs)[0]}`
                : `${Object.keys(row.cutoffs).length} captured runs`)}
            {!!row.usage?.cost_usd &&
              `${row.purpose === "analysis" ? " · " : ""}${money(row.usage.cost_usd)}${row.usage.partial ? "*" : ""}`}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
});

function DesignReply({ row }: { row: Analysis }) {
  if (row.status === "pending")
    return (
      <>
        <PlanningActivity plan={row} />
        {row.output?.partial && (
          <AgentMarkdown text={row.output.partial} streaming />
        )}
      </>
    );
  const design = row.output?.design;
  return (
    <>
      <AgentMarkdown text={row.output?.explanation ?? ""} />
      {design && row.output?.supported ? (
        <div className="agent-proposal">
          <h2>{design.title}</h2>
          <p>{design.hypothesis}</p>
          <div className="proposal-facts">
            <span>{design.profiles.length} agents</span>
            <span>{design.conditions.length} conditions</span>
            <span>
              {design.conditions.length *
                design.seeds.length *
                design.repetitions}{" "}
              independent runs
            </span>
            <span>{money(design.budget_usd)} ceiling</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/new?plan=${row.id}`}>
              Review protocol
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" asChild>
          <Link to="/environments">Browse environments</Link>
        </Button>
      )}
    </>
  );
}
