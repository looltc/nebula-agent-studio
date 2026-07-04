import { useEffect } from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import { Card, ProgressBar, EmptyState, type ProgressBarVariant } from '@/components/ui';
import { cx } from '@/lib/cx';
import type { CostResponse } from '@/types/api';
import styles from './CostPanel.module.css';

interface AgentBudget {
  agent_id: string;
  total_budget_usd: number | null;
  spent_usd: number;
  daily_budget_usd: number | null;
  daily_spent_usd: number;
}

function usageVariant(pct: number): ProgressBarVariant {
  if (pct >= 90) return 'danger';
  if (pct >= 80) return 'warning';
  return 'success';
}

function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

function formatBudget(n: number | null): string {
  if (n == null) return '∞ (unlimited)';
  return formatUsd(n);
}

function AgentRow({ agent }: { agent: AgentBudget }) {
  const cap = agent.total_budget_usd;
  const pct = cap != null && cap > 0 ? (agent.spent_usd / cap) * 100 : 0;
  return (
    <div className={styles.agentRow}>
      <div className={styles.agentHead}>
        <span className={styles.agentId}>{agent.agent_id}</span>
        <span className={styles.agentUsage}>
          {formatUsd(agent.spent_usd)}{' '}
          <span className={styles.agentPct}>({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <ProgressBar
        value={agent.spent_usd}
        max={cap ?? (agent.spent_usd || 1)}
        variant={usageVariant(pct)}
        size="thin"
      />
    </div>
  );
}

function TokenUsageRow({ cost }: { cost: CostResponse }) {
  const u = cost.total_usage;
  return (
    <div className={styles.tokenRow}>
      <div className={styles.tokenCell}>
        <span className={styles.tokenLabel}>Input tokens</span>
        <span className={styles.tokenValue}>{u.input_tokens.toLocaleString()}</span>
      </div>
      <div className={styles.tokenCell}>
        <span className={styles.tokenLabel}>Output tokens</span>
        <span className={styles.tokenValue}>{u.output_tokens.toLocaleString()}</span>
      </div>
      <div className={styles.tokenCell}>
        <span className={styles.tokenLabel}>Total</span>
        <span className={styles.tokenValue}>{u.total_tokens.toLocaleString()}</span>
      </div>
      <div className={styles.tokenCell}>
        <span className={styles.tokenLabel}>Cost</span>
        <span className={styles.tokenValue}>{formatUsd(u.cost_usd)}</span>
      </div>
    </div>
  );
}

export function CostPanel() {
  const cost = useObserveStore((s) => s.cost);
  const loadCost = useObserveStore((s) => s.loadCost);

  useEffect(() => {
    void loadCost();
  }, [loadCost]);

  if (!cost) {
    return (
      <Card className={styles.overviewCard}>
        <EmptyState
          icon={<DollarSign size={24} />}
          title="No cost data"
          description="Cost data will appear here after the first LLM call."
        />
      </Card>
    );
  }

  const cap = cost.global_budget.total_budget_usd;
  const used = cost.global_budget.spent_usd;
  const overviewPct = cap != null && cap > 0 ? (used / cap) * 100 : 0;
  const overviewVariant = usageVariant(overviewPct);

  const warningLevel: 'none' | 'warn' | 'danger' =
    overviewPct >= 90 ? 'danger' : overviewPct >= 80 ? 'warn' : 'none';

  return (
    <div className={styles.wrap}>
      {warningLevel !== 'none' && (
        <div
          className={cx(styles.banner, warningLevel === 'danger' ? styles.bannerDanger : styles.bannerWarn)}
          role="alert"
        >
          <AlertTriangle size={16} />
          <span>
            {warningLevel === 'danger'
              ? `Budget critically exceeded: ${overviewPct.toFixed(0)}% of total budget used.`
              : `Budget approaching limit: ${overviewPct.toFixed(0)}% of total budget used.`}
          </span>
        </div>
      )}

      <Card className={styles.overviewCard}>
        <div className={styles.overviewHead}>
          <div className={styles.overviewTitle}>
            <DollarSign size={16} />
            <span>Budget Overview</span>
          </div>
          <span className={styles.overviewCap}>Total Budget: {formatBudget(cap)}</span>
        </div>

        <div className={styles.overviewRow}>
          <div className={styles.overviewUsed}>
            <div className={styles.overviewUsedLabel}>Spent</div>
            <div className={styles.overviewUsedValue}>{formatUsd(used)}</div>
          </div>
          <div className={styles.overviewBar}>
            <ProgressBar
              value={used}
              max={cap ?? (used || 1)}
              variant={overviewVariant}
              size="thick"
            />
            <div className={styles.overviewPctRow}>
              <span>{cap != null ? `${overviewPct.toFixed(1)}%` : '—'}</span>
              <span className={styles.overviewRemain}>
                {cap != null ? `${formatUsd(Math.max(cap - used, 0))} remaining` : 'unlimited'}
              </span>
            </div>
          </div>
        </div>

        <TokenUsageRow cost={cost} />
      </Card>

      <Card className={styles.agentsCard}>
        <div className={styles.agentsTitle}>Per Agent</div>
        {cost.agents.length === 0 ? (
          <EmptyState
            title="No per-agent budgets"
            description="Per-agent budget breakdown will appear here once budgets are created via CostController.create_budget()."
          />
        ) : (
          <div className={styles.agentList}>
            {cost.agents.map((a) => (
              <AgentRow key={a.agent_id} agent={a} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default CostPanel;
