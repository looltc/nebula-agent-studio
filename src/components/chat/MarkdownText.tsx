import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';
import { MermaidDiagram } from './MermaidDiagram';
import styles from './MarkdownText.module.css';

export interface MarkdownTextProps {
  /** Raw markdown source. */
  content: string;
  /** When true the content is still streaming — disable plugins that benefit
   *  from a complete document (e.g. table parsing) to avoid mid-stream flicker. */
  streaming?: boolean;
}

/**
 * Render assistant message content as GitHub-flavoured Markdown with syntax
 * highlighting via highlight.js. Designed to live inside a chat bubble: tight
 * spacing, inline code chips, fenced code blocks with a scroll area, and
 * links that open in a new tab.
 *
 * Fenced code blocks are wrapped by <CodeBlock> which adds a header showing
 * the language (top-left) and a copy button (top-right). Mermaid blocks
 * (` ```mermaid `) are rendered as diagrams via <MermaidDiagram>, which
 * lazy-loads the mermaid library on first use.
 */
function MarkdownTextBase({ content, streaming = false }: MarkdownTextProps) {
  // remark-gfm enables tables, strikethrough, task lists, autolinked literals.
  // remark-breaks renders single "\n" as <br> — chat UIs (ChatGPT, GitHub
  // Issues) treat line breaks as hard breaks, otherwise Markdown collapses
  // single newlines into spaces and LLM replies lose their line structure.
  // Both plugins are safe during streaming; partial tables just look slightly
  // off until the closing row arrives.
  const remarkPlugins = streaming ? [remarkBreaks] : [remarkGfm, remarkBreaks];
  return (
    <div className={styles.md}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ className, children, ...props }) => {
            // Inline code (no language class and no newline) gets a chip style.
            const isInline = !className && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code className={styles.inlineCode} {...props}>
                  {children}
                </code>
              );
            }
            // Extract language from className like "language-mermaid".
            const langMatch = /language-([\w-]+)/.exec(className ?? '');
            const language = langMatch ? langMatch[1].toLowerCase() : null;

            // react-markdown passes the raw text as children; we need a plain
            // string for copy + mermaid source. Join react nodes back to text.
            const raw = typeof children === 'string'
              ? children
              : Array.isArray(children)
                ? children.join('')
                : String(children ?? '');

            if (language === 'mermaid') {
              return <MermaidDiagram code={raw.replace(/\n$/, '')} />;
            }

            return (
              <CodeBlock language={language} raw={raw}>
                {children}
              </CodeBlock>
            );
          },
          // react-markdown wraps fenced code in <pre><code>. Since CodeBlock
          // renders its own <pre>, replace the default <pre> with a fragment
          // to avoid double-nesting that breaks layout.
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownText = memo(MarkdownTextBase);
export default MarkdownText;
