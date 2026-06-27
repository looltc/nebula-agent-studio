import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch, Network } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { RelationGraphResponse, Relation } from '@/types/api';
import TopologyNode from './TopologyNode';
import styles from './RelationGraphView.module.css';

export interface RelationGraphViewProps {
  relations: RelationGraphResponse | null;
  className?: string;
}

const nodeTypes: NodeTypes = { agent: TopologyNode };

const RADIUS = 220;

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
  const id = `r-${rel.from}-${rel.to}-${rel.kind}`;
  const weight = Math.max(1, Math.min(6, rel.weight ?? 1));
  const label = `${rel.kind} · ${rel.weight ?? 1}`;
  switch (rel.kind) {
    case 'trust':
      return {
        id,
        source: rel.from,
        target: rel.to,
        label,
        labelStyle: { fill: 'var(--status-success)', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-card)', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: { stroke: 'var(--status-success)', strokeWidth: weight },
        animated: false,
      };
    case 'authority':
      return {
        id,
        source: rel.from,
        target: rel.to,
        label,
        labelStyle: { fill: 'var(--accent-primary)', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-card)', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        animated: true,
        style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-primary)', width: 16, height: 16 },
      };
    case 'collaboration':
      return {
        id,
        source: rel.from,
        target: rel.to,
        label,
        labelStyle: { fill: 'var(--accent-ring)', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-card)', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: { stroke: 'var(--accent-ring)', strokeWidth: 2, strokeDasharray: '5 4' },
        animated: false,
      };
    case 'rivalry':
      return {
        id,
        source: rel.from,
        target: rel.to,
        label,
        labelStyle: { fill: 'var(--status-destructive)', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-card)', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: { stroke: 'var(--status-destructive)', strokeWidth: 2, strokeDasharray: '4 3' },
        animated: false,
      };
    default:
      return {
        id,
        source: rel.from,
        target: rel.to,
        label,
        labelStyle: { fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-card)', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: { stroke: 'var(--text-muted)', strokeWidth: 1 },
        animated: false,
      };
  }
}

/**
 * Force-ish/automatic layout of the agent relation graph. Nodes are placed on a
 * circle and edges are styled by relation type (trust / authority /
 * collaboration / rivalry). Hovering/selecting a node highlights its edges.
 */
export default function RelationGraphView({
  relations,
  className,
}: RelationGraphViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const nodes = useMemo<Node[]>(() => {
    if (!relations) return [];
    // Backend returns only relations; derive node ids from edges.
    const ids = Array.from(
      new Set(
        (relations.relations ?? []).flatMap((r) => [r.from, r.to]),
      ),
    );
    const positions = circularLayout(ids.length, RADIUS);
    return ids.map((id, i) => {
      const pos = positions[i] ?? { x: 0, y: 0 };
      return {
        id,
        type: 'agent',
        position: pos,
        data: {
          agentId: id,
          supervisor: false,
        },
      };
    });
  }, [relations]);

  const edges = useMemo<Edge[]>(() => {
    if (!relations) return [];
    return (relations.relations ?? []).map(buildEdge);
  }, [relations]);

  const highlightedEdges = useMemo<Edge[]>(() => {
    if (!activeId) return edges;
    return edges.map((e) => {
      const connected = e.source === activeId || e.target === activeId;
      return {
        ...e,
        animated: connected ? true : e.animated,
        style: {
          ...e.style,
          opacity: connected ? 1 : 0.18,
        },
      };
    });
  }, [edges, activeId]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setActiveId((cur) => (cur === node.id ? null : node.id));
  }, []);

  if (nodes.length === 0) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          icon={<GitBranch size={28} />}
          title="No relations to display"
          description="Relation graph will appear here once agents form trust, authority, collaboration, or rivalry ties."
          className={styles.empty}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <ReactFlow
        nodes={nodes}
        edges={highlightedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={onNodeClick}
        className={className}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} className={styles.controls} />
      </ReactFlow>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>
          <Network size={12} /> relations
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--status-success)' }} />
          trust
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--accent-primary)' }} />
          authority
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.swatch}
            style={{
              background: 'var(--accent-ring)',
              backgroundImage:
                'repeating-linear-gradient(90deg, var(--accent-ring) 0 4px, transparent 4px 8px)',
            }}
          />
          collaboration
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.swatch}
            style={{
              background: 'var(--status-destructive)',
              backgroundImage:
                'repeating-linear-gradient(90deg, var(--status-destructive) 0 3px, transparent 3px 6px)',
            }}
          />
          rivalry
        </span>
      </div>
    </div>
  );
}
