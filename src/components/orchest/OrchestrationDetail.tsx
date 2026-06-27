import { useMemo } from 'react';
import { GitBranch, ChevronDown } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import type { WorldStateResponse } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './OrchestrationDetail.module.css';

export interface OrchestrationDetailProps {
  world: WorldStateResponse | null;
  className?: string;
}

interface SpecNode {
  id: string;
  type: 'supervisor' | 'agent';
  ref: string;
}

interface SpecEdge {
  source: string;
  target: string;
  cond?: string;
}

interface GraphSpec {
  name: string;
  mode: 'Supervisor';
  entry_point: string;
  nodes: SpecNode[];
  edges: SpecEdge[];
}

function isSupervisor(id: string): boolean {
  return /supervisor|orchestr/i.test(id);
}

/**
 * Build a synthetic GraphSpec from the world's agent states for display only.
 * Supervisors become "supervisor" nodes; everyone else becomes an "agent"
 * node. Edges connect each supervisor to/from each agent with synthetic
 * `cond` labels in the spirit of the orchestration GraphSpec.
 */
function deriveSpec(world: WorldStateResponse): GraphSpec {
  const ids = Object.keys(world.agent_states);
  const supervisors = ids.filter(isSupervisor);
  const agents = ids.filter((id) => !isSupervisor(id));

  const nodes: SpecNode[] = [
    ...supervisors.map((id, i) => ({
      id: i === 0 ? 'sup' : `sup${i + 1}`,
      type: 'supervisor' as const,
      ref: id,
    })),
    ...agents.map((id, i) => ({
      id: `a${i + 1}`,
      type: 'agent' as const,
      ref: id,
    })),
  ];

  const supId = supervisors.length > 0 ? 'sup' : '';
  const edges: SpecEdge[] = [];
  if (supId) {
    for (let i = 0; i < agents.length; i++) {
      const aId = `a${i + 1}`;
      edges.push({ source: supId, target: aId, cond: `route_${aId}` });
      edges.push({ source: aId, target: supId });
    }
  } else if (agents.length >= 2) {
    // No supervisor: chain the agents as a minimal swarm-style fallback.
    for (let i = 0; i < agents.length - 1; i++) {
      edges.push({ source: `a${i + 1}`, target: `a${i + 2}` });
    }
  }

  const name = supervisors[0] ?? 'default';
  const entry_point = supId || (agents.length > 0 ? 'a1' : '');

  return { name, mode: 'Supervisor', entry_point, nodes, edges };
}

/**
 * Read-only GraphSpec view. Derives a synthetic orchestration spec from the
 * world state and renders it as a Card with header (Graph / Mode / Entry Point)
 * plus collapsible Nodes and Edges blocks in mono JSON.
 */
export default function OrchestrationDetail({
  world,
  className,
}: OrchestrationDetailProps) {
  const spec = useMemo(() => (world ? deriveSpec(world) : null), [world]);

  if (!world || !spec) {
    return (
      <Card className={cx(styles.card, className)}>
        <EmptyState
          icon={<GitBranch size={28} />}
          title="No orchestration spec"
          description="A synthetic GraphSpec will appear here once the world has agents."
          className={styles.empty}
        />
      </Card>
    );
  }

  const nodesJson = JSON.stringify(spec.nodes, null, 2);
  const edgesJson = JSON.stringify(spec.edges, null, 2);

  return (
    <Card className={cx(styles.card, className)}>
      <div className={styles.head}>
        <GitBranch size={14} className={styles.icon} />
        <h3 className={styles.title}>Graph: {spec.name}</h3>
      </div>

      <dl className={styles.meta}>
        <div className={styles.metaItem}>
          <dt>Mode</dt>
          <dd>{spec.mode}</dd>
        </div>
        <div className={styles.metaItem}>
          <dt>Entry Point</dt>
          <dd className={styles.mono}>{spec.entry_point || '—'}</dd>
        </div>
        <div className={styles.metaItem}>
          <dt>Nodes</dt>
          <dd>{spec.nodes.length}</dd>
        </div>
        <div className={styles.metaItem}>
          <dt>Edges</dt>
          <dd>{spec.edges.length}</dd>
        </div>
      </dl>

      <details className={styles.block} open>
        <summary className={styles.summary}>
          <span>Nodes</span>
          <ChevronDown size={14} className={styles.chevron} />
        </summary>
        <pre className={styles.code}>
          <code>{nodesJson}</code>
        </pre>
      </details>

      <details className={styles.block}>
        <summary className={styles.summary}>
          <span>Edges</span>
          <ChevronDown size={14} className={styles.chevron} />
        </summary>
        <pre className={styles.code}>
          <code>{edgesJson}</code>
        </pre>
      </details>
    </Card>
  );
}
