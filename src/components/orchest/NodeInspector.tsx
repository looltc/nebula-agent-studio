import { useMemo, useState } from 'react';
import { Trash2, ArrowRight, X, Pencil, Check, Settings, Activity } from 'lucide-react';
import { Button, Select, Field, TextInput, TextArea, Tabs, type SelectProps, type TabItem } from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import { useOrchestStore } from '@/stores/orchestStore';
import type { Edge } from '@xyflow/react';
import type {
  AgentSummary,
  GraphNodeType,
  NodeTypeDef,
  NodeRun,
  PortSpec,
  RouterInfo,
} from '@/types/api';
import { PORT_TYPE_COLORS } from '@/types/api';
import type { CanvasNodeData } from './CanvasNode';
import styles from './NodeInspector.module.css';

export interface NodeInspectorProps {
  nodeId: string;
  nodeData: CanvasNodeData;
  outgoingEdges: Edge[];
  /** 该节点最近一次运行记录（从父组件传入，避免本组件自己请求） */
  nodeRun?: NodeRun | null;
  onUpdateNode: (data: Partial<CanvasNodeData>) => void;
  onDeleteNode: () => void;
  onUpdateEdgeCond: (edgeId: string, cond: string | null) => void;
  onDeleteEdge: (edgeId: string) => void;
  onClose: () => void;
}

/** 10 种节点类型的中文标签 */
const TYPE_LABELS: Record<GraphNodeType, string> = {
  start: '开始',
  end: '结束',
  llm: 'LLM',
  agent: '智能体',
  tool: '工具',
  logic: '逻辑',
  code: '代码',
  connector: '连接器',
  custom: '自定义',
  text: '文本',
};

const LOGIC_MODES = [
  { value: 'branch', label: 'branch · 条件分支' },
  { value: 'parallel', label: 'parallel · 并行' },
  { value: 'loop', label: 'loop · 循环' },
  { value: 'wait', label: 'wait · 等待' },
  { value: 'router', label: 'router · 路由' },
];

const CONNECTOR_MODES = [
  { value: 'http', label: 'http · HTTP 请求' },
  { value: 'webhook', label: 'webhook · Webhook' },
  { value: 'database', label: 'database · 数据库' },
  { value: 'mq', label: 'mq · 消息队列' },
  { value: 'file', label: 'file · 文件' },
  { value: 'subgraph', label: 'subgraph · 子图' },
];

const TEXT_ROLES = [
  { value: 'note', label: 'note · 注释' },
  { value: 'input', label: 'input · 输入（图入口）' },
  { value: 'output', label: 'output · 输出/预览' },
];

const NODE_MODES = [
  { value: 'always', label: 'always · 执行' },
  { value: 'never', label: 'never · 禁用' },
  { value: 'bypass', label: 'bypass · 透传' },
];

const MODE_HINTS: Record<string, string> = {
  always: '默认执行，结果写入 state',
  never: '不执行，跳过',
  bypass: '不执行，透传 state.output',
};

const INSPECTOR_TABS: TabItem[] = [
  { key: 'config', label: '设置', icon: <Settings size={11} /> },
  { key: 'run', label: '运行', icon: <Activity size={11} /> },
];

function cfgStr(cfg: Record<string, unknown> | undefined, key: string): string {
  if (!cfg) return '';
  const v = cfg[key];
  return typeof v === 'string' ? v : '';
}

function cfgNum(cfg: Record<string, unknown> | undefined, key: string): string {
  if (!cfg) return '';
  const v = cfg[key];
  return typeof v === 'number' ? String(v) : '';
}

/** 端口信息行（紧凑型） */
function PortRow({ port, kind }: { port: PortSpec; kind: 'in' | 'out' }) {
  const color = PORT_TYPE_COLORS[port.type] ?? '#9ca3af';
  return (
    <div className={styles.portItem} title={port.tooltip ?? ''}>
      <span className={styles.portDot} style={{ background: color }} />
      <span className={styles.portName}>{port.name}</span>
      <span className={styles.portType}>{port.type}</span>
      {port.required && <span className={styles.portRequired}>*</span>}
      {port.multiple && <span className={styles.portMultiple}>多</span>}
      <span className={styles.portKind}>{kind === 'in' ? '入' : '出'}</span>
    </div>
  );
}

/** JSON 预览块 */
function JsonBlock({ data }: { data: unknown }) {
  const text = useMemo(() => {
    if (data == null) return '—';
    try {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);
  return <pre className={styles.jsonPre}>{text}</pre>;
}

/**
 * 节点属性侧边面板（v5）。
 *
 * v5 改动：
 * - 名称放第一行，点铅笔图标 inline 修改
 * - ID 下面可切换「设置 / 运行」两个页签
 * - 运行 Tab 展示该节点最近一次运行的输入输出
 * - 高度自适应不留白（body flex:1 + 内容撑开）
 * - 新增 text 节点配置（role/content/output_expr）
 * - Agent 选择器改为头像卡片
 */
export default function NodeInspector({
  nodeId,
  nodeData,
  outgoingEdges,
  nodeRun,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdgeCond,
  onDeleteEdge,
  onClose,
}: NodeInspectorProps) {
  const agents = useAgentStore((s) => s.agents);
  const routers = useOrchestStore((s) => s.routers);
  const nodeTypeMap = useOrchestStore((s) => s.nodeTypeMap);

  const cfg = nodeData.config ?? {};
  const def: NodeTypeDef | null = nodeData.def ?? nodeTypeMap[nodeData.type] ?? null;
  const mode = nodeData.mode ?? 'always';

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(
    cfgStr(cfg, 'label') || nodeData.label || nodeData.agent_ref || nodeData.tool_name || '',
  );
  const [tab, setTab] = useState<'config' | 'run'>('config');

  const selectedAgent: AgentSummary | undefined = useMemo(
    () => agents.find((a) => a.id === nodeData.agent_ref),
    [agents, nodeData.agent_ref],
  );

  const updateConfig = (patch: Record<string, unknown>) => {
    const nextCfg = { ...cfg, ...patch };
    // 合并为单次 onUpdateNode 调用，避免连续 setNodes 时 ref 未更新导致的后调用覆盖前调用
    const data: Partial<CanvasNodeData> = { config: nextCfg };
    if ('agent_ref' in patch) data.agent_ref = (patch.agent_ref as string) || null;
    if ('tool_name' in patch) data.tool_name = (patch.tool_name as string) || null;
    if ('label' in patch) data.label = (patch.label as string) || null;
    onUpdateNode(data);
  };

  const handleModeChange: SelectProps['onChange'] = (e) => {
    onUpdateNode({ mode: e.target.value as 'always' | 'never' | 'bypass' });
  };

  const handleAgentChange: SelectProps['onChange'] = (e) => {
    const val = e.target.value;
    // updateConfig 已处理 agent_ref 的双向更新（config + nodeData.agent_ref）
    updateConfig({ agent_ref: val || null });
  };

  const handleNameCommit = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== cfgStr(cfg, 'label')) {
      updateConfig({ label: trimmed });
    }
  };

  const handleEdgeCondChange = (edgeId: string, val: string) => {
    onUpdateEdgeCond(edgeId, val || null);
  };

  const displayName =
    cfgStr(cfg, 'label') || nodeData.label || nodeData.agent_ref || nodeData.tool_name || TYPE_LABELS[nodeData.type];

  return (
    <div className={styles.panel}>
      {/* ---- 第一行：名称 + 铅笔修改 + 类型 chip + 关闭 ---- */}
      <div className={styles.titleRow}>
        <div className={styles.titleLeft}>
          {editingName ? (
            <div className={styles.nameEdit}>
              <TextInput
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameCommit();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                autoFocus
                className={styles.nameInput}
                placeholder="节点名称"
              />
              <button type="button" className={styles.nameCommit} onClick={handleNameCommit} title="确认">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <>
              <span className={styles.titleName} title={displayName}>{displayName}</span>
              <button
                type="button"
                className={styles.iconBtn}
                title="修改名称"
                onClick={() => {
                  setNameDraft(displayName);
                  setEditingName(true);
                }}
              >
                <Pencil size={11} />
              </button>
            </>
          )}
        </div>
        <div className={styles.titleRight}>
          <span className={styles.typeChip}>{TYPE_LABELS[nodeData.type]}</span>
          <button type="button" className={styles.closeBtn} title="关闭" onClick={onClose}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ---- ID 小字 ---- */}
      <div className={styles.idRow}>
        <span className={styles.idLabel}>id</span>
        <code className={styles.idValue}>{nodeId}</code>
      </div>

      {/* ---- Tab：设置 / 运行 ---- */}
      <div className={styles.tabBar}>
        <Tabs
          tabs={INSPECTOR_TABS}
          active={tab}
          onChange={(k) => setTab(k as 'config' | 'run')}
          variant="pill"
        />
      </div>

      <div className={styles.body}>
        {tab === 'config' ? (
          <>
            {/* ---- 端口信息 ---- */}
            {def && (def.inputs.length > 0 || def.outputs.length > 0) && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>端口</div>
                <div className={styles.portsGrid}>
                  {def.inputs.map((p) => (
                    <PortRow key={`in-${p.name}`} port={p} kind="in" />
                  ))}
                  {def.outputs.map((p) => (
                    <PortRow key={`out-${p.name}`} port={p} kind="out" />
                  ))}
                </div>
              </div>
            )}

            {/* ---- 运行模式 ---- */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>基本</div>
              <Field label="运行模式">
                <Select value={mode} onChange={handleModeChange}>
                  {NODE_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
                <span className={styles.modeHint}>{MODE_HINTS[mode]}</span>
              </Field>
            </div>

            {/* ---- text 节点 ---- */}
            {nodeData.type === 'text' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>文本配置</div>
                <Field label="role" helper="input=图入口，output=预览/结束，note=注释">
                  <Select value={cfgStr(cfg, 'role') || 'note'} onChange={(e) => updateConfig({ role: e.target.value })}>
                    {TEXT_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="content" helper="文本内容（支持 ${state.results.xxx} 插值）">
                  <TextArea
                    value={cfgStr(cfg, 'content')}
                    onChange={(e) => updateConfig({ content: e.target.value })}
                    placeholder="输入文本…"
                    rows={3}
                  />
                </Field>
                <Field label="output_expr" helper="可选，留空则自动从连线取值">
                  <TextInput
                    value={cfgStr(cfg, 'output_expr')}
                    onChange={(e) => updateConfig({ output_expr: e.target.value })}
                    placeholder="留空自动取连线值，或填 ${state.results.agent_1}"
                  />
                </Field>
              </div>
            )}

            {/* ---- llm 节点 ---- */}
            {nodeData.type === 'llm' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>LLM 配置</div>
                <Field label="prompt" helper="支持 ${state.results.xxx} 插值">
                  <TextArea
                    value={cfgStr(cfg, 'prompt')}
                    onChange={(e) => updateConfig({ prompt: e.target.value })}
                    placeholder="请总结：${state.inputs.task}"
                    rows={3}
                  />
                </Field>
                <div className={styles.fieldRow}>
                  <Field label="model">
                    <TextInput
                      value={cfgStr(cfg, 'model')}
                      onChange={(e) => updateConfig({ model: e.target.value })}
                      placeholder="gpt-4o-mini"
                    />
                  </Field>
                  <Field label="temp">
                    <TextInput
                      type="number"
                      step="0.1"
                      value={cfgNum(cfg, 'temperature')}
                      onChange={(e) => updateConfig({ temperature: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="0.7"
                    />
                  </Field>
                </div>
                <Field label="max_tokens">
                  <TextInput
                    type="number"
                    value={cfgNum(cfg, 'max_tokens')}
                    onChange={(e) => updateConfig({ max_tokens: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="4096"
                  />
                </Field>
              </div>
            )}

            {/* ---- agent 节点 ---- */}
            {nodeData.type === 'agent' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>智能体</div>
                <Field label="agent_ref">
                  <Select value={nodeData.agent_ref ?? ''} onChange={handleAgentChange}>
                    <option value="">— 未选择 —</option>
                    {agents
                      .filter((a) => a.enabled !== false)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}（{a.id}）{a.thinking_model ? ` · ${a.thinking_model}` : ''}
                        </option>
                      ))}
                  </Select>
                </Field>
                {selectedAgent && (
                  <div className={styles.agentCard}>
                    {selectedAgent.avatar ? (
                      <img
                        src={`/avatars/${selectedAgent.avatar}`}
                        className={styles.agentAvatar}
                        alt={selectedAgent.name}
                      />
                    ) : (
                      <div className={styles.agentAvatarFallback}>
                        {selectedAgent.name.slice(0, 2)}
                      </div>
                    )}
                    <div className={styles.agentInfo}>
                      <div className={styles.agentName}>{selectedAgent.name}</div>
                      <div className={styles.agentRole}>{selectedAgent.role || '—'}</div>
                      {selectedAgent.thinking_model && (
                        <span className={styles.agentBadge}>{selectedAgent.thinking_model}</span>
                      )}
                      {selectedAgent.llm && (
                        <span className={styles.agentModelBadge}>
                          {selectedAgent.llm.provider}/{selectedAgent.llm.model}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- tool 节点 ---- */}
            {nodeData.type === 'tool' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>工具</div>
                <Field label="tool_name">
                  <TextInput
                    value={cfgStr(cfg, 'tool_name')}
                    onChange={(e) => {
                      const v = e.target.value;
                      onUpdateNode({ tool_name: v || null });
                      updateConfig({ tool_name: v || null });
                    }}
                    placeholder="web_search"
                  />
                </Field>
                <Field label="input_mapping" helper="JSON，key=参数名，value=模板">
                  <TextArea
                    value={cfgStr(cfg, 'input_mapping')}
                    onChange={(e) => updateConfig({ input_mapping: e.target.value })}
                    placeholder='{"query": "${state.inputs.task}"}'
                    rows={2}
                  />
                </Field>
              </div>
            )}

            {/* ---- logic 节点 ---- */}
            {nodeData.type === 'logic' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>逻辑</div>
                <Field label="mode">
                  <Select
                    value={cfgStr(cfg, 'mode')}
                    onChange={(e) => updateConfig({ mode: e.target.value })}
                  >
                    <option value="">— 未选择 —</option>
                    {LOGIC_MODES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                </Field>
                {cfgStr(cfg, 'mode') === 'loop' && (
                  <Field label="max_iterations">
                    <TextInput
                      type="number"
                      value={cfgNum(cfg, 'max_iterations')}
                      onChange={(e) => updateConfig({ max_iterations: e.target.value === '' ? 10 : Number(e.target.value) })}
                      placeholder="10"
                    />
                  </Field>
                )}
                {cfgStr(cfg, 'mode') === 'router' && (
                  <Field label="router_fn">
                    <Select
                      value={cfgStr(cfg, 'router_fn')}
                      onChange={(e) => updateConfig({ router_fn: e.target.value })}
                    >
                      <option value="">— 未选择 —</option>
                      {routers.map((r: RouterInfo) => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
            )}

            {/* ---- code 节点 ---- */}
            {nodeData.type === 'code' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>代码</div>
                <Field label="code" helper="沙箱执行，仅允许 json/math/re/datetime">
                  <TextArea
                    value={cfgStr(cfg, 'code')}
                    onChange={(e) => updateConfig({ code: e.target.value })}
                    placeholder={"def main(state):\n    return {}"}
                    rows={4}
                    className={styles.codeTextarea}
                  />
                </Field>
                <Field label="entry_function">
                  <TextInput
                    value={cfgStr(cfg, 'entry_function')}
                    onChange={(e) => updateConfig({ entry_function: e.target.value })}
                    placeholder="main"
                  />
                </Field>
              </div>
            )}

            {/* ---- connector 节点 ---- */}
            {nodeData.type === 'connector' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>连接器</div>
                <Field label="mode">
                  <Select
                    value={cfgStr(cfg, 'mode')}
                    onChange={(e) => updateConfig({ mode: e.target.value })}
                  >
                    <option value="">— 未选择 —</option>
                    {CONNECTOR_MODES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                </Field>
                {cfgStr(cfg, 'mode') === 'http' && (
                  <>
                    <div className={styles.fieldRow}>
                      <Field label="method">
                        <Select
                          value={cfgStr(cfg, 'method') || 'GET'}
                          onChange={(e) => updateConfig({ method: e.target.value })}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </Select>
                      </Field>
                    </div>
                    <Field label="url">
                      <TextInput
                        value={cfgStr(cfg, 'url')}
                        onChange={(e) => updateConfig({ url: e.target.value })}
                        placeholder="https://api.example.com"
                      />
                    </Field>
                    <Field label="body" helper="JSON，支持模板">
                      <TextArea
                        value={cfgStr(cfg, 'body')}
                        onChange={(e) => updateConfig({ body: e.target.value })}
                        placeholder='{"q": "${state.inputs.task}"}'
                        rows={2}
                      />
                    </Field>
                  </>
                )}
                {cfgStr(cfg, 'mode') === 'subgraph' && (
                  <Field label="subgraph_spec_id">
                    <TextInput
                      value={cfgStr(cfg, 'subgraph_spec_id')}
                      onChange={(e) => updateConfig({ subgraph_spec_id: e.target.value })}
                      placeholder="子图 id"
                    />
                  </Field>
                )}
              </div>
            )}

            {/* ---- custom 节点 ---- */}
            {nodeData.type === 'custom' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>自定义</div>
                <Field label="plugin">
                  <TextInput
                    value={cfgStr(cfg, 'plugin')}
                    onChange={(e) => updateConfig({ plugin: e.target.value })}
                    placeholder="my_plugin"
                  />
                </Field>
              </div>
            )}

            {/* ---- 出边列表 ---- */}
            {outgoingEdges.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>出边（{outgoingEdges.length}）</div>
                <div className={styles.edgeList}>
                  {outgoingEdges.map((edge) => (
                    <div key={edge.id} className={styles.edgeItem}>
                      <div className={styles.edgeTarget}>
                        <ArrowRight size={9} />
                        <code className={styles.edgeTargetId}>{edge.target}</code>
                      </div>
                      <div className={styles.edgeControls}>
                        <Select
                          value={(edge.data?.cond as string) ?? ''}
                          onChange={(e) => handleEdgeCondChange(edge.id, e.target.value)}
                          className={styles.edgeCondSelect}
                        >
                          <option value="">无条件</option>
                          <option value="__branch__">branch</option>
                          <option value="__parallel__">parallel</option>
                          <option value="__loop_body__">loop_body</option>
                          <option value="__loop_exit__">loop_exit</option>
                          {routers.map((r: RouterInfo) => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          className={styles.edgeDelete}
                          title="删除"
                          onClick={() => onDeleteEdge(edge.id)}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- 删除按钮 ---- */}
            <div className={styles.footer}>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={11} />}
                onClick={onDeleteNode}
              >
                删除节点
              </Button>
            </div>
          </>
        ) : (
          /* ---- 运行 Tab：展示节点 IO ---- */
          <div className={styles.section}>
            {nodeRun ? (
              <>
                <div className={styles.runStatus}>
                  <span className={styles.runStatusDot} data-status={nodeRun.status} />
                  <span className={styles.runStatusText}>
                    {nodeRun.status === 'success' ? '成功' : nodeRun.status === 'failed' ? '失败' : nodeRun.status === 'running' ? '运行中' : nodeRun.status === 'skipped' ? '跳过' : '待执行'}
                  </span>
                  {nodeRun.duration_ms != null && (
                    <span className={styles.runDuration}>{nodeRun.duration_ms}ms</span>
                  )}
                </div>
                {nodeRun.started_at && (
                  <div className={styles.runTime}>
                    开始：{new Date(nodeRun.started_at).toLocaleString('zh-CN')}
                  </div>
                )}
                {nodeRun.error && (
                  <div className={styles.runError}>{nodeRun.error}</div>
                )}
                <div className={styles.sectionTitle}>输入</div>
                <JsonBlock data={nodeRun.inputs} />
                <div className={styles.sectionTitle}>输出</div>
                <JsonBlock data={nodeRun.output} />
              </>
            ) : (
              <div className={styles.emptyRun}>
                <Activity size={24} className={styles.emptyRunIcon} />
                <p>暂无运行记录</p>
                <p className={styles.emptyRunHint}>执行编排图后，此处显示该节点的输入输出</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
