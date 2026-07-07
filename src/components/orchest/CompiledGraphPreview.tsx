import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, Eye } from 'lucide-react';
import type { CompiledGraphView } from '@/types/api';
import CanvasNode, { type CanvasNodeData } from './CanvasNode';
import CompileStatus, { type CompileStatusState } from './CompileStatus';
import { EmptyState } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './CompiledGraphPreview.module.css';

export interface CompiledGraphPreviewProps {
  /** 后端编译返回的 CompiledGraphView；为 null 时显示空态 */
  view: CompiledGraphView | null;
  /** 编译中标志（来自 store.compiling） */
  compiling: boolean;
  /** 编译错误列表（来自 store.compileErrors） */
  compileErrors: string[];
  /** 运行时高亮节点 id（来自 runtime.current_agent） */
  runningNodeId?: string | null;
  className?: string;
}

const nodeTypes: NodeTypes = { canvas: CanvasNode };

type CanvasRFNode = Node<CanvasNodeData, 'canvas'>;

const RING_RADIUS = 180;
const LAYER_GAP = 140;

/** 圆形布局（用于并行节点组） */
function circularLayout(
  count: number,
  radius: number,
  centerX = 0,
  centerY = 0,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  if (count === 0) return out;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    out.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
  return out;
}

/**
 * 简单层次布局：entry_node 居中第一层，其余按入度分层；同层节点圆形排列。
 *
 * 由于 CompiledGraphView 不携带坐标，preview 必须自行 layout。
 * 这里实现一个最小可用的层次布局（拓扑分层 + 同层圆形），
 * 避免引入 dagre 等额外依赖。
 */
function layoutNodes(view: CompiledGraphView): CanvasRFNode[] {
  const { nodes: viewNodes, edges: viewEdges, entry_point } = view;
  if (viewNodes.length === 0) return [];

  // 入度统计（仅按非条件边）
  const inDegree = new Map<string, number>();
  for (const n of viewNodes) inDegree.set(n.id, 0);
  for (const e of viewEdges) {
    if (e.target !== '__end__') {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
  }

  // 分层：BFS 从 entry_point 出发；没有 entry 时按入度=0 起点
  const layerOf = new Map<string, number>();
  const queue: string[] = [];
  if (entry_point && inDegree.has(entry_point)) {
    layerOf.set(entry_point, 0);
    queue.push(entry_point);
  } else {
    for (const n of viewNodes) {
      if ((inDegree.get(n.id) ?? 0) === 0) {
        layerOf.set(n.id, 0);
        queue.push(n.id);
      }
    }
  }
  // 兜底：所有节点都是 entry（无入边）的话，把第一个设为 0 层
  if (queue.length === 0 && viewNodes[0]) {
    layerOf.set(viewNodes[0].id, 0);
    queue.push(viewNodes[0].id);
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curLayer = layerOf.get(cur) ?? 0;
    for (const e of viewEdges) {
      if (e.source !== cur) continue;
      if (e.target === '__end__') continue;
      const next = e.target;
      const nextLayer = curLayer + 1;
      if (!layerOf.has(next) || (layerOf.get(next) ?? 0) < nextLayer) {
        layerOf.set(next, nextLayer);
        queue.push(next);
      }
    }
  }

  // 按 layer 分组
  const layers = new Map<number, string[]>();
  for (const n of viewNodes) {
    const l = layerOf.get(n.id) ?? 0;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(n.id);
  }

  // 计算坐标：每层圆形布局，层间垂直间距 LAYER_GAP
  const positions = new Map<string, { x: number; y: number }>();
  const maxLayer = Math.max(...layers.keys(), 0);
  for (let l = 0; l <= maxLayer; l++) {
    const ids = layers.get(l) ?? [];
    if (ids.length === 0) continue;
    const y = l * LAYER_GAP - (maxLayer * LAYER_GAP) / 2;
    if (ids.length === 1) {
      positions.set(ids[0], { x: 0, y });
    } else {
      const layout = circularLayout(ids.length, RING_RADIUS, 0, y);
      ids.forEach((id, i) => positions.set(id, layout[i]));
    }
  }

  return viewNodes.map((n) => ({
    id: n.id,
    type: 'canvas',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      type: n.type,
      agent_ref: n.agent_ref,
      config: {},
      is_entry: n.is_entry,
      is_end: n.is_end,
      running: false,
    },
  }));
}

function viewToEdges(view: CompiledGraphView): Edge[] {
  // 过滤掉 __end__ 终止边：real 模式会返回 end → __end__ 的边，
  // 但 __end__ 不是真实节点（不在 view.nodes 中），渲染会变成悬空边。
  return view.edges
    .filter((e) => e.target !== '__end__' && e.source !== '__start__')
    .map((e, i) => {
      const id = `ce-${e.source}-${e.target}-${i}`;
      return {
        id,
        source: e.source,
        target: e.target,
        label: e.cond ?? undefined,
        type: 'smoothstep',
        animated: e.is_conditional,
        style: {
          stroke: e.is_conditional
            ? 'var(--accent-primary)'
            : 'var(--text-muted)',
          strokeWidth: e.is_conditional ? 2 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.is_conditional
            ? 'var(--accent-primary)'
            : 'var(--text-muted)',
          width: 16,
          height: 16,
        },
        data: { cond: e.cond },
      };
    });
}

/**
 * CompiledGraphPreview：只读展示编译后的编排图结构。
 *
 * 数据源：后端 POST /specs/{id}/compile 返回的 CompiledGraphView。
 * 与 InfiniteCanvasEditor 区别：
 * - 只读（nodesDraggable=false, nodesConnectable=false）
 * - 节点位置由前端 layout 计算（CompiledGraphView 不携带坐标）
 * - 顶部显示 CompileStatus 指示器 + 编译错误列表
 * - 运行时高亮：通过 runningNodeId 标识当前执行节点
 */
export default function CompiledGraphPreview({
  view,
  compiling,
  compileErrors,
  runningNodeId,
  className,
}: CompiledGraphPreviewProps) {
  const nodes = useMemo(() => {
    if (!view) return [];
    const laid = layoutNodes(view);
    if (runningNodeId) {
      return laid.map((n) => ({
        ...n,
        data: { ...n.data, running: n.id === runningNodeId },
      }));
    }
    return laid;
  }, [view, runningNodeId]);

  const edges = useMemo(() => (view ? viewToEdges(view) : []), [view]);

  // 编译状态
  const status: CompileStatusState = compiling
    ? 'compiling'
    : !view
      ? 'idle'
      : compileErrors.length > 0
        ? 'error'
        : 'success';

  const summary = view
    ? `${view.nodes.length} 节点，${view.edges.length} 边`
    : undefined;

  if (!view && !compiling) {
    return (
      <div className={cx(styles.wrap, className)}>
        <div className={styles.head}>
          <Eye size={14} className={styles.headIcon} />
          <span className={styles.headTitle}>编译预览</span>
        </div>
        <EmptyState
          icon={<Eye size={28} />}
          title="暂无编译结果"
          description="编译编排图后在此查看实时图结构。"
          className={styles.empty}
        />
      </div>
    );
  }

  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.head}>
        <Eye size={14} className={styles.headIcon} />
        <span className={styles.headTitle}>编译预览</span>
        <CompileStatus
          state={status}
          summary={summary}
          errorCount={compileErrors.length}
          className={styles.status}
        />
      </div>

      {compileErrors.length > 0 && (
        <div className={styles.errors}>
          <AlertTriangle size={12} className={styles.errorIcon} />
          <ul className={styles.errorList}>
            {compileErrors.map((err, i) => (
              <li key={i} className={styles.errorItem}>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.flowWrap}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          className={styles.flow}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
