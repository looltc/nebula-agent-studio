import { memo } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { cx } from '@/lib/cx';
import styles from './CompileStatus.module.css';

export type CompileStatusState = 'idle' | 'compiling' | 'success' | 'error';

export interface CompileStatusProps {
  state: CompileStatusState;
  /** success 状态下的统计描述（如 "12 nodes, 18 edges"） */
  summary?: string;
  /** error 状态下的错误条数 */
  errorCount?: number;
  className?: string;
}

const META: Record<
  CompileStatusState,
  { icon: typeof Loader2; label: string; cls: string }
> = {
  idle: { icon: Circle, label: '空闲', cls: styles.idle },
  compiling: { icon: Loader2, label: '编译中…', cls: styles.compiling },
  success: { icon: CheckCircle2, label: '编译成功', cls: styles.success },
  error: { icon: AlertCircle, label: '编译失败', cls: styles.error },
};

/**
 * 编译状态指示器。
 *
 * 显示 4 种状态：idle / compiling / success / error。
 * 用于 CompiledGraphPreview 顶部，实时反馈 POST /compile 的结果。
 */
function CompileStatus({ state, summary, errorCount, className }: CompileStatusProps) {
  const meta = META[state];
  const Icon = meta.icon;

  return (
    <div className={cx(styles.wrap, meta.cls, className)}>
      <Icon
        size={12}
        className={cx(styles.icon, state === 'compiling' && styles.spinning)}
      />
      <span className={styles.label}>{meta.label}</span>
      {state === 'success' && summary && (
        <span className={styles.detail}>{summary}</span>
      )}
      {state === 'error' && errorCount != null && errorCount > 0 && (
        <span className={styles.detail}>{errorCount} 个错误</span>
      )}
    </div>
  );
}

export default memo(CompileStatus);
