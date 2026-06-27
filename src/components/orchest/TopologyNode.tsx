import { memo } from 'react';
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Avatar, StatusDot, type StatusDotStatus } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './TopologyNode.module.css';

export interface TopologyNodeData extends Record<string, unknown> {
  label?: string;
  agentId: string;
  status?: string;
  lastAction?: string;
  supervisor?: boolean;
}

export type TopologyAgentNode = Node<TopologyNodeData, 'agent'>;

function statusToDot(status?: string): StatusDotStatus {
  const s = (status ?? '').toLowerCase();
  if (s === 'active' || s === 'running' || s === 'online') return 'active';
  if (s === 'error' || s === 'failed') return 'error';
  if (s === 'paused' || s === 'warning') return 'warning';
  if (s === 'loading' || s === 'thinking' || s === 'processing') return 'loading';
  return 'idle';
}

/**
 * Custom React Flow node representing a single agent in the orchestration
 * topology. Renders an Avatar, agent id (mono), a status dot, and the last
 * action. Supervisor nodes get an accent-primary border + a small "SUP" chip.
 */
function TopologyNode({ data, selected }: NodeProps<TopologyAgentNode>) {
  const { agentId, status, lastAction, supervisor } = data;
  return (
    <div
      className={cx(
        styles.node,
        supervisor && styles.supervisor,
        selected && styles.selected,
      )}
      title={agentId}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={styles.handle}
        isConnectable={false}
      />
      <div className={styles.header}>
        <Avatar
          name={agentId}
          size="sm"
          online={status === 'active' || status === 'running'}
        />
        <div className={styles.idWrap}>
          <span className={styles.id}>{agentId}</span>
          {supervisor && <span className={styles.badge}>SUP</span>}
        </div>
      </div>
      <div className={styles.statusRow}>
        <StatusDot status={statusToDot(status)} />
        <span className={styles.statusText}>{status ?? 'idle'}</span>
      </div>
      {lastAction && <div className={styles.lastAction}>last: {lastAction}</div>}
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
        isConnectable={false}
      />
    </div>
  );
}

export default memo(TopologyNode);
