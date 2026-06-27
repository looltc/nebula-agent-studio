import type { ReactNode } from 'react';
import styles from './ContentHeader.module.css';

interface ContentHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export default function ContentHeader({
  title,
  subtitle,
  actions,
  filters,
}: ContentHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {filters && <div className={styles.filters}>{filters}</div>}
    </div>
  );
}
