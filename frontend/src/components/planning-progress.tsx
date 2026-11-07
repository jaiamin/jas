import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentActivity } from "@/components/agent-activity";
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
              <img src="/logo.svg" width={18} height={18} alt="" />
              Agent
            </MessageHeader>
            <PlanningActivity plan={plan} />
          </MessageContent>
        </Message>
      </div>
      <Button variant="outline" asChild>
        <Link to="/agent?context=new" state={{ question: plan?.question }}>
          Back to workspace
        </Link>
      </Button>
    </section>
  );
}

export function PlanningActivity({ plan }: { plan?: Analysis }) {
  const sources = plan?.output?.planning?.sources ?? [];
  return (
    <Trace>
      <AgentActivity stage={plan?.output?.stage ?? "scoping"} />
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
                      <span className="sr-only"> (opens in a new tab)</span>
                    </TraceTitle>
                  </TraceLine>
                </a>
              ))}
            </Trace>
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
    </Trace>
  );
}
