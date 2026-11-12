import { Link } from "react-router-dom";
import { AgentActivity } from "@/components/agent/agent-activity";
import { AgentReply } from "@/components/agent/agent-reply";
import { AgentTarget } from "@/components/agent/agent-target";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Trace } from "@/components/ui/trace";
import type { Analysis } from "@/lib/types";

export function PlanningProgress({ plan }: { plan?: Analysis }) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Message align="end">
          <MessageContent>
            <Bubble variant="outline" align="end">
              <BubbleContent>
                {plan?.question ?? "Loading your question…"}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        {plan ? (
          <AgentReply row={plan} disabled onRetry={() => {}} />
        ) : (
          <Message>
            <MessageContent>
              <MessageHeader className="min-h-6 gap-2 px-0">
                <AgentTarget
                  motion="working"
                  className="size-5"
                  aria-label="Assistant"
                />
                <Trace>
                  <AgentActivity stage="scoping" />
                </Trace>
              </MessageHeader>
            </MessageContent>
          </Message>
        )}
      </div>
      <Button variant="outline" asChild>
        <Link to="/agent" state={{ question: plan?.question }}>
          Back to workspace
        </Link>
      </Button>
    </section>
  );
}
