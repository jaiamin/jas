import { Children, isValidElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";

function MarkdownCodeBlock({
  value,
  language,
}: {
  value: string;
  language: string;
}) {
  const lines = useHighlightedCode(value, language);
  return (
    <CodeBlock size="sm">
      <CodeBlockHeader>
        <CodeBlockTitle>{language || "Code"}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={value} title="Copy code" />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Source line positions remain stable as code streams.
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}

// Stable renderers preserve code/selection state as text streams and completes.
const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-4 text-base font-semibold">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 text-base font-semibold">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-3 font-medium">{children}</h3>,
  ul: ({ children }) => (
    <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="flex list-decimal flex-col gap-2 pl-5">{children}</ol>
  ),
  a: ({ children, href }) => (
    <a href={href} className="underline underline-offset-4">
      {children}
    </a>
  ),
  img: ({ alt, src }) =>
    src ? (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        {alt ? `Open image: ${alt}` : "Open image"}
      </a>
    ) : (
      alt
    ),
  pre: ({ children }) => {
    const child = Children.toArray(children)[0];
    if (!isValidElement<{ children?: ReactNode; className?: string }>(child))
      return null;
    const language =
      /language-([^\s]+)/.exec(child.props.className ?? "")?.[1] ?? "";
    return (
      <MarkdownCodeBlock
        value={String(child.props.children ?? "")}
        language={language}
      />
    );
  },
  code: ({ children }) => <code className="font-mono text-xs">{children}</code>,
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
};
const remarkPlugins = [remarkGfm];

export function AgentMarkdown({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  return (
    <Bubble
      variant="ghost"
      className="w-full"
      aria-busy={streaming}
      data-streaming={streaming}
    >
      <BubbleContent className="w-full">
        <div className="flex min-w-0 flex-col gap-4 break-words text-sm leading-relaxed [&>:first-child]:mt-0">
          <Markdown remarkPlugins={remarkPlugins} components={components}>
            {text}
          </Markdown>
        </div>
      </BubbleContent>
    </Bubble>
  );
}
