import { Wrench, Check, X } from 'lucide-react';
import type { StreamingTool } from '@/stores/chatStore';
import { Spinner } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './ToolCallBlock.module.css';

export interface ToolCallBlockProps {
  tool: StreamingTool;
}

function formatDuration(ms?: number): string | null {
  if (ms === undefined || ms === null) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Inline tool-call card shown inside a streaming / assistant message.
 * Status-aware: loading (spinner), done (check + duration), error (x + message).
 */
export function ToolCallBlock({ tool }: ToolCallBlockProps) {
  const { tool: name, args, status, result, durationMs, error } = tool;
  const isError = status === 'error';
  const duration = formatDuration(durationMs);
  const argsText = formatJson(args);
  const resultText = formatJson(result);

  return (
    <div className={cx(styles.block, isError && styles.blockError)} role="figure">
      <div className={styles.header}>
        <div className={styles.id}>
          <span className={styles.icon} aria-hidden="true">
            <Wrench size={14} />
          </span>
          <span className={styles.name}>{name}</span>
        </div>
        <div className={styles.status}>
          {status === 'loading' && (
            <>
              <Spinner size="sm" />
              <span className={cx(styles.statusText, styles.loading)}>Executing…</span>
            </>
          )}
          {status === 'done' && (
            <>
              <Check size={14} className={styles.doneIcon} />
              <span className={cx(styles.statusText, styles.done)}>
                {duration ? `Done · ${duration}` : 'Done'}
              </span>
            </>
          )}
          {status === 'error' && (
            <>
              <X size={14} className={styles.errorIcon} />
              <span className={cx(styles.statusText, styles.error)}>Failed</span>
            </>
          )}
        </div>
      </div>

      {argsText && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Args</div>
          <pre className={styles.code}>
            <code>{argsText}</code>
          </pre>
        </div>
      )}

      {isError && error && (
        <div className={styles.section}>
          <div className={cx(styles.sectionLabel, styles.errorLabel)}>Error</div>
          <pre className={cx(styles.code, styles.codeError)}>
            <code>{error}</code>
          </pre>
        </div>
      )}

      {status === 'done' && resultText && (
        <details className={styles.result}>
          <summary className={styles.resultSummary}>
            <span>Result</span>
            <span className={styles.resultHint}>click to expand</span>
          </summary>
          <pre className={styles.code}>
            <code>{resultText}</code>
          </pre>
        </details>
      )}
    </div>
  );
}

export default ToolCallBlock;
