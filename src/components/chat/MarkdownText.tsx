import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
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
 * Why a separate component (not inline in MessageBubble): the same renderer
 * is reused by StreamingMessage so partial streaming output also renders as
 * Markdown.
 */
function MarkdownTextBase({ content, streaming = false }: MarkdownTextProps) {
  // remark-gfm enables tables, strikethrough, task lists, autolinked literals.
  // During streaming we keep gfm on — partial tables just look slightly off
  // until complete, which is preferable to a hard re-parse flash.
  return (
    <div className={styles.md}>
      <ReactMarkdown
        remarkPlugins={streaming ? [] : [remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
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
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre className={styles.codeBlock} {...props}>
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownText = memo(MarkdownTextBase);
export default MarkdownText;
