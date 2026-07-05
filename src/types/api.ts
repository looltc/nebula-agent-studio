// Types aligned with backend src/nebula/api/server.py

/* ---------- Health / World ---------- */
export interface HealthResponse {
  status: string;
  version: string;
  agents: number;
}

export interface AgentStateInfo {
  status?: string;
  last_message?: string;
  [key: string]: unknown;
}

export interface WorldStateResponse {
  tick: number;
  sim_time: string;
  agent_states: Record<string, AgentStateInfo>;
  environment: Record<string, unknown>;
}

/* ---------- Agents ---------- */
export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  enabled: boolean;
  /** 头像文件名（位于 /avatars/ 目录下，如 "cat.jpg"）；未配置时由 UI fallback 到首字母 */
  avatar?: string | null;
  /** 思维模式类型：react / plan_execute / reflexion */
  thinking_model?: string;
  /** LLM 摘要信息（用于卡片展示） */
  llm?: {
    provider: string;
    model: string;
  };
  /** Agent 授权的工具名称列表 */
  tools?: string[];
  /** Agent 绑定的 Skill 名称列表 */
  skills?: string[];
  /** 修改时间（ISO 8601 字符串，UTC），用于按修改时间倒序排序 */
  updated_at?: string | null;
}

export interface AgentListResponse {
  agents: AgentSummary[];
}

export interface LLMSpecRequest {
  provider: string;
  model: string;
  temperature: number;
  api_key?: string | null;
  base_url?: string | null;
  /** API 协议格式：openai / anthropic / openai_responses */
  api_format?: string;
}

/** 思维模型类型（与后端 ThinkingModelSpec.type 枚举对齐） */
export type ThinkingModelType = 'react' | 'plan_execute' | 'reflexion' | 'rewoo';

export interface AgentCreateRequest {
  id: string;
  name: string;
  role: string;
  persona: string;
  thinking_model: ThinkingModelType;
  max_iterations: number;
  max_messages: number;
  system_prompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  llm: LLMSpecRequest | null;
  /** 头像文件名（如 "cat.jpg"），可空 */
  avatar?: string | null;
  /** 绑定的 Skill 名称列表 */
  skills: string[];
  /** PlanExecute 优化开关：每步 execute 后是否提取已确认事实（默认关，省 1 次 LLM/步） */
  enable_fact_extraction?: boolean;
  /** PlanExecute 优化开关：每步 execute 后是否评估结果质量（默认关，省 1 次 LLM/步） */
  enable_step_evaluate?: boolean;
  /** 记忆配置（L2 短期 + L3 长期）；后端有默认值，旧前端不传也兼容 */
  memory?: MemoryConfigRequest;
}

export type MemoryModuleType = 'semantic' | 'episodic' | 'preference' | 'procedural';

export interface ConsolidationConfig {
  enabled: boolean;
  idle_timeout_s: number;
}

export interface EmbeddingConfig {
  provider: string;
  model: string;
}

export interface LongTermMemoryConfig {
  enabled: boolean;
  modules: MemoryModuleType[];
  consolidation: ConsolidationConfig;
  embedding: EmbeddingConfig;
}

export interface MemoryConfigRequest {
  max_messages: number;
  long_term: LongTermMemoryConfig;
}

export interface AgentCreateResponse {
  id: string;
  name: string;
  status: string;
}

export interface AgentDetailResponse {
  id: string;
  name: string;
  role: string;
  persona: string;
  enabled: boolean;
  thinking_model: ThinkingModelType;
  max_iterations: number;
  /** PlanExecute 优化开关（仅 plan_execute 模式有意义） */
  enable_fact_extraction: boolean;
  enable_step_evaluate: boolean;
  max_messages: number;
  system_prompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  llm: {
    provider: string;
    model: string;
    temperature: number;
    base_url: string | null;
    has_api_key: boolean;
    api_format?: string;
  };
  /** 头像文件名（位于 /avatars/ 目录下，如 "cat.jpg"），可空 */
  avatar?: string | null;
  /** 绑定的 Skill 名称列表 */
  skills: string[];
  /** 记忆配置（后端始终返回，旧 Agent 也含默认 long_term.enabled=false） */
  memory?: MemoryConfigRequest;
}

export interface AgentUpdateRequest {
  // id is required by the backend's AgentCreateRequest schema; the PUT
  // endpoint reuses it and overwrites req.id with the path param, so we
  // always echo the current agent id back to satisfy Pydantic validation.
  id: string;
  name: string;
  role: string;
  persona: string;
  thinking_model: ThinkingModelType;
  max_iterations: number;
  max_messages: number;
  system_prompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  llm: LLMSpecRequest | null;
  /** 头像文件名（如 "cat.jpg"），可空 */
  avatar?: string | null;
  /** 绑定的 Skill 名称列表 */
  skills: string[];
  /** PlanExecute 优化开关 */
  enable_fact_extraction?: boolean;
  enable_step_evaluate?: boolean;
  /** 记忆配置（L2 短期 + L3 长期） */
  memory?: MemoryConfigRequest;
}

/* ---------- LLM Providers ---------- */
export interface ProviderSummary {
  id: string;
  name: string;
  base_url: string | null;
  api_key_set: boolean;
  /** API 协议格式：openai / anthropic / openai_responses */
  api_format?: string;
  /** 用户手动配置的模型列表 */
  models?: string[];
}

export interface ProviderListResponse {
  providers: ProviderSummary[];
}

export interface ProviderCreateRequest {
  name: string;
  base_url?: string | null;
  api_key?: string | null;
  /** API 协议格式：openai / anthropic / openai_responses */
  api_format?: string;
  /** 用户手动配置的模型列表（Anthropic 格式必填） */
  models?: string[];
}

export interface ProviderTestResponse {
  status: 'ok' | 'error';
  models?: string[];
  error?: string;
}

export interface ProviderModelsResponse {
  models: string[];
  error?: string;
}

/* ---------- Chat ---------- */
export interface ChatRequest {
  agent_id: string;
  message: string;
  conversation_id?: string | null;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
}

/* ---------- Conversations ---------- */
export interface ConversationSummary {
  id: string;
  mode: string;
  state: string;
  participants: string[];
  message_count: number;
  started_at: string;
  title?: string;
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
}

export interface MessageInfo {
  id: string;
  source: string;
  role: string;
  content: string;
  ts: string;
  /**
   * 思考过程与工具调用的时间线事件，按到达顺序排列。
   * 仅在流式期间由 chatStore 写入；历史会话从后端加载时此字段可能为空。
   */
  events?: TimelineEvent[];
}

/**
 * 时间线事件：思考过程、工具调用、正文片段按到达顺序统一记录。
 * 渲染时按 seq 升序排列，思考/工具与正文穿插输出，形成完整的对话流。
 */
export type TimelineEvent =
  | TimelineTextEvent
  | TimelineThinkingEvent
  | TimelineToolEvent;

export interface TimelineTextEvent {
  kind: 'text';
  seq: number;
  content: string;
}

export interface TimelineThinkingEvent {
  kind: 'thinking';
  seq: number;
  step: string;
  content: string;
}

export interface TimelineToolEvent {
  kind: 'tool';
  seq: number;
  id: string;
  tool: string;
  args?: Record<string, unknown>;
  status: 'loading' | 'done' | 'error';
  result?: unknown;
  error?: string;
}

export interface ConversationMessagesResponse {
  conversation_id: string;
  messages: MessageInfo[];
}

/* ---------- Events ---------- */
export interface EventInfo {
  id: string;
  type: string;
  tick: number;
  source: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface EventListResponse {
  count: number;
  events: EventInfo[];
}

/* ---------- Relations ---------- */
export interface Relation {
  from: string;
  to: string;
  kind: 'trust' | 'authority' | 'collaboration' | 'rivalry';
  weight: number;
}

export interface RelationGraphResponse {
  relations: Relation[];
}

/* ---------- Tools ---------- */
export interface FunctionSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolInfo {
  name: string;
  description: string;
  dangerous: boolean;
  timeout_s: number | null;
  schema: FunctionSchema;
}

export interface ToolListResponse {
  tools: ToolInfo[];
  count: number;
}

/* ---------- Skills ---------- */
export interface SkillInfo {
  name: string;
  description: string;
  version: string;
  source: 'local' | 'upload' | 'github';
  source_url: string | null;
  license: string | null;
  compatibility: string | null;
  enabled: boolean;
  has_scripts: boolean;
  has_references: boolean;
  has_assets: boolean;
  installed_at: string | null;
}

export interface SkillListResponse {
  skills: SkillInfo[];
}

export interface SkillDetail extends SkillInfo {
  body: string;
  scripts: string[];
  references: string[];
  assets: string[];
}

export interface SkillInstallResult {
  status: string;
  count: number;
  skills: { name: string; description: string }[];
}

export interface SkillToggleResult {
  status: string;
  enabled: boolean;
}

/* ---------- Memory (L3 long-term) ---------- */
export type MemoryType = 'semantic' | 'episodic' | 'preference' | 'procedural';

export interface MemoryItem {
  id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  tags: string[];
  entities: string[];
  importance: number;
  access_count: number;
  last_access_at: string | null;
  ttl: number | null;
  metadata: Record<string, unknown>;
  ts: string;
}

export interface MemoryListResponse {
  agent_id: string;
  count: number;
  memories: MemoryItem[];
}

export interface MemoryStats {
  agent_id: string;
  total_count: number;
  by_type: Record<string, number>;
  avg_importance: number;
  total_access_count: number;
}

export interface DreamReport {
  started_at: string;
  duration_s: number;
  extracted: number;
  deep_encoded: number;
  re_encoded: number;
  merged: number;
  reinforced: number;
  forgotten: number;
  errors: string[];
}

export interface ConsolidateResponse {
  agent_id: string;
  report: DreamReport;
}

/* ---------- Group Chats ---------- */
export interface Participant {
  id: string;
  name?: string;
  kind: string;
  role: string;
  permissions?: string[];
  attention?: string[];
}

export interface FloorPolicy {
  type: 'round_robin' | 'moderator' | 'free_for_all';
  moderator_id?: string | null;
  max_messages_per_turn?: number;
  [key: string]: unknown;
}

export interface ContextPolicy {
  mode: 'full' | 'summary' | 'last_n' | 'topic_window';
  max_messages?: number;
  summary_every?: number;
  topic_depth?: number;
}

/** 群聊摘要（列表项） */
export interface GroupChatSummary {
  id: string;
  participants: Participant[];
  floor_policy: FloorPolicy;
  context_policy: ContextPolicy;
  current_floor: string | null;
  message_count: number;
}

export interface GroupChatListResponse {
  group_chats: GroupChatSummary[];
}

export interface GroupChatCreateRequest {
  id?: string;
  participants: Participant[];
  floor_policy?: FloorPolicy;
  context_policy?: ContextPolicy;
}

export interface GroupChatCreateResponse {
  id: string;
  participants: Participant[];
}

export interface GroupChatUpdateRequest {
  floor_policy?: FloorPolicy;
  context_policy?: ContextPolicy;
  participants?: Participant[];
}

/** 群聊消息 */
export interface GroupMessage {
  id: string;
  conversation_id: string;
  source: string;
  target: string;
  role: string;
  content: string;
  addressing: {
    mode: 'broadcast' | 'mention' | 'dm' | 'reply';
    targets: string[];
    reply_to: string | null;
  };
  ts: string;
  metadata: {
    sender_name?: string;
    [key: string]: unknown;
  };
}

export interface GroupMessageListResponse {
  group_id: string;
  messages: GroupMessage[];
}

export interface GroupMessageRequest {
  source: string;
  content: string;
  mode?: 'broadcast' | 'mention' | 'dm' | 'reply';
  targets?: string[];
  reply_to?: string | null;
}

export interface GroupMessageResponse {
  message_id: string;
  source: string;
  sender_name: string;
  recipients: string[];
  skipped: string[];
  routing_mode: string;
}

/** SSE 流式事件 */
export interface GroupStreamEvent {
  type: 'message' | 'chunk' | 'thinking' | 'tool_start' | 'tool_end' | 'skip' | 'error' | 'end';
  message?: GroupMessage;
  sender_name?: string;
  agent_id?: string;
  text?: string;
  payload?: Record<string, unknown>;
  error?: string;
}

/* ---------- WebSocket Messages ---------- */
export interface WSMessageEvent {
  type: 'message';
  source: string;
  role: string;
  content: string;
  conversation_id: string;
}

export interface StreamEventPayload {
  text?: string;
  step?: string;
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown> | string;
  error?: string;
  kind?: string;
  message_id?: string;
}

export interface StreamEvent {
  type:
    | 'stream_chunk'
    | 'stream_thinking'
    | 'stream_tool_start'
    | 'stream_tool_end'
    | 'stream_done'
    | 'stream_error';
  agent_id: string;
  conversation_id?: string;
  message_id?: string;
  payload: StreamEventPayload;
  seq?: number;
  is_final?: boolean;
}

export type WSReceived = WSMessageEvent | StreamEvent;

/* ---------- SSE Events ---------- */
export interface SSEStartEvent {
  type: 'start';
  agent_id: string;
  conversation_id: string;
}
export interface SSEChunkEvent {
  type: 'chunk';
  text: string;
}
export interface SSEEndEvent {
  type: 'end';
  content: string;
  conversation_id: string;
}
export interface SSEErrorEvent {
  type: 'error';
  error: string;
}
export interface SSEThinkingEvent {
  type: 'thinking';
  payload: { step?: string; content?: string };
}
export interface SSEToolStartEvent {
  type: 'tool_start';
  payload: { tool?: string; args?: Record<string, unknown> };
}
export interface SSEToolEndEvent {
  type: 'tool_end';
  payload: { tool?: string; result?: unknown };
}
export type SSEEvent =
  | SSEStartEvent
  | SSEChunkEvent
  | SSEEndEvent
  | SSEErrorEvent
  | SSEThinkingEvent
  | SSEToolStartEvent
  | SSEToolEndEvent;

/* ---------- Metrics ---------- */
export type MetricsText = string;

/* ---------- Observability ---------- */

/** Trace 列表项（精简，不含 children） */
export interface TraceSummary {
  trace_id: string;
  name: string;
  status: string;
  duration_ms: number;
  start_time: number;
  end_time: number;
  attrs: Record<string, unknown>;
  span_count: number;
}

export interface TraceListResponse {
  count: number;
  traces: TraceSummary[];
}

export interface TraceByTickResponse {
  tick: number;
  count: number;
  traces: TraceSummary[];
}

/** Span 节点（完整，含 children 递归） */
export interface SpanView {
  name: string;
  trace_id: string;
  span_id: string;
  attrs: Record<string, unknown>;
  status: string;
  status_code: number;
  start_time: number;
  end_time: number;
  duration_ms: number;
  error: string | null;
  events: Array<{ name: string; attrs: Record<string, unknown>; time: number }>;
  children: SpanView[];
}

/** 结构化 metrics（counters/gauges/histograms） */
export interface MetricsDict {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<
    string,
    { count: number; sum: number; buckets: number[] }
  >;
}

export interface ObservabilityStatus {
  langsmith: {
    enabled: boolean;
    project: string;
    endpoint: string;
    trace_url: string;
    api_key_set: boolean;
  };
  opentelemetry: {
    enabled: boolean;
    service_name: string;
  };
}

export interface CostResponse {
  total_usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  global_budget: {
    total_budget_usd: number;
    spent_usd: number;
    daily_budget_usd: number | null;
    daily_spent_usd: number;
  };
  agents: Array<{
    agent_id: string;
    total_budget_usd: number;
    spent_usd: number;
    daily_budget_usd: number | null;
    daily_spent_usd: number;
  }>;
}

/* ---------- Observe (Agent-centric) ---------- */

/** 单个 Agent 的观测汇总（用于顶部卡片） */
export interface AgentObservation {
  id: string;
  name: string;
  avatar: string;
  thinking_model: string;
  enabled: boolean;
  llm_model: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  daily_cost_usd: number;
  llm_calls: number;
  tool_calls: number;
  tool_calls_by_tool: Record<string, number>;
  last_active: string | null;
}

/** Agent 观测列表响应（含全局汇总） */
export interface AgentObservationListResponse {
  agents: AgentObservation[];
  summary: {
    agent_count: number;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
    total_llm_calls: number;
    total_tool_calls: number;
  };
}

/** 单 Agent 详情（在汇总字段基础上增加配置信息） */
export interface AgentObservationDetail extends AgentObservation {
  llm_provider: string;
  max_iterations: number;
  tools: string[];
  skills: string[];
  budget_limit_usd: number | null;
  daily_budget_usd: number | null;
  updated_at: string | null;
}

/** 时间线事件条目（与 EventInfo 字段对齐，独立定义便于扩展） */
export interface ObserveTimelineEvent {
  id: string;
  type: string;
  tick: number;
  source: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface AgentTimelineResponse {
  agent_id: string;
  events: ObserveTimelineEvent[];
  total: number;
}

export interface GlobalTimelineResponse {
  events: ObserveTimelineEvent[];
  total: number;
}

/* ---------- User ---------- */
export interface UserProfile {
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  user: UserProfile;
}

export interface UserUpdateRequest {
  display_name: string;
}

/* ---------- Orchestration ---------- */

/**
 * 节点类型（与后端 GraphNodeSpec.type 对齐，新版 9 种）。
 *
 * 设计文档：doc/design/25-node-type-system.md
 * - start/end：图入口出口
 * - llm：直接调用 LLM（不绑 Agent）
 * - agent：调用系统已注册 Agent
 * - tool：直接调用工具
 * - logic：5 种 mode（branch/parallel/loop/wait/router）
 * - code：沙箱执行用户代码
 * - connector：6 种 mode（http/webhook/database/mq/file/subgraph）
 * - custom：plugin 扩展（后台开发）
 *
 * 旧 5 种类型（agent/supervisor/human/tool/subgraph）已废弃，不做兼容。
 */
export type GraphNodeType =
  | 'start'
  | 'end'
  | 'llm'
  | 'agent'
  | 'tool'
  | 'logic'
  | 'code'
  | 'connector'
  | 'custom'
  | 'text';

/**
 * GraphSpec 节点定义（新版 9 种节点类型）。
 *
 * 新版规则：
 * - 引用字段（agent_ref / tool_name / mode 等）统一收口到 config，顶层不再有 agent_ref
 * - label / position 为可选字段（前端用，后端忽略）
 *
 * v2 扩展（设计文档：26-node-system-v2.md）：
 * - mode：节点三态（always/never/bypass）
 */
export interface GraphNodeSpec {
  id: string;
  type: GraphNodeType;
  /** 公共参数 + 类型特有参数，统一收口到此 dict */
  config?: Record<string, unknown>;
  /** 节点显示名（前端用） */
  label?: string | null;
  /** 画布位置（前端用，与 positions 字段冗余但便于节点级访问） */
  position?: { x: number; y: number } | null;
  /** v2：节点运行时模式（always=默认 / never=永不 / bypass=透传） */
  mode?: 'always' | 'never' | 'bypass';
}

/**
 * GraphSpec 边定义（后端 alias from/to ↔ from_node/to_node）。
 *
 * v2 扩展（设计文档：26-node-system-v2.md）：
 * - from_port / to_port：边连接到具体端口（可选，旧 spec 自动取默认端口）
 */
export interface GraphEdgeSpec {
  from: string;
  to: string;
  /** v2：源节点的输出端口名（可选，None 取默认） */
  from_port?: string | null;
  /** v2：目标节点的输入端口名（可选，None 取默认） */
  to_port?: string | null;
  cond?: string | null;
}

/* ---------- v2 强类型 IO 系统（设计文档：26-node-system-v2.md） ---------- */

/**
 * 端口类型枚举（12 种，分 3 层）。
 *
 * Layer 1（基础）：string/int/float/bool/json
 * Layer 2（Agent 语义）：message/messages/agent_result/tool_result/thinking
 * Layer 3（控制）：state_ref/any
 */
export type PortType =
  | 'string'
  | 'int'
  | 'float'
  | 'bool'
  | 'json'
  | 'message'
  | 'messages'
  | 'agent_result'
  | 'tool_result'
  | 'thinking'
  | 'state_ref'
  | 'any';

/** 端口类型 → 颜色映射（前端渲染 Handle 用） */
export const PORT_TYPE_COLORS: Record<PortType, string> = {
  string: '#22c55e',   // 浅绿
  int: '#22c55e',
  float: '#22c55e',
  bool: '#22c55e',
  json: '#eab308',     // 黄
  message: '#3b82f6',  // 蓝
  messages: '#3b82f6',
  agent_result: '#a855f7', // 紫
  tool_result: '#f97316',  // 橙
  thinking: '#6366f1',     // 靛
  state_ref: '#9ca3af',    // 灰
  any: '#1f2937',          // 黑
};

/** 端口规格声明 */
export interface PortSpec {
  name: string;
  type: PortType;
  required?: boolean;
  default?: unknown;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  options?: string[] | null;
  tooltip?: string | null;
  multiline?: boolean;
  multiple?: boolean;
}

/** 节点类型定义（与后端 NodeTypeDef 对齐） */
export interface NodeTypeDef {
  type: GraphNodeType;
  display_name: string;
  category: string;
  description: string;
  search_aliases?: string[];
  is_output_node?: boolean;
  is_deprecated?: boolean;
  inputs: PortSpec[];
  outputs: PortSpec[];
  config_schema?: Record<string, unknown>;
  default_config?: Record<string, unknown>;
  /** v3：是否支持动态输出端口（如 logic 节点的 branch/parallel 模式） */
  has_dynamic_outputs?: boolean;
}

/** GET /node-types 返回 */
export interface NodeTypeListResponse {
  count: number;
  node_types: NodeTypeDef[];
}

/** GET /port-types/compatible 返回 */
export interface PortCompatibleResponse {
  compatible: boolean;
  src: PortType;
  dst: PortType;
}

/* ---------- Phase C：Agent 自动生成图 + 模板库 ---------- */

/** POST /orchestration/generate-graph 请求 */
export interface GenerateGraphRequest {
  /** 用户任务描述（自然语言） */
  task: string;
  /** 使用指定 Agent 的 LLM 生成图；为空时用第一个 enabled Agent */
  agent_id?: string | null;
  /** LLM 输出非法时的最大重试次数（默认 1） */
  max_retries?: number;
}

/** POST /orchestration/generate-graph 响应 */
export interface GenerateGraphResponse {
  /** 是否生成成功（通过所有校验） */
  ok: boolean;
  /** 成功时为生成的 GraphSpec，失败时为 null */
  spec: GraphSpec | null;
  /** 失败时的错误列表（JSON 解析 / schema 校验 / 端口校验 / 连通性校验） */
  errors: string[];
  /** LLM 原始输出（调试用） */
  raw_output: string;
}

/** 模板摘要（GET /templates 返回） */
export interface TemplateSummary {
  key: string;
  name: string;
  desc: string;
}

/** GET /templates 返回 */
export interface TemplateListResponse {
  count: number;
  templates: TemplateSummary[];
}

/** POST /templates/{key}/instantiate 请求 */
export interface InstantiateTemplateRequest {
  /** 新编排图名称 */
  name: string;
}

/** start 节点的入参 schema（与后端 InputParam 对齐） */
export interface InputParam {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string | null;
  default?: unknown;
  required?: boolean;
}

/** 完整 GraphSpec（编排图配置，新版删除 entry_point/end_node） */
export interface GraphSpec {
  name: string;
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
  /** 图级入参 schema（从 start 节点同步） */
  inputs_schema?: InputParam[] | null;
  /** 图级迭代上限（默认 50） */
  max_iterations?: number;
  /** 图级超时秒数 */
  timeout_seconds?: number | null;
}

/** 画布节点位置（前端拖拽后随 spec 一起 PUT） */
export interface NodePosition {
  x: number;
  y: number;
}

/** 编排图列表项（GET /specs 返回） */
export interface GraphSpecSummary {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  node_count: number;
  edge_count: number;
}

export interface GraphSpecListResponse {
  count: number;
  specs: GraphSpecSummary[];
}

/** 编排图完整内容（GET /specs/{id} 返回） */
export interface GraphSpecDetail {
  id: string;
  name: string;
  spec: GraphSpec;
  positions: Record<string, NodePosition>;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
}

export interface SpecCreateRequest {
  name: string;
  spec?: GraphSpec | null;
  positions?: Record<string, NodePosition> | null;
}

export interface SpecUpdateRequest {
  name?: string | null;
  spec?: GraphSpec | null;
  positions?: Record<string, NodePosition> | null;
}

/** 编译后的节点视图（CompiledGraphView） */
export interface CompiledNodeView {
  id: string;
  name: string;
  type: GraphNodeType;
  /** 关联的 Agent id（仅 agent / logic.router 类型，从 config.agent_ref 取） */
  agent_ref: string | null;
  is_entry: boolean;
  is_end: boolean;
}

/** 编译后的边视图 */
export interface CompiledEdgeView {
  source: string;
  target: string;
  cond: string | null;
  is_conditional: boolean;
}

/** 完整编译结果（POST /specs/{id}/compile 返回） */
export interface CompiledGraphView {
  spec_id: string;
  spec_name: string;
  nodes: CompiledNodeView[];
  edges: CompiledEdgeView[];
  entry_point: string | null;
  compile_errors: string[];
}

/** 执行编排图请求 */
export interface InvokeRequest {
  task: string;
  max_iterations?: number;
}

/** 同步执行结果 */
export interface InvokeResponse {
  output: string | null;
  runtime: OrchestrationRuntime;
  run_id?: string;
}

/** 运行历史记录（列表项，不含 node_runs 详情） */
export interface OrchestrationRun {
  id: string;
  spec_id: string;
  status: 'running' | 'success' | 'failed' | 'stopped';
  trigger: 'manual' | 'api' | 'schedule';
  inputs: Record<string, unknown> | null;
  output: unknown | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  node_count: number;
  node_runs?: NodeRun[];
}

/** 节点运行记录（含输入输出） */
export interface NodeRun {
  id: string;
  run_id: string;
  node_id: string;
  node_type: GraphNodeType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  inputs: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
}

export interface RunListResponse {
  count: number;
  spec_id: string;
  runs: OrchestrationRun[];
}

/** 运行时状态（GET /runtime/{id} 返回） */
export interface OrchestrationRuntime {
  spec_id: string;
  spec_name: string;
  is_running: boolean;
  current_agent: string | null;
  iteration: number;
  max_iterations: number;
  handoff_to: string | null;
  handoff_history: string[];
  results: Record<string, string>;
  done: boolean;
  output: string | null;
  started_at: string | null;
  finished_at: string | null;
  trace_id: string | null;
}

export interface RuntimeHistoryResponse {
  count: number;
  history: OrchestrationRuntime[];
}

/** 路由函数信息 */
export interface RouterInfo {
  name: string;
  signature: string;
}

export interface RouterListResponse {
  count: number;
  routers: RouterInfo[];
}

/** SSE 流式执行事件类型 */
export type OrchestrationStreamEvent =
  | { event: 'orchestration/start'; data: { spec_id: string; runtime: OrchestrationRuntime; run_id?: string } }
  | { event: 'agent/start'; data: { node_id: string; agent_id: string | null } }
  | { event: 'agent/chunk'; data: { node_id: string; agent_id: string | null; content: string } }
  | { event: 'agent/end'; data: { node_id: string; agent_id: string | null } }
  | { event: 'handoff'; data: { from: string; to: string } }
  | { event: 'orchestration/end'; data: { output: string; runtime: OrchestrationRuntime; run_id?: string } }
  | { event: 'orchestration/error'; data: { error: string; runtime: OrchestrationRuntime } };

/* ---------- Error ---------- */
export interface ApiErrorBody {
  error?: string;
  detail?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.error || body.detail || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
