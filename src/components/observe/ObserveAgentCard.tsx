import { memo } from 'react';
import { Cpu, Coins, Zap, Wrench } from 'lucide-react';
import type { AgentObservation } from '@/types/api';
import { Avatar, Badge, type BadgeVariant } from '@/components/ui';
import { cx } from '@/lib/cx';
import { formatRelativeTime } from '@/lib/datetime';
import styles from './ObserveAgentCard.module.css';

interface ObserveAgentCardProps {
  agent: AgentObservation;
  selected: boolean;
  onSelect: (agentId: string) => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(usd: number): string {
  if (usd <= 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function topTools(byTool: Record<string, number>, limit = 3): Array<[string, number]> {
  return Object.entries(byTool)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function ObserveAgentCardImpl({ agent, selected, onSelect }: ObserveAgentCardProps) {
  const enabledVariant: BadgeVariant = agent.enabled ? 'success' : 'default';
  const tools = topTools(agent.tool_calls_by_tool);

  return (
    <button
      type="button"
      className={cx(styles.card, selected && styles.selected)}
      onClick={() => onSelect(agent.id)}
      aria-pressed={selected}
      aria-label={`观测 ${agent.name}`}
    >
      {/* ===== Header ===== */}
      <div className={styles.header}>
        <div className={styles.identity}>
          <Avatar name={agent.name} size="sm" online={agent.enabled} />
          <div className={styles.meta}>
            <div className={styles.nameRow}>
              <span className={styles.name} title={agent.name}>
                {agent.name}
              </span>
              <Badge variant={enabledVariant}>
                {agent.enabled ? '启用' : '停用'}
              </Badge>
            </div>
            <div className={styles.subRow} title={agent.llm_model}>
              <span className={styles.model}>{agent.llm_model || '—'}</span>
              {agent.thinking_model && (
                <>
                  <span className={styles.dot}>·</span>
                  <span className={styles.thinking}>{agent.thinking_model}</span>
                </>
              )}
            </div>
            <div className={styles.activeRow}>
              {agent.last_active ? (
                <>
                  <span className={styles.activeDot} aria-hidden="true" />
                  <span className={styles.activeText}>
                    最后活跃 {formatRelativeTime(agent.last_active)}
                  </span>
                </>
              ) : (
                <span className={styles.activeText}>无活动记录</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Stats grid ===== */}
      <div className={styles.stats}>
        <div className={styles.stat} title="累计 Tokens（输入/输出）">
          <div className={styles.statIcon}>
            <Cpu size={14} aria-hidden="true" />
          </div>
          <div className={styles.statBody}>
            <div className={styles.statValue}>{formatNumber(agent.total_tokens)}</div>
            <div className={styles.statLabel}>
              ↑{formatNumber(agent.input_tokens)} ↓{formatNumber(agent.output_tokens)}
            </div>
          </div>
        </div>

        <div className={styles.stat} title="累计花费（今日）">
          <div className={styles.statIcon}>
            <Coins size={14} aria-hidden="true" />
          </div>
          <div className={styles.statBody}>
            <div className={styles.statValue}>{formatCost(agent.cost_usd)}</div>
            <div className={styles.statLabel}>今日 {formatCost(agent.daily_cost_usd)}</div>
          </div>
        </div>

        <div className={styles.stat} title="LLM 调用次数">
          <div className={styles.statIcon}>
            <Zap size={14} aria-hidden="true" />
          </div>
          <div className={styles.statBody}>
            <div className={styles.statValue}>{formatNumber(agent.llm_calls)}</div>
            <div className={styles.statLabel}>LLM 调用</div>
          </div>
        </div>

        <div className={styles.stat} title="工具调用次数">
          <div className={styles.statIcon}>
            <Wrench size={14} aria-hidden="true" />
          </div>
          <div className={styles.statBody}>
            <div className={styles.statValue}>{formatNumber(agent.tool_calls)}</div>
            <div className={styles.statLabel}>工具调用</div>
          </div>
        </div>
      </div>

      {/* ===== Top tools ===== */}
      {tools.length > 0 && (
        <div className={styles.toolsRow}>
          <span className={styles.toolsLabel}>Top 工具</span>
          <div className={styles.toolsList}>
            {tools.map(([name, count]) => (
              <Badge key={name} variant="mono">
                {name} · {count}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

export const ObserveAgentCard = memo(ObserveAgentCardImpl);
export default ObserveAgentCard;
