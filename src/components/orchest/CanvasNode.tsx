import { memo, useState, useEffect, useRef } from 'react';
import {
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  useConnection,
  type Node as FlowNode,
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
  ChevronDown,
  Plus,
} from 'lucide-react';
import type {
  GraphNodeType,
  NodeTypeDef,
  PortSpec,
  PortType,
} from '@/types/api';
import { PORT_TYPE_COLORS } from '@/types/api';
import { useAgentStore } from '@/stores/agentStore';
import { cx } from '@/lib/cx';
import styles from './CanvasNode.module.css';

/** branch 模式 case 结构 */
interface BranchCase {
  name: string;
  expr?: string;
  is_default?: boolean;
}

/** parallel 模式 branch 结构 */
interface ParallelBranch {
  name: string;
}

/** 从节点 config 读取动态输出端口列表 */
function getDynamicOutputs(def: NodeTypeDef | null, config: Record<string, unknown> | undefined): PortSpec[] {
  if (!def?.has_dynamic_outputs) return [];
  const mode = (config?.mode as string | undefined) ?? '';
  if (mode === 'branch') {
    const cases = (config?.cases as BranchCase[] | undefined) ?? [];
    return cases.map((c) => ({
      name: c.name,
      type: 'any' as PortType,
    }));
  }
  if (mode === 'parallel') {
    const branches = (config?.branches as ParallelBranch[] | undefined) ?? [];
    return branches.map((b) => ({
      name: b.name,
      type: 'any' as PortType,
    }));
  }
  return [];
}

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

export type CanvasNode = FlowNode<CanvasNodeData, 'canvas'>;

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

/* ---- 布局常量（与 CSS 同步：Handle 位置计算用） ---- */
const HEADER_H = 34;            // header 固定高度（含 border-bottom）
const BODY_PT = 4;              // body padding-top
const LABEL_BLOCK = 20;         // sectionLabel 高度(16) + margin-bottom(4)
const ROW_H = 28;               // portRow 固定高度
const SECTION_DIVIDER_GAP = 12; // outputsSection margin-top(4) + border(1) + padding-top(7)

/**
 * 计算所有 Handle 的 top 位置（相对于节点顶部）。
 *
 * 布局结构：
 *   header (34px)
 *   body padding-top (4px)
 *   [输入区] label(20) + rows(28 * N)
 *   [分隔] gap(12)
 *   [输出区] label(20) + rows(28 * M)
 */
function computeHandleTops(inputs: PortSpec[], outputs: PortSpec[]) {
  const inputTops: number[] = [];
  const outputTops: number[] = [];
  let cursor = HEADER_H + BODY_PT;

  if (inputs.length > 0) {
    cursor += LABEL_BLOCK;
    for (let i = 0; i < inputs.length; i++) {
      inputTops.push(cursor + ROW_H / 2);
      cursor += ROW_H;
    }
    cursor += SECTION_DIVIDER_GAP;
  }

  if (outputs.length > 0) {
    cursor += LABEL_BLOCK;
    for (let j = 0; j < outputs.length; j++) {
      outputTops.push(cursor + ROW_H / 2);
      cursor += ROW_H;
    }
  }

  return { inputTops, outputTops };
}

/** 单个端口的 Handle 渲染 */
function PortHandle({
  port,
  kind,
  top,
  highlight,
}: {
  port: PortSpec;
  kind: 'source' | 'target';
  top: number;
  highlight: boolean;
}) {
  const color = PORT_TYPE_COLORS[port.type] ?? '#9ca3af';
  const isSource = kind === 'source';
  const position = isSource ? Position.Right : Position.Left;

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
    />
  );
}

/**
 * 无限画布自定义节点（v5）。
 *
 * v5 改动：
 * - Agent 参数移到 Header（avatar + name + thinking_model 徽章 + 选择器弹窗）
 * - 端口布局改为上下分栏（输入区在上，输出区在下）
 * - 端口标签常驻显示（端口名 + 类型标签）
 * - 输出预览区限高 5 行可滚动
 * - Handle 垂直位置与端口行对齐（固定行高 28px 计算）
 */
function CanvasNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const { deleteElements, setNodes } = useReactFlow();
  const connection = useConnection();
  const agents = useAgentStore((s) => s.agents);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭 agent 选择器
  useEffect(() => {
    if (!showAgentPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current && !pickerRef.current.contains(target) &&
        pickerBtnRef.current && !pickerBtnRef.current.contains(target)
      ) {
        setShowAgentPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAgentPicker]);

  const meta = TYPE_META[data.type] ?? TYPE_META.agent;
  const Icon = meta.icon;
  const accent = meta.accent;
  // 显示名优先级：label > agent_ref > tool_name > id
  const display = data.label || data.agent_ref || data.tool_name || id;
  const def = data.def ?? null;
  const inputs = def?.inputs ?? [];
  const staticOutputs = def?.outputs ?? [];
  const dynamicOutputs = getDynamicOutputs(def, data.config);
  const outputs = [...staticOutputs, ...dynamicOutputs];
  const mode = data.mode ?? 'always';
  const modeMeta = MODE_META[mode];

  // 动态输出端口配置（用于增删）
  const cfg = (data.config ?? {}) as Record<string, unknown>;
  const logicMode = (cfg.mode as string | undefined) ?? '';
  const hasDynamic = !!def?.has_dynamic_outputs && (logicMode === 'branch' || logicMode === 'parallel');
  const cases = (cfg.cases as BranchCase[] | undefined) ?? [];
  const branches = (cfg.branches as ParallelBranch[] | undefined) ?? [];

  const isAgentNode = data.type === 'agent';
  const agentInfo = isAgentNode && data.agent_ref
    ? agents.find((a) => a.id === data.agent_ref)
    : null;

  // 是否正在连接（从某个端口拖出）
  const isConnecting = !!connection.fromHandle;
  const fromNodeId = connection.fromHandle?.nodeId;
  const fromHandleType = connection.fromHandle?.type;

  const handleTops = computeHandleTops(inputs, outputs);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    void deleteElements({ nodes: [{ id }] });
  };

  const handleSelectAgent = (agentId: string | null) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                agent_ref: agentId,
                config: { ...(n.data.config ?? {}), agent_ref: agentId },
              },
            }
          : n,
      ),
    );
    setShowAgentPicker(false);
  };

  // 添加 branch case：追加 case_{$n} 端口
  const handleAddCase = () => {
    const nextCases = [...cases];
    const newCase: BranchCase = {
      name: `case_${nextCases.length}`,
      expr: '',
      is_default: false,
    };
    nextCases.push(newCase);
    // 若没有显式 default，将最后一个标记为默认
    if (!nextCases.some((c) => c.is_default)) {
      nextCases[nextCases.length - 1].is_default = true;
    }
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                config: { ...(n.data.config ?? {}), cases: nextCases },
              },
            }
          : n,
      ),
    );
  };

  // 删除 branch case
  const handleDeleteCase = (caseName: string) => {
    const nextCases = cases.filter((c) => c.name !== caseName);
    // 若删掉的是 default，且还有剩余 case，将最后一个标记为默认
    if (!nextCases.some((c) => c.is_default) && nextCases.length > 0) {
      nextCases[nextCases.length - 1].is_default = true;
    }
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                config: { ...(n.data.config ?? {}), cases: nextCases },
              },
            }
          : n,
      ),
    );
  };

  // 添加 parallel branch：追加 branch_{$n} 端口
  const handleAddBranch = () => {
    const nextBranches = [...branches];
    nextBranches.push({ name: `branch_${nextBranches.length}` });
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                config: { ...(n.data.config ?? {}), branches: nextBranches },
              },
            }
          : n,
      ),
    );
  };

  // 删除 parallel branch
  const handleDeleteBranch = (branchName: string) => {
    const nextBranches = branches.filter((b) => b.name !== branchName);
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                config: { ...(n.data.config ?? {}), branches: nextBranches },
              },
            }
          : n,
      ),
    );
  };

  // 输出区是否显示：有输出端口、或有动态端口能力、或有流式输出、或运行中
  const showOutputs = outputs.length > 0 || hasDynamic || !!data.streamOutput || !!data.running;

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
      }}
    >
      {/* ---- 拖拽调整大小（仅选中时显示手柄）---- */}
      <NodeResizer
        minWidth={280}
        minHeight={120}
        maxWidth={600}
        maxHeight={500}
        isVisible={!!selected}
        color={accent}
      />

      {/* ---- 输入端口 Handle（左侧）---- */}
      {inputs.length > 0 ? (
        inputs.map((p, i) => (
          <PortHandle
            key={`in-${p.name}`}
            port={p}
            kind="target"
            top={handleTops.inputTops[i]}
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

      {/* ---- 输出端口 Handle（右侧）---- */}
      {outputs.length > 0 ? (
        outputs.map((p, i) => (
          <PortHandle
            key={`out-${p.name}`}
            port={p}
            kind="source"
            top={handleTops.outputTops[i]}
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

      {/* ---- Header ---- */}
      {isAgentNode ? (
        <div className={styles.header}>
          {agentInfo ? (
            <>
              <button
                ref={pickerBtnRef}
                type="button"
                className={styles.agentHeaderBtn}
                onClick={() => setShowAgentPicker((v) => !v)}
                title="切换 Agent"
              >
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
                <span className={styles.agentName}>{agentInfo.name}</span>
                <ChevronDown size={10} className={styles.agentChevron} />
              </button>
              {agentInfo.thinking_model && (
                <span className={styles.agentBadge}>{agentInfo.thinking_model}</span>
              )}
            </>
          ) : (
            <button
              ref={pickerBtnRef}
              type="button"
              className={styles.selectAgentBtn}
              onClick={() => setShowAgentPicker((v) => !v)}
            >
              <Bot size={12} />
              <span>选择 Agent</span>
              <ChevronDown size={10} />
            </button>
          )}
          {data.is_entry && <span className={styles.tagBadge}>入口</span>}
          {data.is_end && <span className={styles.tagBadge}>终止</span>}

          {/* Agent 选择器弹窗 */}
          {showAgentPicker && (
            <div ref={pickerRef} className={styles.agentPicker}>
              {agentInfo && (
                <button
                  type="button"
                  className={styles.agentPickerItem}
                  onClick={() => handleSelectAgent(null)}
                >
                  <span className={styles.agentPickerClear}>— 清除选择 —</span>
                </button>
              )}
              {agents
                .filter((a) => a.enabled !== false)
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={cx(
                      styles.agentPickerItem,
                      a.id === data.agent_ref && styles.agentPickerItemActive,
                    )}
                    onClick={() => handleSelectAgent(a.id)}
                  >
                    {a.avatar ? (
                      <img
                        src={`/avatars/${a.avatar}`}
                        className={styles.agentPickerAvatar}
                        alt={a.name}
                      />
                    ) : (
                      <div className={styles.agentAvatarFallback}>
                        {a.name.slice(0, 2)}
                      </div>
                    )}
                    <span className={styles.agentPickerName}>{a.name}</span>
                    {a.thinking_model && (
                      <span className={styles.agentBadge}>{a.thinking_model}</span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : (
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
      )}

      {/* ---- Body：上下分栏 ---- */}
      <div className={styles.body}>
        {/* 输入区 */}
        {inputs.length > 0 && (
          <div className={styles.inputsSection}>
            <div className={styles.sectionLabel}>输入</div>
            {inputs.map((p) => {
              const color = PORT_TYPE_COLORS[p.type] ?? '#9ca3af';
              return (
                <div key={`in-${p.name}`} className={styles.portRow}>
                  <span className={styles.portDot} style={{ background: color }} />
                  <span className={styles.portName}>{p.name}</span>
                  <span className={styles.portType}>
                    {p.type}{p.required ? ' *' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 输出区 */}
        {showOutputs && (
          <div
            className={cx(
              styles.outputsSection,
              inputs.length === 0 && styles.noDivider,
            )}
          >
            {(outputs.length > 0 || hasDynamic) && <div className={styles.sectionLabel}>输出</div>}
            {outputs.map((p) => {
              const color = PORT_TYPE_COLORS[p.type] ?? '#9ca3af';
              // 静态端口排在前面（p.name 在 staticOutputs 中）
              const isDynamic = staticOutputs.findIndex((s) => s.name === p.name) === -1;
              const portName = p.name;
              return (
                <div key={`out-${portName}`} className={styles.portRow}>
                  <span className={styles.portName}>{portName}</span>
                  <span className={styles.portType}>
                    {p.type}{p.required ? ' *' : ''}
                  </span>
                  <span className={styles.portDot} style={{ background: color }} />
                  {isDynamic && hasDynamic && (
                    <button
                      type="button"
                      className={styles.portRowDelete}
                      title="删除端口"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (logicMode === 'branch') handleDeleteCase(portName);
                        else if (logicMode === 'parallel') handleDeleteBranch(portName);
                      }}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
            {/* 添加动态端口按钮 */}
            {hasDynamic && (
              <button
                type="button"
                className={styles.addPortBtn}
                title={logicMode === 'branch' ? '添加分支' : '添加并行分支'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (logicMode === 'branch') handleAddCase();
                  else if (logicMode === 'parallel') handleAddBranch();
                }}
              >
                <Plus size={11} />
                <span>{logicMode === 'branch' ? '添加分支' : '添加并行分支'}</span>
              </button>
            )}
            {/* 输出预览 */}
            {(!!data.streamOutput || !!data.running || staticOutputs.length > 0) && (
              <div
                className={styles.outputPreview}
                data-running={data.running ? 'true' : 'false'}
              >
                {data.streamOutput ? (
                  data.streamOutput.split('\n').map((line, i) => (
                    <div key={i} className={styles.outputLine}>{line || '\u00A0'}</div>
                  ))
                ) : (
                  <span className={styles.outputPlaceholder}>
                    {data.running ? '等待输出…' : '无输出'}
                  </span>
                )}
                {data.running && <span className={styles.outputLiveDot} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CanvasNode);
