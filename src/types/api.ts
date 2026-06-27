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
}

export interface AgentListResponse {
  agents: AgentSummary[];
}

<<<<<<< HEAD
=======
export interface LLMSpecRequest {
  provider: string;
  model: string;
  temperature: number;
  api_key?: string | null;
  base_url?: string | null;
}

>>>>>>> feat-implement-frontend-design-GH23Da
export interface AgentCreateRequest {
  id: string;
  name: string;
  role: string;
  persona: string;
  thinking_model: string;
<<<<<<< HEAD
=======
  max_iterations: number;
  max_messages: number;
  system_prompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  llm: LLMSpecRequest | null;
>>>>>>> feat-implement-frontend-design-GH23Da
}

export interface AgentCreateResponse {
  id: string;
  name: string;
  status: string;
}

<<<<<<< HEAD
=======
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
  };
}

export interface AgentUpdateRequest {
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
}

/* ---------- LLM Providers ---------- */
export interface ProviderSummary {
  id: string;
  name: string;
  base_url: string | null;
  api_key_set: boolean;
}

export interface ProviderListResponse {
  providers: ProviderSummary[];
}

export interface ProviderCreateRequest {
  name: string;
  base_url?: string | null;
  api_key?: string | null;
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

>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
=======
  title?: string;
>>>>>>> feat-implement-frontend-design-GH23Da
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
  source: string;
  target: string;
  type: 'trust' | 'authority' | 'collaboration' | 'rivalry';
  weight: number;
}

export interface RelationGraphResponse {
  nodes: Array<{ id: string; label?: string }>;
  edges: Relation[];
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
