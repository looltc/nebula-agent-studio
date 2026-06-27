import { DollarSign, AlertTriangle } from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import { Card, ProgressBar, EmptyState, type ProgressBarVariant } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './CostPanel.module.css';

interface PerAgent {
  agentId: string;
  used: number;
  cap: number;
}

function usageVariant(pct: number): ProgressBarVariant {
  if (pct >= 90) return 'danger';
  if (pct >= 80) return 'warning';
  return 'success';
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function AgentRow({ agent }: { agent: PerAgent }) {
  const pct = agent.cap > 0 ? (agent.used / agent.cap) * 100 : 0;
  return (
    <div className={styles.agentRow}>
      <div className={styles.agentHead}>
        <span className={styles.agentId}>{agent.agentId}</span>
        <span className={styles.agentUsage}>
          {formatUsd(agent.used)}{' '}
          <span className={styles.agentPct}>({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <ProgressBar
        value={agent.used}
        max={agent.cap}
        variant={usageVariant(pct)}
        size="thin"
      />
    </div>
  );
}

export function CostPanel() {
  const cost = useObserveStore((s) => s.cost);

  const cap = cost.dailyCap;
  const used = cost.used;
  const overviewPct = cap > 0 ? (used / cap) * 100 : 0;
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
              ? `Budget critically exceeded: ${overviewPct.toFixed(0)}% of daily cap used.`
              : `Budget approaching limit: ${overviewPct.toFixed(0)}% of daily cap used.`}
          </span>
        </div>
      )}

      <Card className={styles.overviewCard}>
        <div className={styles.overviewHead}>
          <div className={styles.overviewTitle}>
            <DollarSign size={16} />
            <span>Budget Overview</span>
          </div>
          <span className={styles.overviewCap}>Daily Cap: {formatUsd(cap)}</span>
        </div>

        <div className={styles.overviewRow}>
          <div className={styles.overviewUsed}>
            <div className={styles.overviewUsedLabel}>Used</div>
            <div className={styles.overviewUsedValue}>{formatUsd(used)}</div>
          </div>
          <div className={styles.overviewBar}>
            <ProgressBar
              value={used}
              max={cap}
              variant={overviewVariant}
              size="thick"
            />
            <div className={styles.overviewPctRow}>
              <span>{overviewPct.toFixed(1)}%</span>
              <span className={styles.overviewRemain}>
                {formatUsd(Math.max(cap - used, 0))} remaining
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.agentsCard}>
        <div className={styles.agentsTitle}>Per Agent</div>
        {cost.perAgent.length === 0 ? (
          <EmptyState
            title="No per-agent cost data"
            description="Cost breakdown by agent will appear here once metrics report spend."
          />
        ) : (
          <div className={styles.agentList}>
            {cost.perAgent.map((a) => (
              <AgentRow key={a.agentId} agent={a} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default CostPanel;
