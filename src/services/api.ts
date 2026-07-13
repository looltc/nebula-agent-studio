import type {
  AgentCreateRequest,
  AgentCreateResponse,
  AgentDetailResponse,
  AgentListResponse,
  AgentUpdateRequest,
  ApiErrorBody,
  ChatRequest,
  ChatResponse,
  CompiledGraphView,
  ConsolidateResponse,
  ConversationListResponse,
  ConversationMessagesResponse,
  CostResponse,
  EventListResponse,
  GraphSpecDetail,
  GraphSpecListResponse,
  GroupChatCreateRequest,
  GroupChatCreateResponse,
  GroupChatListResponse,
  GroupChatSummary,
  GroupChatUpdateRequest,
  GroupMessageListResponse,
  GroupMessageRequest,
  GroupMessageResponse,
  HealthResponse,
  InvokeRequest,
  InvokeResponse,
  MemoryListResponse,
  MemoryStats,
  MetricsDict,
  MetricsText,
  GenerateGraphRequest,
  GenerateGraphResponse,
  InstantiateTemplateRequest,
  NodeTypeDef,
  NodeTypeListResponse,
  ObservabilityStatus,
  OrchestrationRuntime,
  OrchestrationStreamEvent,
  OrchestrationRun,
  NodeRun,
  RunListResponse,
  PortCompatibleResponse,
  PortType,
  TemplateListResponse,
  ProviderCreateRequest,
  ProviderListResponse,
  ProviderModelsResponse,
  ProviderTestResponse,
  ProviderSummary,
  RelationGraphResponse,
  RouterInfo,
  RouterListResponse,
  RuntimeHistoryResponse,
  SkillDetail,
  SkillInstallResult,
  SkillListResponse,
  SkillToggleResult,
  SkillCreateRequest,
  SkillCreateResult,
  SpanView,
  SpecCreateRequest,
  SpecUpdateRequest,
  ToolListResponse,
  TraceByTickResponse,
  TraceListResponse,
  UserResponse,
  UserUpdateRequest,
  WorldStateResponse,
  AgentObservationListResponse,
  AgentObservationDetail,
  AgentTimelineResponse,
  GlobalTimelineResponse,
  ApprovalListResponse,
  ApprovalDetailResponse,
  ApprovalResumeRequest,
  ApprovalRejectRequest,
  WaitResumeRequest,
  WaitListResponse,
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
  createSkill: (body: SkillCreateRequest) =>
    api<SkillCreateResult>('/skills/create', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  /** 导出 Skill 为 zip 并触发浏览器下载。 */
  exportSkill: async (name: string): Promise<void> => {
    const r = await fetch(`${BASE}/skills/${encodeURIComponent(name)}/export`);
    if (!r.ok) {
      let errBody: ApiErrorBody = {};
      try { errBody = await r.json(); } catch { errBody = { error: r.statusText }; }
      throw new ApiError(r.status, errBody);
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

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

  /* Observability — Trace / Metrics / Status / Cost / Event Log */
  listTraces: (limit = 50) =>
    api<TraceListResponse>(`/traces?limit=${limit}`),
  getTrace: (traceId: string) =>
    api<SpanView>(`/traces/${encodeURIComponent(traceId)}`),
  getTracesByTick: (tick: number) =>
    api<TraceByTickResponse>(`/traces/by-tick/${tick}`),
  metricsJson: () => api<MetricsDict>('/metrics/json'),
  observabilityStatus: () => api<ObservabilityStatus>('/observability/status'),
  getCost: () => api<CostResponse>('/cost'),
  listPersistentEvents: (params: {
    fromTick?: number;
    toTick?: number;
    source?: string;
    eventType?: string;
    limit?: number;
  } = {}) => {
    const search = new URLSearchParams();
    if (params.fromTick != null) search.set('from_tick', String(params.fromTick));
    if (params.toTick != null) search.set('to_tick', String(params.toTick));
    if (params.source) search.set('source', params.source);
    if (params.eventType) search.set('event_type', params.eventType);
    search.set('limit', String(params.limit ?? 100));
    return api<EventListResponse>(`/events/persistent?${search.toString()}`);
  },

  /* Observe — Agent-centric observation API */
  listAgentObservations: () => api<AgentObservationListResponse>('/observe/agents'),
  getAgentObservation: (agentId: string) =>
    api<AgentObservationDetail>(`/observe/agents/${encodeURIComponent(agentId)}`),
  getAgentTimeline: (agentId: string, params: {
    eventType?: string;
    limit?: number;
  } = {}) => {
    const search = new URLSearchParams();
    if (params.eventType) search.set('event_type', params.eventType);
    search.set('limit', String(params.limit ?? 100));
    return api<AgentTimelineResponse>(
      `/observe/agents/${encodeURIComponent(agentId)}/timeline?${search.toString()}`,
    );
  },
  getGlobalTimeline: (params: {
    source?: string;
    eventType?: string;
    limit?: number;
  } = {}) => {
    const search = new URLSearchParams();
    if (params.source) search.set('source', params.source);
    if (params.eventType) search.set('event_type', params.eventType);
    search.set('limit', String(params.limit ?? 100));
    return api<GlobalTimelineResponse>(`/observe/timeline?${search.toString()}`);
  },

  /* HITL Approvals — 三场景统一审批 API（单聊/群聊/编排共用） */
  listPendingApprovals: (scene?: 'chat' | 'group' | 'orch') =>
    api<ApprovalListResponse>(
      `/approvals/pending${scene ? `?scene=${scene}` : ''}`,
    ),
  getApproval: (approvalId: string) =>
    api<ApprovalDetailResponse>(
      `/approvals/${encodeURIComponent(approvalId)}`,
    ),
  resumeApproval: (approvalId: string, body: ApprovalResumeRequest = { value: true }) =>
    api<{ ok: boolean; approval_id: string; value: unknown }>(
      `/approvals/${encodeURIComponent(approvalId)}/resume`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  rejectApproval: (approvalId: string, body: ApprovalRejectRequest = { reason: '' }) =>
    api<{ ok: boolean; approval_id: string; reason: string }>(
      `/approvals/${encodeURIComponent(approvalId)}/reject`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  cancelApproval: (approvalId: string) =>
    api<{ ok: boolean; approval_id: string }>(
      `/approvals/${encodeURIComponent(approvalId)}/cancel`,
      { method: 'POST' },
    ),

  /* Orchestration — logic.wait 审批/事件 API（向后兼容，独立于 ApprovalRegistry） */
  listPendingWaits: (specId: string) =>
    api<WaitListResponse>(
      `/orchestration/specs/${encodeURIComponent(specId)}/wait/pending`,
    ),
  resumeWait: (specId: string, nodeId: string, body: WaitResumeRequest = { value: true }) =>
    api<{ ok: boolean; spec_id: string; node_id: string }>(
      `/orchestration/specs/${encodeURIComponent(specId)}/wait/${encodeURIComponent(nodeId)}/resume`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  cancelWait: (specId: string, nodeId: string) =>
    api<{ ok: boolean; spec_id: string; node_id: string }>(
      `/orchestration/specs/${encodeURIComponent(specId)}/wait/${encodeURIComponent(nodeId)}/cancel`,
      { method: 'POST' },
    ),

  /* User (本地模式，user_id 从 OS home 目录推导) */
  getUser: () => api<UserResponse>('/user'),
  updateUser: (body: UserUpdateRequest) =>
    api<UserResponse>('/user', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  /* Orchestration — GraphSpec CRUD + compile + invoke + stream + runtime + routers */
  listSpecs: () => api<GraphSpecListResponse>('/orchestration/specs'),
  getSpec: (id: string) =>
    api<GraphSpecDetail>(`/orchestration/specs/${encodeURIComponent(id)}`),
  createSpec: (body: SpecCreateRequest) =>
    api<GraphSpecDetail>('/orchestration/specs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSpec: (id: string, body: SpecUpdateRequest) =>
    api<GraphSpecDetail>(`/orchestration/specs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteSpec: (id: string) =>
    api<{ deleted: boolean; id: string }>(
      `/orchestration/specs/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  activateSpec: (id: string) =>
    api<GraphSpecDetail>(
      `/orchestration/specs/${encodeURIComponent(id)}/activate`,
      { method: 'POST' },
    ),
  compileSpec: (id: string, mode?: 'fast' | 'real') =>
    api<CompiledGraphView>(
      `/orchestration/specs/${encodeURIComponent(id)}/compile${
        mode ? `?mode=${mode}` : ''
      }`,
      { method: 'POST' },
    ),
  invokeSpec: (id: string, body: InvokeRequest) =>
    api<InvokeResponse>(
      `/orchestration/specs/${encodeURIComponent(id)}/invoke`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  /**
   * 流式执行编排图（SSE）。
   *
   * 与群聊 streamGroupChat 不同，这里用 POST + fetch ReadableStream，
   * 因为后端 /specs/{id}/stream 是 POST 端点（携带 task body），
   * EventSource 不支持 POST。返回一个可消费的异步迭代器。
   *
   * 调用方用法：
   *   const iter = apiClient.streamSpec(id, { task });
   *   for await (const ev of iter) { ... }
   */
  streamSpec: (
    id: string,
    body: InvokeRequest,
  ): AsyncIterable<OrchestrationStreamEvent> => {
    // 用 AbortController 暴露取消能力
    const controller = new AbortController();

    async function* gen(): AsyncIterable<OrchestrationStreamEvent> {
      const res = await fetch(
        `${BASE}/orchestration/specs/${encodeURIComponent(id)}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      if (!res.ok || !res.body) {
        let errBody: ApiErrorBody = {};
        try { errBody = await res.json(); } catch { errBody = { error: res.statusText }; }
        throw new ApiError(res.status, errBody);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE 事件之间以空行分隔；解析完整的事件块
          let sepIdx: number;
          while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);

            let eventType = 'message';
            let dataStr = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr += line.slice(5).trim();
              }
            }
            if (!dataStr) continue;

            let data: unknown = {};
            try { data = JSON.parse(dataStr); } catch { data = { raw: dataStr }; }
            yield { event: eventType, data } as OrchestrationStreamEvent;
          }
        }
      } finally {
        reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }

    // 把 controller.abort 挂到生成器上，方便调用方取消
    const iterable = gen();
    (iterable as AsyncIterable<OrchestrationStreamEvent> & { abort: () => void }).abort =
      () => controller.abort();
    return iterable;
  },
  getRuntime: (id: string) =>
    api<OrchestrationRuntime>(`/orchestration/runtime/${encodeURIComponent(id)}`),
  getRuntimeHistory: (id: string) =>
    api<RuntimeHistoryResponse>(
      `/orchestration/runtime/${encodeURIComponent(id)}/history`,
    ),
  /* Orchestration — 运行历史 v6 */
  listRuns: (specId: string, limit = 20, offset = 0) =>
    api<RunListResponse>(
      `/orchestration/specs/${encodeURIComponent(specId)}/runs?limit=${limit}&offset=${offset}`,
    ),
  listLatestRuns: (specId: string, limit = 5) =>
    api<RunListResponse>(
      `/orchestration/specs/${encodeURIComponent(specId)}/runs/latest?limit=${limit}`,
    ),
  getRun: (runId: string) =>
    api<OrchestrationRun>(`/orchestration/runs/${encodeURIComponent(runId)}`),
  deleteRun: (runId: string) =>
    api<{ deleted: boolean }>(`/orchestration/runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
    }),
  getNodeRun: (runId: string, nodeId: string) =>
    api<NodeRun>(
      `/orchestration/runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}`,
    ),
  listRouters: () => api<RouterListResponse>('/orchestration/routers'),
  getRouterInfo: (name: string) =>
    api<RouterInfo>(`/orchestration/routers/${encodeURIComponent(name)}`),

  /* Orchestration — v2 节点类型 / 端口类型（设计文档 26-node-system-v2.md） */
  /** 列出所有已注册的节点类型定义（NodeTypeDef） */
  listNodeTypes: () =>
    api<NodeTypeListResponse>('/orchestration/node-types'),
  /** 获取单个节点类型定义 */
  getNodeTypeDef: (nodeType: string) =>
    api<NodeTypeDef>(
      `/orchestration/node-types/${encodeURIComponent(nodeType)}`,
    ),
  /** 校验源端口类型是否能连接到目标端口类型 */
  isPortCompatible: (src: PortType, dst: PortType) =>
    api<PortCompatibleResponse>(
      `/orchestration/port-types/compatible?src=${encodeURIComponent(src)}&dst=${encodeURIComponent(dst)}`,
    ),

  /* Orchestration — Phase C：Agent 自动生成图 + 模板库（设计文档 26-node-system-v2.md §八） */
  /** 用 LLM 根据任务描述生成编排图 spec（不持久化，调用方可继续 createSpec 保存） */
  generateGraph: (body: GenerateGraphRequest) =>
    api<GenerateGraphResponse>('/orchestration/generate-graph', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  /** 列出编排图模板（3 种典型模式：串行链 / 并行 fan-out / 自反思循环） */
  listTemplates: () => api<TemplateListResponse>('/orchestration/templates'),
  /** 从模板实例化新编排图（直接创建 spec + positions） */
  instantiateTemplate: (key: string, body: InstantiateTemplateRequest) =>
    api<GraphSpecDetail>(
      `/orchestration/templates/${encodeURIComponent(key)}/instantiate`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
};

export { api };
export default apiClient;
