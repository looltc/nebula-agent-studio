import { AlertTriangle, ChevronDown, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { ToolInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './ToolAuthorization.module.css';

export interface ToolAuthorizationProps {
  tools: ToolInfo[];
  selectedIds: string[];
  onToggle: (name: string) => void;
  className?: string;
}

function formatSchema(schema: unknown): string {
  if (schema === undefined || schema === null) return '';
  if (typeof schema === 'string') return schema;
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return String(schema);
  }
}

/**
 * Tool authorization grid. Each card is a clickable label that toggles the
 * embedded checkbox. Compact grid layout (2-3 columns) instead of a vertical
 * list. Selecting a dangerous tool surfaces an inline HITL approval warning.
 */
export function ToolAuthorization({
  tools,
  selectedIds,
  onToggle,
  className,
}: ToolAuthorizationProps) {
  if (tools.length === 0) {
    return (
      <div className={cx(styles.empty, className)}>
        <Wrench size={20} className={styles.emptyIcon} />
        <p className={styles.emptyText}>No tools registered.</p>
      </div>
    );
  }

  return (
    <div className={cx(styles.grid, className)}>
      {tools.map((tool) => {
        const checked = selectedIds.includes(tool.name);
        const dangerous = Boolean(tool.dangerous);
        const showDanger = dangerous && checked;
        return (
          <label
            key={tool.name}
            className={cx(styles.card, checked && styles.cardChecked, dangerous && styles.cardDanger)}
          >
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={checked}
              onChange={() => onToggle(tool.name)}
            />
            <div className={styles.cardBody}>
              <div className={styles.cardHead}>
                <span className={styles.toolName}>{tool.name}</span>
                <Badge variant={dangerous ? 'danger' : 'success'}>
                  {dangerous ? 'dangerous' : 'safe'}
                </Badge>
              </div>
              {tool.description && (
                <p className={styles.toolDesc}>{tool.description}</p>
              )}
              {showDanger && (
                <div className={styles.warn} role="note">
                  <AlertTriangle size={12} className={styles.warnIcon} />
                  <span>需要 HITL 审批</span>
                </div>
              )}
              {tool.schema && (
                <details className={styles.schema} onClick={(e) => e.stopPropagation()}>
                  <summary className={styles.schemaSummary}>
                    <span>参数</span>
                    <ChevronDown size={12} className={styles.schemaChevron} />
                  </summary>
                  <pre className={styles.schemaCode}>
                    <code>{formatSchema(tool.schema)}</code>
                  </pre>
                </details>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default ToolAuthorization;
