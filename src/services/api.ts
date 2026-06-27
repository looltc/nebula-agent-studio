import type {
  AgentCreateRequest,
  AgentCreateResponse,
  AgentListResponse,
  ApiErrorBody,
  ChatRequest,
  ChatResponse,
  ConversationListResponse,
  ConversationMessagesResponse,
  EventListResponse,
  GroupChatCreateRequest,
  GroupChatCreateResponse,
  GroupChatListResponse,
  HealthResponse,
  MetricsText,
  RelationGraphResponse,
  ToolListResponse,
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
  return (await res.text()) as unknown as T;
}

export const apiClient = {
  /* Health */
  health: () => api<HealthResponse>('/health'),

  /* World */
  getWorld: () => api<WorldStateResponse>('/world'),

  /* Agents */
  listAgents: () => api<AgentListResponse>('/agents'),
  createAgent: (body: AgentCreateRequest) =>
    api<AgentCreateResponse>('/agents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /* Chat (HTTP) */
  chat: (body: ChatRequest) =>
    api<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify(body) }),

  /* Conversations */
  listConversations: () => api<ConversationListResponse>('/conversations'),
  getConversationMessages: (convId: string, limit = 50) =>
    api<ConversationMessagesResponse>(
      `/conversations/${encodeURIComponent(convId)}/messages?limit=${limit}`,
    ),

  /* Events */
  listEvents: (fromTick = 0, limit = 100) =>
    api<EventListResponse>(`/events?from_tick=${fromTick}&limit=${limit}`),

  /* Relations */
  getRelations: () => api<RelationGraphResponse>('/relations'),

  /* Tools */
  listTools: () => api<ToolListResponse>('/tools'),

  /* Group chats */
  listGroupChats: () => api<GroupChatListResponse>('/group-chats'),
  createGroupChat: (body: GroupChatCreateRequest) =>
    api<GroupChatCreateResponse>('/group-chats', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /* Metrics (Prometheus text) — root path, not under /api */
  metrics: async (): Promise<MetricsText> => {
    const r = await fetch('/metrics');
    if (!r.ok) throw new ApiError(r.status, { error: r.statusText });
    return r.text();
  },
};

export { api };
export default apiClient;
