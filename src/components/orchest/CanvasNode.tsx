import { memo } from 'react';
import {
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  useConnection,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  Bot,
  Play,
  Square,
  Brain,
  Wrench,
  GitBranch,
  Code,
  Plug,
  Puzzle,
  X,
  Type,
} from 'lucide-react';
import type {
  GraphNodeType,
  NodeTypeDef,
  PortSpec,
} from '@/types/api';
import { PORT_TYPE_COLORS } from '@/types/api';
import { useAgentStore } from '@/stores/agentStore';
import { cx } from '@/lib/cx';
import styles from './CanvasNode.module.css';

/** Canvas 节点 data 结构 */
export interface CanvasNodeData extends Record<string, unknown> {
  type: GraphNodeType;
  label?: string | null;
  agent_ref?: string | null;
  tool_name?: string | null;
  config?: Record<string, unknown>;
  is_entry?: boolean;
  is_end?: boolean;
  running?: boolean;
  mode?: 'always' | 'never' | 'bypass';
  def?: NodeTypeDef | null;
  /** 流式执行时该节点的输出文本（实时更新，用于卡片内预览） */
  streamOutput?: string | null;
}

export type CanvasNode = Node<CanvasNodeData, 'canvas'>;

/** 10 种节点类型的元信息（图标 + 主题色） */
const TYPE_META: Record<
  GraphNodeType,
  { icon: typeof Bot; accent: string }
> = {
  start: { icon: Play, accent: '#22c55e' },
  end: { icon: Square, accent: '#ef4444' },
  llm: { icon: Brain, accent: '#8b5cf6' },
  agent: { icon: Bot, accent: '#0065fd' },
  tool: { icon: Wrench, accent: '#f59e0b' },
  logic: { icon: GitBranch, accent: '#06b6d4' },
  code: { icon: Code, accent: '#a855f7' },
  connector: { icon: Plug, accent: '#10b981' },
  custom: { icon: Puzzle, accent: '#7f8d9f' },
  text: { icon: Type, accent: '#6366f1' },
};

const MODE_META: Record<
  'always' | 'never' | 'bypass',
  { label: string; className: string }
> = {
  always: { label: '执行', className: styles.modeAlways },
  never: { label: '禁用', className: styles.modeNever },
  bypass: { label: '透传', className: styles.modeBypass },
};

/** 端口垂直位置：第一个距顶 30px，之后每个间隔 24px */
function portTopOffset(index: number): number {
  const HEADER_OFFSET = 30;
  const PORT_GAP = 24;
  return HEADER_OFFSET + index * PORT_GAP;
}

/** 单个端口的 Handle 渲染 */
function PortHandle({
  port,
  kind,
  index,
  highlight,
}: {
  port: PortSpec;
  kind: 'source' | 'target';
  index: number;
  highlight: boolean;
}) {
  const color = PORT_TYPE_COLORS[port.type] ?? '#9ca3af';
  const isSource = kind === 'source';
  const position = isSource ? Position.Right : Position.Left;
  const top = portTopOffset(index);

  return (
    <Handle
      type={isSource ? 'source' : 'target'}
      position={position}
      id={port.name}
      style={{
        background: color,
        top: `${top}px`,
        bottom: 'auto',
      }}
      className={cx(
        styles.handle,
        styles.handleTyped,
        highlight && styles.handleConnecting,
      )}
      isConnectable
      title={`${port.name}: ${port.type}${port.required ? ' *' : ''}`}
    >
      <span
        className={cx(
          styles.portLabel,
          isSource ? styles.portLabelSource : styles.portLabelTarget,
        )}
        style={{ color }}
      >
        {port.name}
      </span>
    </Handle>
  );
}

/**
 * 无限画布自定义节点（v4）。
 *
 * v4 改动：
 * - header 显示末端名（display），不再显示类别名（meta.label）
 * - body 不再重复 label（header 已显示）
 * - start/end 节点可删除
 * - 连接中时端口高亮（useConnection 跟踪连接状态）
 */
function CanvasNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const { deleteElements } = useReactFlow();
  const connection = useConnection();
  const agents = useAgentStore((s) => s.agents);

  const meta = TYPE_META[data.type] ?? TYPE_META.agent;
  const Icon = meta.icon;
  const accent = meta.accent;
  // 显示名优先级：label > agent_ref > tool_name > id
  const display = data.label || data.agent_ref || data.tool_name || id;
  const def = data.def ?? null;
  const inputs = def?.inputs ?? [];
  const outputs = def?.outputs ?? [];
  const mode = data.mode ?? 'always';
  const modeMeta = MODE_META[mode];

  // Agent 身份卡信息（仅 agent 节点显示）
  const agentInfo = data.type === 'agent' && data.agent_ref
    ? agents.find((a) => a.id === data.agent_ref)
    : null;

  // 是否正在连接（从某个端口拖出）
  const isConnecting = !!connection.fromHandle;
  // 连接起始端口的 nodeId / type（'source' | 'target'）
  const fromNodeId = connection.fromHandle?.nodeId;
  const fromHandleType = connection.fromHandle?.type;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    void deleteElements({ nodes: [{ id }] });
  };

  // 节点最小高度（根据端口数量 + Agent 信息卡 + 输出区）
  const portCount = Math.max(inputs.length, outputs.length);
  const agentCardHeight = agentInfo ? 28 : 0;
  const nodeMinHeight = 30 + portCount * 24 + agentCardHeight + 60 + 12;

  return (
    <div
      className={cx(
        styles.node,
        selected && styles.selected,
        data.is_entry && styles.entry,
        data.is_end && styles.endNode,
        data.running && styles.running,
        mode !== 'always' && styles.muted,
        isConnecting && styles.connecting,
      )}
      style={{
        ['--node-accent' as string]: accent,
        minHeight: `${nodeMinHeight}px`,
      }}
    >
      {/* ---- 拖拽调整大小（仅选中时显示手柄）---- */}
      <NodeResizer
        minWidth={240}
        minHeight={120}
        maxWidth={600}
        maxHeight={500}
        isVisible={!!selected}
        color={accent}
      />

      {/* ---- 输入端口（左侧）---- */}
      {inputs.length > 0 ? (
        inputs.map((p, i) => (
          <PortHandle
            key={`in-${p.name}`}
            port={p}
            kind="target"
            index={i}
            // 连接中：如果 from 是 source（输出端口拖出），则高亮所有 target 端口
            highlight={isConnecting && fromHandleType === 'source' && fromNodeId !== id}
          />
        ))
      ) : (
        data.type !== 'start' && (
          <Handle
            type="target"
            position={Position.Left}
            className={cx(
              styles.handle,
              isConnecting && fromHandleType === 'source' && fromNodeId !== id && styles.handleConnecting,
            )}
            isConnectable
          />
        )
      )}

      {/* 删除按钮：hover 显示（所有节点都可删） */}
      <button
        type="button"
        className={styles.deleteBtn}
        title="删除节点"
        onClick={handleDelete}
      >
        <X size={11} />
      </button>

      {/* mode 徽章（非 always 时显示） */}
      {mode !== 'always' && (
        <span
          className={cx(styles.modeBadge, modeMeta.className)}
          title={`节点模式：${modeMeta.label}`}
        >
          {modeMeta.label}
        </span>
      )}

      {/* ---- Header：图标 + 末端名（display） ---- */}
      <div className={styles.header}>
        <div className={styles.iconWrap} style={{ background: accent }}>
          <Icon size={13} className={styles.icon} />
        </div>
        <span className={styles.typeName} title={display}>
          {display}
        </span>
        {data.is_entry && <span className={styles.tagBadge}>入口</span>}
        {data.is_end && <span className={styles.tagBadge}>终止</span>}
      </div>

      {/* ---- Body：Agent 身份卡 + 输出区 ---- */}
      <div className={styles.body}>
        {agentInfo && (
          <div className={styles.agentCard}>
            {agentInfo.avatar ? (
              <img
                src={`/avatars/${agentInfo.avatar}`}
                className={styles.agentAvatar}
                alt={agentInfo.name}
              />
            ) : (
              <div className={styles.agentAvatarFallback}>
                {agentInfo.name.slice(0, 2)}
              </div>
            )}
            <div className={styles.agentMeta}>
              <span className={styles.agentName}>{agentInfo.name}</span>
              {agentInfo.thinking_model && (
                <span className={styles.agentBadge}>{agentInfo.thinking_model}</span>
              )}
            </div>
          </div>
        )}

        {/* 输出区：始终显示，撑满 body 剩余空间 */}
        <div className={styles.outputArea} data-running={data.running ? 'true' : 'false'}>
          {data.streamOutput ? (
            data.streamOutput.split('\n').map((line, i) => (
              <div key={i} className={styles.outputLine}>{line || '\u00A0'}</div>
            ))
          ) : (
            <span className={styles.outputPlaceholder}>
              {data.running ? '等待输出…' : '暂无输出'}
            </span>
          )}
          {data.running && <span className={styles.outputLiveDot} />}
        </div>
      </div>

      {/* ---- 输出端口（右侧）---- */}
      {outputs.length > 0 ? (
        outputs.map((p, i) => (
          <PortHandle
            key={`out-${p.name}`}
            port={p}
            kind="source"
            index={i}
            // 连接中：如果 from 是 target（输入端口拖出），则高亮所有 source 端口
            highlight={isConnecting && fromHandleType === 'target' && fromNodeId !== id}
          />
        ))
      ) : (
        data.type !== 'end' && (
          <Handle
            type="source"
            position={Position.Right}
            className={cx(
              styles.handle,
              isConnecting && fromHandleType === 'target' && fromNodeId !== id && styles.handleConnecting,
            )}
            isConnectable
          />
        )
      )}
    </div>
  );
}

export default memo(CanvasNode);
