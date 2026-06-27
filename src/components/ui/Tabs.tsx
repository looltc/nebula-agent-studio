import type { ReactNode } from 'react';
import styles from './Tabs.module.css';
import { cx } from '@/lib/cx';

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export type TabsVariant = 'underline' | 'pill';

export interface TabsProps {
  tabs: TabItem[];
  /** Currently active tab key (controlled). */
  active: string;
  onChange: (key: string) => void;
  variant?: TabsVariant;
  className?: string;
}

/** Controlled tab bar. Underline = active bottom-border; pill = accent-bg chip. */
export function Tabs({
  tabs,
  active,
  onChange,
  variant = 'underline',
  className,
}: TabsProps) {
  return (
    <div
      className={cx(styles.tabs, styles[variant], className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            className={cx(
              styles.tab,
              isActive && styles.active,
              tab.disabled && styles.disabled,
            )}
            onClick={() => !tab.disabled && onChange(tab.key)}
          >
            {tab.icon && (
              <span className={styles.icon} aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
