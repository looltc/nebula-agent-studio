import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';
import { cx } from '@/lib/cx';

export interface EmptyStateProps {
  /** Leading icon, ~32px. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** CTA node, typically a Button. */
  action?: ReactNode;
  className?: string;
}

/** Centered empty state with icon, title, description, and optional CTA. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.emptyState, className)} role="status">
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
