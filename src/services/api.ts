import type {
  AgentCreateRequest,
  AgentCreateResponse,
  AgentDetailResponse,
  AgentListResponse,
  AgentUpdateRequest,
  ApiErrorBody,
  ChatRequest,
  ChatResponse,
  ConsolidateResponse,
  ConversationListResponse,
  ConversationMessagesResponse,
  EventListResponse,
  GroupChatCreateRequest,
  GroupChatCreateResponse,
  GroupChatListResponse,
  GroupChatSummary,
  GroupChatUpdateRequest,
  GroupMessageListResponse,
  GroupMessageRequest,
  GroupMessageResponse,
  HealthResponse,
  MemoryListResponse,
  MemoryStats,
  MetricsText,
  ProviderCreateRequest,
  ProviderListResponse,
  ProviderModelsResponse,
  ProviderTestResponse,
  ProviderSummary,
  RelationGraphResponse,
  SkillDetail,
  SkillInstallResult,
  SkillListResponse,
  SkillToggleResult,
  ToolListResponse,
  UserResponse,
  UserUpdateRequest,
  WorldStateResponse,
} from '@/types/api';
import { ApiError } from '@/types/api';

const BASE = '/api';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = { error: res.statusText };
    }
    throw new ApiError(res.status, body);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  // 非 JSON 响应（典型场景：后端未启动时 SPA fallback 返回 index.html）
  // 不应作为合法数据返回，否则 store 会把字符串当对象解构出 undefined 字段
  throw new ApiError(res.status, {
    error: `Expected JSON response but got ${ct || 'unknown content-type'} (${res.status} ${res.statusText})`,
  });
}

export const apiClient = {
  /* Health */
  health: () => api<HealthResponse>('/health'),

  /* World */
  getWorld: () => api<WorldStateResponse>('/world'),

  /* Agents */
  listAgents: () => api<AgentListResponse>('/agents'),
  getAgent: (id: string) => api<AgentDetailResponse>(`/agents/${encodeURIComponent(id)}`),
  createAgent: (body: AgentCreateRequest) =>
    api<AgentCreateResponse>('/agents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAgent: (id: string, body: AgentUpdateRequest) =>
    api<AgentCreateResponse>(`/agents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteAgent: (id: string) =>
    api<{ id: string; status: string }>(`/agents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  /* LLM Providers */
  listProviders: () => api<ProviderListResponse>('/llm/providers'),
  createProvider: (body: ProviderCreateRequest) =>
    api<ProviderSummary>('/llm/providers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateProvider: (id: string, body: ProviderCreateRequest) =>
    api<ProviderSummary>(`/llm/providers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteProvider: (id: string) =>
    api<{ id: string; status: string }>(`/llm/providers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  testProvider: (id: string) =>
    api<ProviderTestResponse>(`/llm/providers/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    }),
  listProviderModels: (id: string) =>
    api<ProviderModelsResponse>(`/llm/providers/${encodeURIComponent(id)}/models`),

  /* Chat (HTTP) */
  chat: (body: ChatRequest) =>
    api<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify(body) }),

  /* Conversations */
  listConversations: (agentId?: string) =>
    api<ConversationListResponse>(
      agentId
        ? `/conversations?agent_id=${encodeURIComponent(agentId)}`
        : '/conversations',
    ),
  getConversationMessages: (convId: string, limit = 50) =>
    api<ConversationMessagesResponse>(
      `/conversations/${encodeURIComponent(convId)}/messages?limit=${limit}`,
    ),
  deleteConversation: (convId: string) =>
    api<{ id: string; status: string }>(
      `/conversations/${encodeURIComponent(convId)}`,
      { method: 'DELETE' },
    ),

  /* Events */
  listEvents: (fromTick = 0, limit = 100) =>
    api<EventListResponse>(`/events?from_tick=${fromTick}&limit=${limit}`),

  /* Relations */
  getRelations: () => api<RelationGraphResponse>('/relations'),

  /* Tools */
  listTools: () => api<ToolListResponse>('/tools'),

  /* Skills */
  listSkills: () => api<SkillListResponse>('/skills'),
  getSkill: (name: string) =>
    api<SkillDetail>(`/skills/${encodeURIComponent(name)}`),
  uploadSkill: async (file: File): Promise<SkillInstallResult> => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${BASE}/skills/upload`, { method: 'POST', body: fd });
    if (!r.ok) {
      let body: ApiErrorBody = {};
      try { body = await r.json(); } catch { body = { error: r.statusText }; }
      throw new ApiError(r.status, body);
    }
    return r.json();
  },
  installSkillFromGithub: (url: string, subdirectory?: string) =>
    api<SkillInstallResult>('/skills/install/github', {
      method: 'POST',
      body: JSON.stringify({ url, subdirectory: subdirectory ?? null }),
    }),
  deleteSkill: (name: string) =>
    api<{ status: string }>(`/skills/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  toggleSkill: (name: string) =>
    api<SkillToggleResult>(`/skills/${encodeURIComponent(name)}/toggle`, { method: 'PUT' }),

  /* Group chats */
  listGroupChats: () => api<GroupChatListResponse>('/group-chats'),
  createGroupChat: (body: GroupChatCreateRequest) =>
    api<GroupChatCreateResponse>('/group-chats', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getGroupChat: (id: string) =>
    api<GroupChatSummary>(`/group-chats/${encodeURIComponent(id)}`),
  updateGroupChat: (id: string, body: GroupChatUpdateRequest) =>
    api<GroupChatSummary>(`/group-chats/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteGroupChat: (id: string) =>
    api<{ id: string; status: string }>(
      `/group-chats/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  getGroupChatMessages: (id: string, limit = 100) =>
    api<GroupMessageListResponse>(
      `/group-chats/${encodeURIComponent(id)}/messages?limit=${limit}`,
    ),
  sendGroupMessage: (id: string, body: GroupMessageRequest) =>
    api<GroupMessageResponse>(
      `/group-chats/${encodeURIComponent(id)}/messages`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  /**
   * 群聊 SSE 流式端点。返回 EventSource，用于接收多 agent 流式回复。
   * 调用方负责 close()。
   */
  streamGroupChat: (
    id: string,
    params: { source: string; content: string; mode?: string; targets?: string[] },
  ): EventSource => {
    const search = new URLSearchParams({
      source: params.source,
      content: params.content,
      mode: params.mode ?? 'broadcast',
    });
    if (params.targets && params.targets.length > 0) {
      search.set('targets', params.targets.join(','));
    }
    return new EventSource(
      `/api/group-chats/${encodeURIComponent(id)}/stream?${search.toString()}`,
    );
  },
  /**
   * 停止群聊自动接话链路。
   * 调用后端 dispatcher.stop()，当前层 agent 完成后退出，不再递归接话。
   */
  stopGroupChat: (id: string) =>
    api<{ ok: boolean; stopped: boolean; reason?: string }>(
      `/group-chats/${encodeURIComponent(id)}/stop`,
      { method: 'POST' },
    ),

  /* Memory (L3 long-term) */
  listMemory: (agentId: string, memoryType?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (memoryType) params.set('memory_type', memoryType);
    return api<MemoryListResponse>(
      `/agents/${encodeURIComponent(agentId)}/memory?${params.toString()}`,
    );
  },
  forgetMemory: (agentId: string, memoryId: string) =>
    api<{ status: string; id: string }>(
      `/agents/${encodeURIComponent(agentId)}/memory/${encodeURIComponent(memoryId)}`,
      { method: 'DELETE' },
    ),
  consolidateMemory: (agentId: string) =>
    api<ConsolidateResponse>(
      `/agents/${encodeURIComponent(agentId)}/memory/consolidate`,
      { method: 'POST' },
    ),
  memoryStats: (agentId: string) =>
    api<MemoryStats>(`/agents/${encodeURIComponent(agentId)}/memory/stats`),
  clearAllMemory: (agentId: string) =>
    api<{
      status: string;
      agent_id: string;
      l2_deleted: number;
      l3_deleted: number;
      vector_collections_deleted: string[];
    }>(`/agents/${encodeURIComponent(agentId)}/memory`, { method: 'DELETE' }),

  /* Metrics (Prometheus text) — root path, not under /api */
  metrics: async (): Promise<MetricsText> => {
    const r = await fetch('/metrics');
    if (!r.ok) throw new ApiError(r.status, { error: r.statusText });
    return r.text();
  },

  /* User (本地模式，user_id 从 OS home 目录推导) */
  getUser: () => api<UserResponse>('/user'),
  updateUser: (body: UserUpdateRequest) =>
    api<UserResponse>('/user', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export { api };
export default apiClient;
