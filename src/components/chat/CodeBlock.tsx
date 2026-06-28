import { memo, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  /** Language hint extracted from className like "language-xxx", lowercased. */
  language: string | null;
  /** Raw text fallback (may be empty when children are highlighted nodes). */
  raw: string;
  /** Children from react-markdown (highlighted HTML nodes). */
  children?: React.ReactNode;
}

/**
 * Fenced code block wrapper with:
 *  - top-left language tag
 *  - top-right copy button (icon-only, with check feedback)
 *  - <pre> retains `white-space: pre` so newlines are preserved
 *
 * Copy reads textContent from the rendered <code> element via ref, so
 * rehype-highlight's nested <span> tree is correctly flattened to text
 * (earlier code that joined React children produced "[object Object]").
 */
function CodeBlockBase({ language, raw, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const codeRef = useRef<HTMLElement | null>(null);

  const handleCopy = async () => {
    try {
      // Prefer rendered textContent (handles hljs span tree); fall back to raw.
      const text = codeRef.current?.textContent ?? raw;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; fail silently */
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const langLabel = language && language !== 'text' ? language : '';

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.lang}>{langLabel}</span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          aria-label="复制代码"
          title="复制"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className={styles.codeBlock}>
        <code
          ref={codeRef}
          className={language ? `language-${language}` : undefined}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockBase);
export default CodeBlock;
