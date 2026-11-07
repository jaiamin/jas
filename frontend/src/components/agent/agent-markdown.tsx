import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

export function AgentMarkdown({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  return (
    <Bubble variant="ghost" aria-busy={streaming} data-streaming={streaming}>
      <BubbleContent>
        <div className="prose agent-prose">
          <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        </div>
      </BubbleContent>
    </Bubble>
  );
}
