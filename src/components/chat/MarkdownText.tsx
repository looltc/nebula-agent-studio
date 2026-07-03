import { memo, useMemo } from 'react';
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
 * 修复嵌套 fence + 未闭合 fence 问题。
 *
 * 问题 1（嵌套）：agent 用 ```markdown 包裹整个文档，内部又含 ```mermaid
 * 等代码块。CommonMark 规定代码块内容是纯文本，内部 ``` 会提前关闭外层
 * 代码块，导致后续内容溢出。
 *
 * 问题 2（未闭合）：agent 偶尔漏写 close ```，未闭合代码块延伸到 EOF，
 * 吞掉后续正文。
 *
 * 策略：
 *  - 嵌套：用栈匹配内部 ```lang（opening）和 ```（closing）。栈空时的
 *    纯 ``` 才是外层 close。有嵌套时升级外层 fence 为 maxInnerFence+1。
 *  - 未闭合：到 EOF 仍没找到 close，自动补一个与 open 同长度的 close
 *    fence；若 hasInner 则升级外层并补升级后的 close。
 */
function repairNestedFences(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  // 纯反引号行（closing fence）：前导空格 + 3+ 反引号 + trailing 空格
  const isCloseFence = (s: string) => /^(\s*)(`{3,})\s*$/.test(s);
  // 带 info 的 opening fence：前导空格 + 3+ 反引号 + 非反引号非空格字符
  const isInfoOpenFence = (s: string) => /^(\s*)(`{3,})([^`\s].*)$/.test(s);
  // 取反引号数
  const fenceLen = (s: string) => {
    const m = s.match(/^(\s*)(`{3,})/);
    return m ? m[2]!.length : 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    const openMatch = line.match(/^(\s*)(`{3,})([^`]*)$/);

    if (!openMatch) {
      result.push(line);
      i++;
      continue;
    }

    const indent = openMatch[1] ?? '';
    const lang = (openMatch[3] ?? '').trim();
    const openFenceLen = openMatch[2]!.length;

    // 用栈扫描，找到外层 close（depth=0 时的纯 ```）
    let depth = 0;
    let maxInnerFence = openFenceLen;
    let endIdx = -1;
    let hasInner = false;

    for (let j = i + 1; j < lines.length; j++) {
      const innerLine = lines[j]!;

      if (isInfoOpenFence(innerLine)) {
        depth++;
        maxInnerFence = Math.max(maxInnerFence, fenceLen(innerLine));
        hasInner = true;
      } else if (isCloseFence(innerLine)) {
        if (depth > 0) {
          depth--;
          maxInnerFence = Math.max(maxInnerFence, fenceLen(innerLine));
        } else {
          endIdx = j;
          break;
        }
      }
    }

    if (endIdx === -1) {
      // 未闭合：到 EOF 仍没找到外层 close
      if (hasInner) {
        // 有内部嵌套 fence：外层必须升级为 maxInnerFence+1，否则内部的 ```
        // 会提前关闭外层代码块。同时补一个升级后的 close fence。
        const newFence = '`'.repeat(maxInnerFence + 1);
        result.push(`${indent}${newFence}${lang}`);
        for (let j = i + 1; j < lines.length; j++) {
          result.push(lines[j]!);
        }
        result.push(`${indent}${newFence}`);
      } else {
        // 无嵌套：只补一个与 open 同长度的 close fence
        result.push(line);
        for (let j = i + 1; j < lines.length; j++) {
          result.push(lines[j]!);
        }
        result.push(`${indent}${'`'.repeat(openFenceLen)}`);
      }
      i = lines.length;
      continue;
    }

    if (!hasInner) {
      // 无嵌套，原样输出整个代码块
      for (let j = i; j <= endIdx; j++) {
        result.push(lines[j]!);
      }
      i = endIdx + 1;
      continue;
    }

    // 有嵌套：升级外层 fence 为 maxInnerFence + 1 个反引号
    const newFence = '`'.repeat(maxInnerFence + 1);
    result.push(`${indent}${newFence}${lang}`);
    for (let j = i + 1; j < endIdx; j++) {
      result.push(lines[j]!);
    }
    result.push(`${indent}${newFence}`);
    i = endIdx + 1;
  }

  return result.join('\n');
}

/**
 * hast 节点类型（简化版，仅包含需要的字段）。
 */
type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/**
 * 从 hast 节点树递归提取纯文本（拼接所有 text 节点的 value）。
 */
function extractTextFromHast(node: HastNode | undefined | null): string {
  if (!node) return '';
  if (node.type === 'text' && typeof node.value === 'string') return node.value;
  if (node.children) {
    return node.children.map(extractTextFromHast).join('');
  }
  return '';
}

/**
 * 自定义 rehype 插件：在 rehype-highlight 之前运行，给每个 <code> 节点
 * 添加 `dataRaw` 属性，保存原始源码（含完整换行符）。
 *
 * 用于复制功能和 mermaid 源码提取。rehype-highlight 不会修改 properties，
 * 原始源码得以保留。
 */
function rehypeCodeRaw() {
  const visit = (node: HastNode) => {
    if (node.type === 'element' && node.tagName === 'code' && node.children?.length) {
      const text = extractTextFromHast(node);
      if (text) {
        node.properties = node.properties ?? {};
        node.properties['dataRaw'] = text;
      }
    }
    if (node.children) {
      node.children.forEach(visit);
    }
  };
  return (tree: HastNode) => visit(tree);
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

  // 预处理：修复嵌套 fence + 未闭合 fence
  const repaired = useMemo(() => repairNestedFences(content), [content]);

  return (
    <div className={styles.md}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[
          [rehypeCodeRaw],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ className, children, node, ...props }) => {
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

            // 从 rehypeCodeRaw 插件存的 dataRaw 属性取原始源码
            // （rehype-highlight 运行前保存，含完整换行符）。
            // 回退到从 hast node 提取 text，再回退到 children 字符串。
            const hastNode = node as (HastNode & { properties?: Record<string, unknown> }) | undefined;
            const dataRaw = hastNode?.properties?.['dataRaw'];
            const raw = (typeof dataRaw === 'string' ? dataRaw : '')
              || extractTextFromHast(hastNode)
              || (typeof children === 'string' ? children : '');

            if (language === 'mermaid') {
              // 流式输出时代码不完整，mermaid.render 会失败并在 DOM 留下报错 SVG。
              // 流式时只显示源码占位，非流式时才真正渲染图表。
              return <MermaidDiagram code={raw.replace(/\n$/, '')} streaming={streaming} />;
            }

            // markdown/md 代码块：highlight.js 的 markdown 解析器会重新解析
            // 内部 ```mermaid 等嵌套代码块，吞掉换行符。无法既高亮又保留
            // 换行，优先保留换行（渲染 raw 纯文本）。其他语言正常高亮。
            if (language === 'markdown' || language === 'md') {
              return (
                <CodeBlock language={language} raw={raw}>
                  {raw}
                </CodeBlock>
              );
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
        {repaired}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownText = memo(MarkdownTextBase);
export default MarkdownText;
