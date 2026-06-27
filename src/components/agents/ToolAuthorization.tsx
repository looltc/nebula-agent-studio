import { AlertTriangle, ChevronDown, Wrench } from 'lucide-react';
import { Checkbox, Badge } from '@/components/ui';
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
 * Tool authorization list. Each row exposes a checkbox bound to the parent
 * store, a SAFE/DANGEROUS badge, timeout + description, and a collapsible
 * JSON parameter schema. Selecting a dangerous tool surfaces an inline HITL
 * approval warning.
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
    <div className={cx(styles.list, className)}>
      {tools.map((tool) => {
        const checked = selectedIds.includes(tool.name);
        const dangerous = Boolean(tool.dangerous);
        const showDanger = dangerous && checked;
        return (
          <div
            key={tool.name}
            className={cx(styles.row, checked && styles.rowChecked, dangerous && styles.rowDanger)}
          >
            <div className={styles.rowMain}>
              <Checkbox checked={checked} onChange={() => onToggle(tool.name)} />
              <div className={styles.rowBody}>
                <div className={styles.rowHead}>
                  <span className={styles.toolName}>{tool.name}</span>
                  <Badge variant={dangerous ? 'danger' : 'success'}>
                    {dangerous ? 'dangerous' : 'safe'}
                  </Badge>
                  {tool.timeout_s !== null && tool.timeout_s !== undefined && (
                    <span className={styles.timeout}>timeout: {tool.timeout_s}s</span>
                  )}
                </div>
                {tool.description && (
                  <p className={styles.toolDesc}>{tool.description}</p>
                )}
                {showDanger && (
                  <div className={styles.warn} role="note">
                    <AlertTriangle size={13} className={styles.warnIcon} />
                    <span>This tool requires HITL approval</span>
                  </div>
                )}
                {tool.schema && (
                  <details className={styles.schema}>
                    <summary className={styles.schemaSummary}>
                      <span>Parameters</span>
                      <ChevronDown size={13} className={styles.schemaChevron} />
                    </summary>
                    <pre className={styles.schemaCode}>
                      <code>{formatSchema(tool.schema)}</code>
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ToolAuthorization;
