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

export interface AgentCreateRequest {
  id: string;
  name: string;
  role: string;
  persona: string;
  thinking_model: string;
  max_iterations: number;
  max_messages: number;
  system_prompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  llm: LLMSpecRequest | null;
  /** 头像文件名（如 "cat.jpg"），可空 */
  avatar?: string | null;
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
  thinking_model: string;
  max_iterations: number;
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
}

export interface AgentUpdateRequest {
  // id is required by the backend's AgentCreateRequest schema; the PUT
  // endpoint reuses it and overwrites req.id with the path param, so we
  // always echo the current agent id back to satisfy Pydantic validation.
  id: string;
  name: string;
  role: string;
  persona: string;
  thinking_model: string;
  max_iterations: number;
  max_messages: number;
  system_prompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  llm: LLMSpecRequest | null;
  /** 头像文件名（如 "cat.jpg"），可空 */
  avatar?: string | null;
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
export type SSEEvent = SSEStartEvent | SSEChunkEvent | SSEEndEvent | SSEErrorEvent;

/* ---------- Metrics ---------- */
export type MetricsText = string;

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
