import styles from './StatusDot.module.css';
import { cx } from '@/lib/cx';

export type StatusDotStatus = 'active' | 'idle' | 'error' | 'warning' | 'loading';

export interface StatusDotProps {
  status: StatusDotStatus;
  /** Circle diameter in px. Defaults to 8. */
  size?: number;
  className?: string;
}

/** 8px status indicator with per-status animation (pulse/flash/spin). */
export function StatusDot({ status, size = 8, className }: StatusDotProps) {
  return (
    <span
      className={cx(styles.dot, styles[status], className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label={status}
    />
  );
}
