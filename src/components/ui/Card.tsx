import type { ReactNode } from 'react';
import { MoreHorizontal, ChevronDown, Wrench } from 'lucide-react';
import styles from './Card.module.css';
import { cx } from '@/lib/cx';
import { Badge } from './Badge';
import { StatusDot, type StatusDotStatus } from './StatusDot';
import { Avatar } from './Avatar';

/* ------------------------------------------------------------------ */
/* Card (base)                                                          */
/* ------------------------------------------------------------------ */

export interface CardProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cx(styles.card, onClick && styles.clickable, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatCard                                                             */
/* ------------------------------------------------------------------ */

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Delta string, e.g. "12%". Renders with an up/down arrow. */
  delta?: string;
  /** Direction of the delta arrow. Defaults to true (up). */
  deltaPositive?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive = true,
  className,
}: StatCardProps) {
  return (
    <div className={cx(styles.card, styles.statCard, className)}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {delta ? (
        <div
          className={cx(
            styles.statDelta,
            deltaPositive ? styles.deltaUp : styles.deltaDown,
          )}
        >
          {deltaPositive ? '▲' : '▼'} {delta}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AgentCard                                                            */
/* ------------------------------------------------------------------ */

export interface AgentCardProps {
  name: string;
  avatarSize?: 'sm' | 'md' | 'lg';
  online?: boolean;
  role?: string;
  model?: string;
  thinking?: string;
  tools?: string[];
  status?: StatusDotStatus;
  onMenuClick?: () => void;
  className?: string;
}

export function AgentCard({
  name,
  avatarSize = 'md',
  online = false,
  role,
  model,
  thinking,
  tools,
  status = 'idle',
  onMenuClick,
  className,
}: AgentCardProps) {
  const hasMeta = role || model || thinking;
  return (
    <div className={cx(styles.card, styles.agentCard, className)}>
      <div className={styles.agentHeader}>
        <div className={styles.agentId}>
          <Avatar name={name} size={avatarSize} online={online} />
          <span className={styles.agentName}>{name}</span>
        </div>
        {onMenuClick && (
          <button
            type="button"
            className={styles.menuBtn}
            onClick={onMenuClick}
            aria-label={`Actions for ${name}`}
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>

      {hasMeta && (
        <div className={styles.agentMeta}>
          {role && (
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Role</span>
              <span className={styles.metaVal}>{role}</span>
            </div>
          )}
          {model && (
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Model</span>
              <span className={styles.metaVal}>{model}</span>
            </div>
          )}
          {thinking && (
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Thinking</span>
              <span className={styles.metaVal}>{thinking}</span>
            </div>
          )}
        </div>
      )}

      {(tools && tools.length > 0) || status ? (
        <div className={styles.divider} />
      ) : null}

      {tools && tools.length > 0 && (
        <div className={styles.toolRow}>
          <span className={styles.rowLabel}>Tools</span>
          <div className={styles.badgeList}>
            {tools.map((t) => (
              <Badge key={t} variant="primary">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {status && (
        <div className={styles.toolRow}>
          <span className={styles.rowLabel}>Status</span>
          <div className={styles.statusRow}>
            <StatusDot status={status} />
            <span className={styles.statusText}>{status}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ToolCard                                                             */
/* ------------------------------------------------------------------ */

export interface ToolCardProps {
  name: string;
  description?: string;
  /** Whether the tool is destructive/sensitive. Drives SAFE/DANGER badge. */
  dangerous?: boolean;
  /** Optional custom icon. Defaults to a wrench. */
  icon?: ReactNode;
  /** Parameter schema to render (collapsible). Object or JSON string. */
  schema?: unknown;
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

export function ToolCard({
  name,
  description,
  dangerous = false,
  icon,
  schema,
  className,
}: ToolCardProps) {
  const schemaText = formatSchema(schema);
  return (
    <div className={cx(styles.card, styles.toolCard, className)}>
      <div className={styles.toolHeader}>
        <div className={styles.toolId}>
          <span className={styles.toolIcon} aria-hidden="true">
            {icon ?? <Wrench size={16} />}
          </span>
          <span className={styles.toolName}>{name}</span>
        </div>
        <Badge variant={dangerous ? 'danger' : 'success'}>
          {dangerous ? 'DANGER' : 'SAFE'}
        </Badge>
      </div>

      {description && <p className={styles.toolDesc}>{description}</p>}

      {schemaText && (
        <>
          <div className={styles.divider} />
          <details className={styles.schema}>
            <summary className={styles.schemaSummary}>
              <span>Parameters</span>
              <ChevronDown size={14} className={styles.schemaChevron} />
            </summary>
            <pre className={styles.schemaCode}>
              <code>{schemaText}</code>
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
