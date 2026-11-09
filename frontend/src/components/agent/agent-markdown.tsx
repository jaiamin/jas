import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <div className="max-w-prose text-sm leading-relaxed flex min-w-0 flex-col gap-4 break-words">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="mt-4 text-base font-semibold">{children}</h2>
              ),
              h2: ({ children }) => (
                <h2 className="mt-4 text-base font-semibold">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-3 font-medium">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="flex list-disc flex-col gap-2 pl-5">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="flex list-decimal flex-col gap-2 pl-5">
                  {children}
                </ol>
              ),
              a: ({ children, href }) => (
                <a href={href} className="underline underline-offset-4">
                  {children}
                </a>
              ),
              pre: ({ children }) => (
                <pre className="max-w-full overflow-auto rounded-md border bg-background p-4 font-mono text-xs">
                  {children}
                </pre>
              ),
              code: ({ children }) => (
                <code className="font-mono text-xs">{children}</code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 pl-4 text-muted-foreground">
                  {children}
                </blockquote>
              ),
              hr: () => <Separator />,
              table: ({ children }) => <Table>{children}</Table>,
              thead: ({ children }) => <TableHeader>{children}</TableHeader>,
              tbody: ({ children }) => <TableBody>{children}</TableBody>,
              tr: ({ children }) => <TableRow>{children}</TableRow>,
              th: ({ children }) => <TableHead>{children}</TableHead>,
              td: ({ children }) => (
                <TableCell className="whitespace-normal">{children}</TableCell>
              ),
            }}
          >
            {text}
          </Markdown>
        </div>
      </BubbleContent>
    </Bubble>
  );
}
