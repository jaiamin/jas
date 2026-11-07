import { BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import type { Analysis } from "@/lib/types";

export function PlanningProgress({ plan }: { plan?: Analysis }) {
  const stage =
    {
      scoping: "Scoping the question",
      researching: "Researching methods",
      drafting: "Drafting the protocol",
      reviewing: "Reviewing the design",
      revising: "Refining the protocol",
    }[plan?.output?.stage ?? "scoping"] ?? "Designing the experiment";
  const sources = plan?.output?.planning?.sources ?? [];
  return (
    <section className="planning-state">
      <div className="research-thread">
        <Message align="end">
          <MessageContent>
            <MessageHeader>You</MessageHeader>
            <Bubble variant="muted" align="end">
              <BubbleContent>
                {plan?.question ?? "Loading your question…"}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message>
          <MessageContent>
            <MessageHeader>
              <span className="agent-wordmark">ASS</span>Experiment designer
            </MessageHeader>
            <Trace>
              <TraceLine status="running" role="status">
                <TraceIcon>
                  <Search />
                </TraceIcon>
                <TraceTitle>{stage}</TraceTitle>
              </TraceLine>
              {plan?.output?.planning?.brief && (
                <TraceCollapsible>
                  <TraceCollapsibleTrigger>
                    <TraceLine>
                      <TraceIcon>
                        <BookOpen />
                      </TraceIcon>
                      <TraceTitle>Study scope</TraceTitle>
                    </TraceLine>
                  </TraceCollapsibleTrigger>
                  <TraceCollapsibleContent>
                    <p>{plan.output.planning.brief.operationalization}</p>
                    <p>{plan.output.planning.brief.size_rationale}</p>
                  </TraceCollapsibleContent>
                </TraceCollapsible>
              )}
              {!!sources.length && (
                <TraceCollapsible>
                  <TraceCollapsibleTrigger>
                    <TraceLine>
                      <TraceIcon>
                        <BookOpen />
                      </TraceIcon>
                      <TraceTitle>{sources.length} research sources</TraceTitle>
                    </TraceLine>
                  </TraceCollapsibleTrigger>
                  <TraceCollapsibleContent>
                    <Trace>
                      {sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <TraceLine>
                            <TraceTitle>
                              {source.title}
                              <span className="sr-only">
                                {" "}
                                (opens in a new tab)
                              </span>
                            </TraceTitle>
                          </TraceLine>
                        </a>
                      ))}
                    </Trace>
                  </TraceCollapsibleContent>
                </TraceCollapsible>
              )}
            </Trace>
          </MessageContent>
        </Message>
      </div>
      <Button variant="outline" asChild>
        <Link to="/" state={{ question: plan?.question }}>
          Back to workspace
        </Link>
      </Button>
    </section>
  );
}
