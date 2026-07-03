import { memo, useEffect, useRef, useState } from 'react';
import { Check, Code, Copy, Eye } from 'lucide-react';
import styles from './MermaidDiagram.module.css';

interface MermaidDiagramProps {
  /** Raw mermaid source (without the surrounding ``` fences). */
  code: string;
  /** 流式输出中：代码可能不完整，跳过渲染只显示源码，避免 mermaid.render
   *  失败后在 DOM 留下大量报错 SVG（aria-roledescription="error"）。 */
  streaming?: boolean;
}

// Module-level cache so repeated identical diagrams reuse the result.
const renderCache = new Map<string, string>();

/**
 * 清理 mermaid 11.x render 失败时在 document.body 留下的报错 SVG。
 *
 * mermaid.render 失败时除了抛异常，还会往 DOM 插入一个带错误信息的 SVG：
 * <svg id="mmd-..." role="graphics-document document" aria-roledescription="error">
 *   ...<text>Syntax error in text</text>...
 * </svg>
 * 这些 SVG 不会自动清除，累积在页面上就是用户看到的"非常多的报错图片"。
 */
function cleanupMermaidErrorSvgs(): void {
  const errorSvgs = document.querySelectorAll(
    'svg[aria-roledescription="error"]'
  );
  errorSvgs.forEach((el) => el.remove());
}

/**
 * Renders mermaid diagrams with lazy loading and a header toolbar.
 *
 * Header (icon-only buttons, no text labels):
 *  - top-left: language tag "mermaid"
 *  - top-right: toggle preview/source, copy source
 *
 * Mermaid is ~1MB gzipped; we only `import()` it when the first mermaid block
 * is encountered, then cache the module + rendered SVG to avoid re-parsing.
 * Default view is preview; user can toggle to see/edit the source code.
 */
function MermaidDiagramBase({ code, streaming }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>(() => renderCache.get(code) ?? '');
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);
  const idRef = useRef(`mmd-${Math.random().toString(36).slice(2)}`);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 流式输出时代码不完整，跳过渲染（避免 mermaid.render 失败留下报错 SVG）
    if (streaming) return;
    if (svg) return;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import('mermaid');
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });
        const result = await mermaid.render(idRef.current, code);
        if (cancelled) return;
        renderCache.set(code, result.svg);
        setSvg(result.svg);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        // mermaid 11.x render 失败时会在 document.body 留下报错 SVG
        // （<svg id="mmd-..." role="graphics-document document" aria-roledescription="error">）
        // 清理这些残留元素，避免页面上堆积大量报错图片
        cleanupMermaidErrorSvgs();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, svg, streaming]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      // Wrap in a fenced code block so pasting into a Markdown document
      // (GitHub, Notion, Obsidian, etc.) renders as a diagram, not plain text.
      const fenced = `\`\`\`mermaid\n${code}\n\`\`\``;
      await navigator.clipboard.writeText(fenced);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const toggleView = () => {
    setView((v) => (v === 'preview' ? 'source' : 'preview'));
  };

  const showPreview = view === 'preview' && !error && !streaming;
  const showError = view === 'preview' && error;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.lang}>mermaid</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleView}
            aria-label={showPreview ? '查看源码' : '查看预览'}
            title={showPreview ? '查看源码' : '查看预览'}
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleCopy}
            aria-label="复制源码"
            title="复制"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {showPreview && (
        <div
          className={styles.preview}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      {showError && (
        <div className={styles.error}>
          <div className={styles.errorTitle}>Mermaid 渲染失败</div>
          <pre className={styles.errorDetail}>{error}</pre>
        </div>
      )}

      {view === 'source' && (
        <pre className={styles.source}>
          <code>{code}</code>
        </pre>
      )}

      {/* Loading state shown only while preview is active, non-streaming, and svg not ready. */}
      {!svg && !error && view === 'preview' && !streaming && (
        <div className={styles.loading}>渲染图表中…</div>
      )}

      {/* 流式输出中：代码不完整，显示源码占位 + 提示 */}
      {streaming && (
        <pre className={styles.source}>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

export const MermaidDiagram = memo(MermaidDiagramBase);
export default MermaidDiagram;
