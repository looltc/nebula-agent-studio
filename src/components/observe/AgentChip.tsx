import { memo } from 'react';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './AgentChip.module.css';

export interface AgentChipProps {
  agent: { id: string; name: string; avatar?: string | null; enabled?: boolean };
  selected: boolean;
  onSelect: (agentId: string) => void;
}

function AgentChipImpl({ agent, selected, onSelect }: AgentChipProps) {
  return (
    <button
      type="button"
      className={cx(styles.chip, selected && styles.selected)}
      onClick={() => onSelect(agent.id)}
      aria-pressed={selected}
      aria-label={`筛选 ${agent.name} 的事件`}
      title={agent.name}
    >
      <Avatar name={agent.name} size="sm" online={agent.enabled ?? true} />
      <span className={styles.name}>{agent.name}</span>
    </button>
  );
}

export const AgentChip = memo(AgentChipImpl);

export interface AgentChipAllProps {
  selected: boolean;
  onSelect: () => void;
  count: number;
}

function AgentChipAllImpl({ selected, onSelect, count }: AgentChipAllProps) {
  return (
    <button
      type="button"
      className={cx(styles.chip, styles.allChip, selected && styles.selected)}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label="查看全部 Agent 的事件"
    >
      <span className={styles.allIcon} aria-hidden="true">
        <Users size={12} />
      </span>
      <span className={styles.name}>全部</span>
      <span className={styles.count}>{count}</span>
    </button>
  );
}

export const AgentChipAll = memo(AgentChipAllImpl);
