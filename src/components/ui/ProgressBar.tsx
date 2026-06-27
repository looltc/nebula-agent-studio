import styles from './ProgressBar.module.css';
import { cx } from '@/lib/cx';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'danger';
export type ProgressBarSize = 'thin' | 'thick';

export interface ProgressBarProps {
  /** 0–max. When undefined, renders an indeterminate animated bar. */
  value?: number;
  max?: number;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  className?: string;
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/** Determinate or indeterminate progress bar. */
export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  size = 'thin',
  className,
}: ProgressBarProps) {
  const indeterminate = value === undefined || value === null;
  const safeMax = max <= 0 ? 100 : max;
  const pct = indeterminate
    ? 0
    : clamp((value / safeMax) * 100, 0, 100);

  return (
    <div
      className={cx(styles.track, styles[size], className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={indeterminate ? undefined : value}
    >
      {indeterminate ? (
        <div className={cx(styles.fill, styles[variant], styles.indeterminate)} />
      ) : (
        <div
          className={cx(styles.fill, styles[variant])}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
