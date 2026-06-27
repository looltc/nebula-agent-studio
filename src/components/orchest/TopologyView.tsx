import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type {
  WorldStateResponse,
  RelationGraphResponse,
  Relation,
} from '@/types/api';
import TopologyNode from './TopologyNode';
import styles from './TopologyView.module.css';

export interface TopologyViewProps {
  world: WorldStateResponse | null;
  relations: RelationGraphResponse | null;
  className?: string;
}

const nodeTypes: NodeTypes = { agent: TopologyNode };

const RING_RADIUS = 200;
const SUPERVISOR_OFFSET = 280;

function isSupervisor(id: string): boolean {
  return /supervisor|orchestr/i.test(id);
}

function circularLayout(count: number, radius: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  if (count === 0) return out;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    out.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return out;
}

function buildEdge(rel: Relation): Edge {
  const id = `e-${rel.from}-${rel.to}-${rel.kind}`;
  const weight = Math.max(1, Math.min(6, rel.weight ?? 1));
  switch (rel.kind) {
    case 'trust':
      return {
        id,
        source: rel.from,
        target: rel.to,
        style: { stroke: 'var(--status-success)', strokeWidth: weight },
        animated: false,
      };
    case 'authority':
      return {
        id,
        source: rel.from,
        target: rel.to,
        animated: true,
        style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-primary)', width: 16, height: 16 },
      };
    case 'collaboration':
      return {
        id,
        source: rel.from,
        target: rel.to,
        style: { stroke: 'var(--accent-ring)', strokeWidth: 2, strokeDasharray: '5 4' },
        animated: false,
      };
    case 'rivalry':
      return {
        id,
        source: rel.from,
        target: rel.to,
        style: { stroke: 'var(--status-destructive)', strokeWidth: 2, strokeDasharray: '4 3' },
        animated: false,
      };
    default:
      return {
        id,
        source: rel.from,
        target: rel.to,
        style: { stroke: 'var(--text-muted)', strokeWidth: 1 },
        animated: false,
      };
  }
}

/**
 * Orchestration topology graph. Builds nodes from `world.agent_states` (each
 * agent becomes a node, supervisors are styled distinctly and placed at the
 * top) and edges from `relations.edges`. Uses a circular layout for agents
 * since dagre is not available.
 */
export default function TopologyView({
  world,
  relations,
  className,
}: TopologyViewProps) {
  const nodes = useMemo<Node[]>(() => {
    if (!world) return [];
    const ids = Object.keys(world.agent_states);
    const supervisors = ids.filter(isSupervisor);
    const agents = ids.filter((id) => !isSupervisor(id));
    const positions = circularLayout(agents.length, RING_RADIUS);

    const agentNodes: Node[] = agents.map((id, i) => {
      const pos = positions[i] ?? { x: 0, y: 0 };
      const info = world.agent_states[id];
      return {
        id,
        type: 'agent',
        position: pos,
        data: {
          agentId: id,
          status: info?.status,
          lastAction: info?.last_message,
          supervisor: false,
        },
      };
    });

    const supNodes: Node[] = supervisors.map((id, i) => {
      const info = world.agent_states[id];
      return {
        id,
        type: 'agent',
        position: { x: 0, y: -SUPERVISOR_OFFSET - i * 140 },
        data: {
          agentId: id,
          status: info?.status,
          lastAction: info?.last_message,
          supervisor: true,
        },
      };
    });

    return [...supNodes, ...agentNodes];
  }, [world]);

  const edges = useMemo<Edge[]>(() => {
    if (!relations) return [];
    return (relations.relations ?? []).map(buildEdge);
  }, [relations]);

  if (nodes.length === 0) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          icon={<Network size={28} />}
          title="No agents in topology"
          description="Start the world loop or register agents to see the orchestration graph."
          className={styles.empty}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        className={className}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} className={styles.controls} />
        <MiniMap
          pannable
          zoomable
          className={styles.minimap}
          nodeColor={(n) =>
            n.data?.supervisor === true
              ? 'var(--accent-primary)'
              : 'var(--accent-ring)'
          }
        />
      </ReactFlow>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Layout: circular</span>
        <span className={styles.legendItem}>
          <span
            className={styles.swatch}
            style={{ background: 'var(--accent-primary)' }}
          />
          supervisor
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.swatch}
            style={{ background: 'var(--accent-ring)' }}
          />
          agent
        </span>
      </div>
    </div>
  );
}
