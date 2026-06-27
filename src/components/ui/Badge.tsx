import type { ReactNode } from 'react';
import styles from './Badge.module.css';
import { cx } from '@/lib/cx';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'mono';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/** Compact label badge. text-xs, 2px/8px padding, radius-full. */
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[variant], className)}>{children}</span>
  );
}
