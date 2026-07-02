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
}

export interface FloorPolicy {
  type: 'round_robin' | 'moderator' | 'free_for_all';
  [key: string]: unknown;
}

export interface GroupChatSummary {
  id: string;
  participant_count: number;
  current_floor: string | null;
  floor_policy: FloorPolicy;
}

export interface GroupChatListResponse {
  group_chats: GroupChatSummary[];
}

export interface GroupChatCreateRequest {
  id?: string;
  participants: Participant[];
  floor_policy?: FloorPolicy;
}

export interface GroupChatCreateResponse {
  id: string;
  participants: Participant[];
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
