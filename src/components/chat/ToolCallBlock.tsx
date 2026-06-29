import { useEffect, useRef, useState } from 'react';
import { Wrench, Check, X, ChevronRight } from 'lucide-react';
import type { StreamingTool } from '@/stores/chatStore';
import { Spinner } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './ToolCallBlock.module.css';

export interface ToolCallBlockProps {
  tool: StreamingTool;
  /**
   * 自动展开（流式中且为当前活跃工具时为 true）。
   * 与 TimelineView 的 ThinkingItem 一致的折叠时机：
   * - autoOpen=true 时展开
   * - autoOpen 变为 false（后续事件到达或流式结束）时自动折叠
   * - 用户手动操作后接管，不再受 autoOpen 控制
   */
  autoOpen?: boolean;
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

function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * 工具调用卡片：整体作为一个折叠行（与思考步骤一致的交互）。
 *
 * - summary = header（chevron + 工具图标 + 名称 + 状态）
 * - 展开后 = 参数/结果/错误，始终展开，无内部折叠按钮
 * - 折叠时机由 autoOpen 控制（与 thinking 一起展开/收起）
 */
export function ToolCallBlock({ tool, autoOpen = false }: ToolCallBlockProps) {
  const { tool: name, args, status, result, durationMs, error } = tool;
  const isError = status === 'error';
  const duration = formatDuration(durationMs);
  const argsText = formatJson(args);
  const resultText = formatJson(result);

  // autoOpen 从 true→false 时自动折叠（与 ThinkingItem 一致）
  const [userToggled, setUserToggled] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const prevAutoOpen = useRef(autoOpen);

  useEffect(() => {
    if (prevAutoOpen.current && !autoOpen && !userToggled) {
      setUserOpen(false);
    }
    prevAutoOpen.current = autoOpen;
  }, [autoOpen, userToggled]);

  const isOpen = userToggled ? userOpen : autoOpen;

  return (
    <details
      className={cx(styles.block, isError && styles.blockError)}
      open={isOpen}
      onToggle={(e) => {
        if (userToggled) return;
        setUserToggled(true);
        setUserOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className={styles.header}>
        <div className={styles.id}>
          <ChevronRight size={12} className={styles.chevron} aria-hidden="true" />
          <span className={styles.icon} aria-hidden="true">
            <Wrench size={13} />
          </span>
          <span className={styles.name}>{name}</span>
        </div>
        <div className={styles.status}>
          {status === 'loading' && (
            <>
              <Spinner size="sm" />
              <span className={cx(styles.statusText, styles.loading)}>执行中…</span>
            </>
          )}
          {status === 'done' && (
            <>
              <Check size={13} className={styles.doneIcon} />
              <span className={cx(styles.statusText, styles.done)}>
                {duration ? `完成 · ${duration}` : '完成'}
              </span>
            </>
          )}
          {status === 'error' && (
            <>
              <X size={13} className={styles.errorIcon} />
              <span className={cx(styles.statusText, styles.error)}>失败</span>
            </>
          )}
        </div>
      </summary>

      <div className={styles.body}>
        {/* 始终展开：参数、结果、错误 都直接展示，无折叠按钮 */}
        {argsText && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>参数</div>
            <pre className={styles.code}>
              <code>{argsText}</code>
            </pre>
          </div>
        )}

        {isError && error && (
          <div className={styles.section}>
            <div className={cx(styles.sectionLabel, styles.errorLabel)}>错误</div>
            <pre className={cx(styles.code, styles.codeError)}>
              <code>{error}</code>
            </pre>
          </div>
        )}

        {status === 'done' && resultText && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>结果</div>
            <pre className={styles.code}>
              <code>{resultText}</code>
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

export default ToolCallBlock;
