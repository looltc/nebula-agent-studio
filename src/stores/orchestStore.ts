import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  CompiledGraphView,
  EventInfo,
  GenerateGraphRequest,
  GenerateGraphResponse,
  GraphSpecDetail,
  GraphSpecSummary,
  GroupChatCreateRequest,
  GroupChatSummary,
  GroupChatUpdateRequest,
  GroupMessage,
  GroupMessageRequest,
  GroupStreamEvent,
  InvokeRequest,
  NodeTypeDef,
  OrchestrationRuntime,
  OrchestrationRun,
  OrchestrationStreamEvent,
  PortType,
  RelationGraphResponse,
  RouterInfo,
  SpecCreateRequest,
  SpecUpdateRequest,
  TemplateSummary,
  TimelineEvent,
  WorldStateResponse,
} from '@/types/api';

/** 单个 agent 的流式聚合状态：文本 + 思考/工具事件 */
export interface StreamingReply {
  text: string;
  events: TimelineEvent[];
  seq: number;
}

export interface OrchestState {
  world: WorldStateResponse | null;
  events: EventInfo[];
  relations: RelationGraphResponse | null;
  groupChats: GroupChatSummary[];
  selectedGroupChatId: string | null;
  /** 当前打开的群聊详情（GroupChatPage 用） */
  currentGroupChat: GroupChatSummary | null;
  /** 当前群聊的消息列表 */
  groupMessages: GroupMessage[];
  /** 流式事件接收中的 agent 回复临时聚合（agent_id → {text, events}） */
  streamingReplies: Record<string, StreamingReply>;
  /** 是否正在流式接收 */
  groupStreaming: boolean;
  worldRunning: boolean;
  worldSpeed: number;
  loading: boolean;
  lastTick: number;

  loadWorld: () => Promise<void>;
  loadEvents: (fromTick?: number) => Promise<void>;
  loadRelations: () => Promise<void>;
  loadGroupChats: () => Promise<void>;
  selectGroupChat: (id: string) => void;
  createGroupChat: (body: GroupChatCreateRequest) => Promise<void>;
  /** 加载群聊详情 + 消息历史 */
  loadGroupChatDetail: (id: string) => Promise<void>;
  /** 更新群聊配置 */
  updateGroupChat: (id: string, body: GroupChatUpdateRequest) => Promise<void>;
  /** 删除群聊 */
  deleteGroupChat: (id: string) => Promise<void>;
  /** SSE 流式发送消息（自动接话循环实时推送） */
  streamGroupMessage: (
    id: string,
    body: GroupMessageRequest,
    onEvent?: (event: GroupStreamEvent) => void,
  ) => Promise<void>;
  /** 中止当前流式接收 */
  stopGroupStream: () => void;
  setWorldRunning: (running: boolean) => void;
  setWorldSpeed: (speed: number) => void;
  stepWorld: () => Promise<void>;

  /* ---------- Orchestration 编排层（无限画布） ---------- */
  /** 编排图列表（精简） */
  specs: GraphSpecSummary[];
  /** 当前选中的编排图完整内容（含 spec + positions） */
  currentSpec: GraphSpecDetail | null;
  /** 编译结果（POST /specs/{id}/compile 后的 CompiledGraphView） */
  compiledView: CompiledGraphView | null;
  /** 编译中（前端 500ms debounce 后调 compile） */
  compiling: boolean;
  /** 编译错误（compile_errors 展平存储便于 UI 显示） */
  compileErrors: string[];
  /** 运行时状态（GET /runtime/{id}） */
  runtime: OrchestrationRuntime | null;
  /** 同步执行中（POST /invoke） */
  invoking: boolean;
  /** 流式执行中（POST /stream） */
  orchestrationStreaming: boolean;
  /** 流式执行聚合输出（按节点 id 累积 content） */
  streamChunks: Record<string, string>;
  /** 已注册路由函数列表 */
  routers: RouterInfo[];
  /** v2：已注册节点类型定义列表（从 /node-types 拉取） */
  nodeTypes: NodeTypeDef[];
  /** v2：节点类型 → NodeTypeDef 的查找表（O(1) 查找） */
  nodeTypeMap: Record<string, NodeTypeDef>;
  /** v2：本地端口兼容性矩阵缓存（key=`${src}->${dst}`，value=boolean） */
  portCompatCache: Record<string, boolean>;
  /** v2：图模板列表（从 /templates 拉取，供「从模板新建」用） */
  templates: TemplateSummary[];
  /** Phase C：AI 生成图中（POST /generate-graph） */
  generatingGraph: boolean;
  /** 编排层通用 loading（list/detail 等） */
  orchestrationLoading: boolean;

  /* ---------- v6 运行历史 ---------- */
  /** 当前编排图的运行历史列表 */
  runs: OrchestrationRun[];
  /** 运行历史加载中 */
  runsLoading: boolean;
  /** 最近一次执行的 run_id（用于查看详情） */
  lastRunId: string | null;

  /** 加载编排图列表 */
  loadSpecs: () => Promise<void>;
  /** 选中编排图：加载详情 + 触发编译 + 加载 runtime */
  selectSpec: (id: string) => Promise<void>;
  /** 创建编排图，返回新建的 detail（含 id），不自动选中（由调用方决定） */
  createSpec: (body: SpecCreateRequest) => Promise<GraphSpecDetail | null>;
  /** 更新编排图（PUT），返回更新后的 detail 或 null */
  saveSpec: (id: string, body: SpecUpdateRequest) => Promise<GraphSpecDetail | null>;
  /** 删除编排图；若删除的是 currentSpec 则清空当前 */
  removeSpec: (id: string) => Promise<void>;
  /** 设为激活编排图（同时只有一个 active） */
  activateSpec: (id: string) => Promise<void>;
  /** 编译当前/指定编排图，更新 compiledView + compileErrors */
  compileSpec: (id: string) => Promise<void>;
  /** 同步执行编排图 */
  invokeSpec: (
    id: string,
    body: InvokeRequest,
  ) => Promise<OrchestrationRuntime | null>;
  /** 流式执行编排图（SSE），onEvent 实时回调每个事件 */
  streamSpec: (
    id: string,
    body: InvokeRequest,
    onEvent?: (event: OrchestrationStreamEvent) => void,
  ) => Promise<void>;
  /** 中止流式执行 */
  stopOrchestrationStream: () => void;
  /** 加载运行时状态 */
  loadRuntime: (id: string) => Promise<void>;
  /** 加载已注册路由函数列表 */
  loadRouters: () => Promise<void>;
  /** v2：加载节点类型注册表（NodeTypeDef 列表） */
  loadNodeTypes: () => Promise<void>;
  /** v2：查询端口兼容性（带缓存，避免重复请求） */
  checkPortCompatible: (src: PortType, dst: PortType) => Promise<boolean>;
  /** Phase C：加载图模板列表 */
  loadTemplates: () => Promise<void>;
  /** Phase C：用 LLM 生成编排图（不持久化，调用方拿到 spec 后再 createSpec 保存） */
  generateGraph: (body: GenerateGraphRequest) => Promise<GenerateGraphResponse | null>;
  /** Phase C：从模板实例化新编排图（直接创建 spec + positions + 选中） */
  instantiateTemplate: (key: string, name: string) => Promise<GraphSpecDetail | null>;

  /* ---------- v6 运行历史 ---------- */
  /** 加载编排图运行历史列表 */
  loadRuns: (specId: string, limit?: number) => Promise<void>;
  /** 加载单个 run 详情（含 node_runs） */
  loadRunDetail: (runId: string) => Promise<OrchestrationRun | null>;
  /** 删除运行记录 */
  removeRun: (runId: string) => Promise<void>;
  /** 设置最近一次 run_id（执行后调用） */
  setLastRunId: (runId: string | null) => void;
}

function mergeEvents(existing: EventInfo[], incoming: EventInfo[]): EventInfo[] {
  const map = new Map<string, EventInfo>();
  for (const ev of existing) map.set(ev.id, ev);
  for (const ev of incoming) map.set(ev.id, ev);
  const merged = Array.from(map.values());
  merged.sort((a, b) => a.tick - b.tick || a.ts.localeCompare(b.ts));
  return merged;
}

function maxTickOf(events: EventInfo[], fallback: number): number {
  return events.reduce((m, ev) => Math.max(m, ev.tick), fallback);
}

// 模块级变量持有 SSE 连接与当前 gcId（不放入 state，避免触发渲染）
let groupStreamSource: EventSource | null = null;
let groupStreamId: string | null = null;

// lastGroupChatId 持久化（刷新后恢复上次群聊）
const LAST_GC_KEY = 'nebula:lastGroupChatId';
function loadLastGroupChatId(): string | null {
  try {
    return localStorage.getItem(LAST_GC_KEY);
  } catch {
    return null;
  }
}
function saveLastGroupChatId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_GC_KEY, id);
    else localStorage.removeItem(LAST_GC_KEY);
  } catch {
    /* ignore */
  }
}

export const useOrchestStore = create<OrchestState>((set, get) => ({
  world: null,
  events: [],
  relations: null,
  groupChats: [],
  selectedGroupChatId: loadLastGroupChatId(),
  currentGroupChat: null,
  groupMessages: [],
  streamingReplies: {},
  groupStreaming: false,
  worldRunning: false,
  worldSpeed: 1,
  loading: false,
  lastTick: 0,

  /* ---------- 编排层初始 state ---------- */
  specs: [],
  currentSpec: null,
  compiledView: null,
  compiling: false,
  compileErrors: [],
  runtime: null,
  invoking: false,
  orchestrationStreaming: false,
  streamChunks: {},
  routers: [],
  nodeTypes: [],
  nodeTypeMap: {},
  portCompatCache: {},
  templates: [],
  generatingGraph: false,
  orchestrationLoading: false,

  /* v6 运行历史 */
  runs: [],
  runsLoading: false,
  lastRunId: null,

  loadWorld: async () => {
    set({ loading: true });
    try {
      const world = await apiClient.getWorld();
      set({ world });
    } catch (e) {
      console.error('Failed to load world:', e);
    } finally {
      set({ loading: false });
    }
  },

  loadEvents: async (fromTick) => {
    try {
      const startTick = fromTick ?? get().lastTick;
      const res = await apiClient.listEvents(startTick, 50);
      set((s) => {
        const merged = mergeEvents(s.events, res.events);
        return { events: merged, lastTick: maxTickOf(merged, s.lastTick) };
      });
    } catch (e) {
      console.error('Failed to load events:', e);
    }
  },

  loadRelations: async () => {
    try {
      const relations = await apiClient.getRelations();
      set({ relations });
    } catch (e) {
      console.error('Failed to load relations:', e);
    }
  },

  loadGroupChats: async () => {
    try {
      const res = await apiClient.listGroupChats();
      set({ groupChats: res.group_chats });
    } catch (e) {
      console.error('Failed to load group chats:', e);
    }
  },

  selectGroupChat: (id) => {
    set({ selectedGroupChatId: id });
    saveLastGroupChatId(id);
  },

  createGroupChat: async (body) => {
    try {
      await apiClient.createGroupChat(body);
      await get().loadGroupChats();
    } catch (e) {
      console.error('Failed to create group chat:', e);
    }
  },

  loadGroupChatDetail: async (id) => {
    try {
      const [detail, msgRes] = await Promise.all([
        apiClient.getGroupChat(id),
        apiClient.getGroupChatMessages(id, 200),
      ]);
      set({
        currentGroupChat: detail,
        groupMessages: msgRes.messages,
        streamingReplies: {},
        groupStreaming: false,
      });
      saveLastGroupChatId(id);
    } catch (e) {
      console.error('Failed to load group chat detail:', e);
      set({ currentGroupChat: null, groupMessages: [] });
      saveLastGroupChatId(null);
    }
  },

  updateGroupChat: async (id, body) => {
    try {
      await apiClient.updateGroupChat(id, body);
      await get().loadGroupChats();
      // 若正在查看该群聊，刷新详情
      if (get().currentGroupChat?.id === id) {
        await get().loadGroupChatDetail(id);
      }
    } catch (e) {
      console.error('Failed to update group chat:', e);
    }
  },

  deleteGroupChat: async (id) => {
    try {
      await apiClient.deleteGroupChat(id);
      await get().loadGroupChats();
      if (get().currentGroupChat?.id === id) {
        set({ currentGroupChat: null, groupMessages: [] });
        saveLastGroupChatId(null);
      }
    } catch (e) {
      console.error('Failed to delete group chat:', e);
    }
  },

  streamGroupMessage: async (id, body, onEvent) => {
    // 先关闭已有连接
    get().stopGroupStream();
    set({ groupStreaming: true, streamingReplies: {} });

    const source = apiClient.streamGroupChat(id, {
      source: body.source,
      content: body.content,
      mode: body.mode,
      targets: body.targets,
    });
    groupStreamSource = source;
    groupStreamId = id;

    source.onmessage = (ev) => {
      try {
        const event: GroupStreamEvent = JSON.parse(ev.data);

        // message 事件：用户消息 + agent 回复消息（不带 agent_id，用 message.source 清理 streamingReply）
        if (event.type === 'message' && event.message) {
          set((s) => {
            const replies = { ...s.streamingReplies };
            // 用消息 source 清理对应的流式聚合（agent 回复转正）
            const src = event.message!.source;
            if (src in replies) delete replies[src];
            return { groupMessages: [...s.groupMessages, event.message!], streamingReplies: replies };
          });
          onEvent?.(event);
          return;
        }

        // end / error → 结束流式
        if (event.type === 'end' || event.type === 'error') {
          set({ groupStreaming: false, streamingReplies: {} });
          source.close();
          groupStreamSource = null;
          groupStreamId = null;
          onEvent?.(event);
          return;
        }

        // skip 事件：Agent 自主决定不回复，清理该 agent 的流式聚合
        if (event.type === 'skip' && event.agent_id) {
          const skipAid = event.agent_id;
          set((s) => {
            const replies = { ...s.streamingReplies };
            delete replies[skipAid];
            return { streamingReplies: replies };
          });
          onEvent?.(event);
          return;
        }

        // chunk/thinking/tool 事件需要 agent_id
        const aid = event.agent_id;
        if (!aid) {
          onEvent?.(event);
          return;
        }

        if (event.type === 'chunk' && event.payload?.text) {
          // 文本片段：累积到 streamingReplies[aid].text
          set((s) => {
            const prev = s.streamingReplies[aid] || { text: '', events: [], seq: 0 };
            return {
              streamingReplies: {
                ...s.streamingReplies,
                [aid]: { ...prev, text: prev.text + (event.payload!.text as string) },
              },
            };
          });
        } else if (event.type === 'thinking') {
          // 思考事件：合并连续相同 step 的片段
          const step = (event.payload?.step as string) || '思考';
          const content = (event.payload?.content as string) || '';
          set((s) => {
            const prev = s.streamingReplies[aid] || { text: '', events: [], seq: 0 };
            const events = [...prev.events];
            const last = events[events.length - 1];
            if (last && last.kind === 'thinking' && last.step === step) {
              events[events.length - 1] = { ...last, content: last.content + content };
            } else {
              events.push({ kind: 'thinking', seq: ++prev.seq, step, content });
            }
            return {
              streamingReplies: { ...s.streamingReplies, [aid]: { ...prev, events } },
            };
          });
        } else if (event.type === 'tool_start') {
          const tool = (event.payload?.tool as string) || 'tool';
          const args = event.payload?.args as Record<string, unknown> | undefined;
          set((s) => {
            const prev = s.streamingReplies[aid] || { text: '', events: [], seq: 0 };
            const events = [...prev.events];
            events.push({
              kind: 'tool',
              seq: ++prev.seq,
              id: `${aid}-${prev.seq}`,
              tool,
              args,
              status: 'loading',
            });
            return {
              streamingReplies: { ...s.streamingReplies, [aid]: { ...prev, events } },
            };
          });
        } else if (event.type === 'tool_end') {
          const tool = (event.payload?.tool as string) || 'tool';
          const result = event.payload?.result;
          set((s) => {
            const prev = s.streamingReplies[aid] || { text: '', events: [], seq: 0 };
            const events = [...prev.events];
            // 从后向前找第一个同名且 loading 的工具事件，更新为 done
            for (let i = events.length - 1; i >= 0; i--) {
              const e = events[i];
              if (e.kind === 'tool' && e.tool === tool && e.status === 'loading') {
                events[i] = { ...e, status: 'done', result };
                break;
              }
            }
            return {
              streamingReplies: { ...s.streamingReplies, [aid]: { ...prev, events } },
            };
          });
        }
        onEvent?.(event);
      } catch (err) {
        console.error('Failed to parse group stream event:', err);
      }
    };

    source.onerror = () => {
      set({ groupStreaming: false, streamingReplies: {} });
      source.close();
      groupStreamSource = null;
      groupStreamId = null;
    };
  },

  stopGroupStream: () => {
    if (groupStreamSource) {
      groupStreamSource.close();
      groupStreamSource = null;
    }
    if (groupStreamId) {
      // fire-and-forget 调后端 stop，让 dispatcher 停止后续接话递归
      apiClient.stopGroupChat(groupStreamId).catch((e) => {
        console.warn('stopGroupChat 调用失败:', e);
      });
      groupStreamId = null;
    }
    set({ groupStreaming: false, streamingReplies: {} });
  },

  setWorldRunning: (running) => set({ worldRunning: running }),
  setWorldSpeed: (speed) => set({ worldSpeed: speed }),

  stepWorld: async () => {
    await get().loadWorld();
  },

  /* ---------- 编排层 actions ---------- */

  loadSpecs: async () => {
    set({ orchestrationLoading: true });
    try {
      const res = await apiClient.listSpecs();
      set({ specs: res.specs });
    } catch (e) {
      console.error('Failed to load specs:', e);
    } finally {
      set({ orchestrationLoading: false });
    }
  },

  selectSpec: async (id) => {
    set({ orchestrationLoading: true });
    try {
      const detail = await apiClient.getSpec(id);
      set({ currentSpec: detail, compiledView: null, compileErrors: [], runtime: null });
      // 并行触发编译 + runtime 查询（不阻塞选中）
      void get().compileSpec(id);
      void get().loadRuntime(id);
    } catch (e) {
      console.error('Failed to select spec:', e);
      set({ currentSpec: null, compiledView: null, compileErrors: [], runtime: null });
    } finally {
      set({ orchestrationLoading: false });
    }
  },

  createSpec: async (body) => {
    try {
      const detail = await apiClient.createSpec(body);
      await get().loadSpecs();
      return detail;
    } catch (e) {
      console.error('Failed to create spec:', e);
      return null;
    }
  },

  saveSpec: async (id, body) => {
    try {
      const detail = await apiClient.updateSpec(id, body);
      set({ currentSpec: detail });
      await get().loadSpecs();
      // 保存后自动重新编译（spec 改动可能影响编译结果）
      void get().compileSpec(id);
      return detail;
    } catch (e) {
      console.error('Failed to save spec:', e);
      return null;
    }
  },

  removeSpec: async (id) => {
    try {
      await apiClient.deleteSpec(id);
      if (get().currentSpec?.id === id) {
        set({ currentSpec: null, compiledView: null, compileErrors: [], runtime: null });
      }
      await get().loadSpecs();
    } catch (e) {
      console.error('Failed to remove spec:', e);
    }
  },

  activateSpec: async (id) => {
    try {
      await apiClient.activateSpec(id);
      await get().loadSpecs();
      if (get().currentSpec?.id === id) {
        // 同步更新 currentSpec.is_active
        const detail = await apiClient.getSpec(id);
        set({ currentSpec: detail });
      }
    } catch (e) {
      console.error('Failed to activate spec:', e);
    }
  },

  compileSpec: async (id) => {
    set({ compiling: true });
    try {
      const view = await apiClient.compileSpec(id);
      set({ compiledView: view, compileErrors: view.compile_errors ?? [] });
    } catch (e) {
      console.error('Failed to compile spec:', e);
      set({ compileErrors: [String(e)] });
    } finally {
      set({ compiling: false });
    }
  },

  invokeSpec: async (id, body) => {
    set({ invoking: true });
    try {
      const res = await apiClient.invokeSpec(id, body);
      set({ runtime: res.runtime });
      if (res.run_id) set({ lastRunId: res.run_id });
      // 执行后刷新运行历史
      void get().loadRuns(id, 20);
      return res.runtime;
    } catch (e) {
      console.error('Failed to invoke spec:', e);
      return null;
    } finally {
      set({ invoking: false });
    }
  },

  streamSpec: async (id, body, onEvent) => {
    // 先停止已有的流式执行
    get().stopOrchestrationStream();
    const epoch = ++orchestrationStreamEpoch;
    set({ orchestrationStreaming: true, streamChunks: {}, runtime: null });

    const iterable = apiClient.streamSpec(id, body);
    orchestrationStreamAbort = () => {
      (iterable as AsyncIterable<OrchestrationStreamEvent> & { abort: () => void }).abort?.();
    };

    try {
      for await (const ev of iterable) {
        onEvent?.(ev);
        switch (ev.event) {
          case 'orchestration/start':
            set({ runtime: ev.data.runtime });
            if ('run_id' in ev.data && ev.data.run_id) {
              set({ lastRunId: ev.data.run_id as string });
            }
            break;
          case 'agent/start':
            set((s) => ({
              streamChunks: { ...s.streamChunks, [ev.data.node_id]: '' },
              runtime: s.runtime
                ? { ...s.runtime, current_agent: ev.data.node_id }
                : s.runtime,
            }));
            break;
          case 'agent/chunk':
            set((s) => ({
              streamChunks: {
                ...s.streamChunks,
                [ev.data.node_id]:
                  (s.streamChunks[ev.data.node_id] ?? '') + ev.data.content,
              },
            }));
            break;
          case 'agent/end':
            // 节点结束：可在此触发 results 更新（暂只维持 streamChunks）
            break;
          case 'handoff':
            set((s) =>
              s.runtime
                ? {
                    runtime: {
                      ...s.runtime,
                      handoff_to: ev.data.to,
                      handoff_history: [...s.runtime.handoff_history, ev.data.to],
                    },
                  }
                : {},
            );
            break;
          case 'orchestration/end':
            set({
              runtime: ev.data.runtime,
              orchestrationStreaming: false,
            });
            // 流结束后刷新运行历史
            void get().loadRuns(id, 20);
            break;
          case 'orchestration/error':
            set({
              runtime: ev.data.runtime,
              orchestrationStreaming: false,
            });
            console.error('Orchestration stream error:', ev.data.error);
            break;
        }
      }
    } catch (e) {
      console.error('Failed to stream spec:', e);
      // 竞态守卫：旧流被新流替换时不覆盖状态
      if (epoch !== orchestrationStreamEpoch) return;
      set((s) => ({
        orchestrationStreaming: false,
        runtime: s.runtime ? { ...s.runtime, is_running: false, done: true } : null,
      }));
    } finally {
      // 只有当前流才清空 abort 函数，避免清空新流的 abort
      if (epoch === orchestrationStreamEpoch) {
        orchestrationStreamAbort = null;
      }
    }
  },

  stopOrchestrationStream: () => {
    orchestrationStreamEpoch++;
    if (orchestrationStreamAbort) {
      orchestrationStreamAbort();
      orchestrationStreamAbort = null;
    }
    set((s) => ({
      orchestrationStreaming: false,
      streamChunks: {},
      runtime: s.runtime ? { ...s.runtime, is_running: false, done: true } : null,
    }));
  },

  loadRuntime: async (id) => {
    try {
      const runtime = await apiClient.getRuntime(id);
      set({ runtime });
    } catch (e) {
      console.error('Failed to load runtime:', e);
    }
  },

  loadRouters: async () => {
    try {
      const res = await apiClient.listRouters();
      set({ routers: res.routers });
    } catch (e) {
      console.error('Failed to load routers:', e);
    }
  },

  loadNodeTypes: async () => {
    try {
      const res = await apiClient.listNodeTypes();
      const map: Record<string, NodeTypeDef> = {};
      for (const def of res.node_types) map[def.type] = def;
      set({ nodeTypes: res.node_types, nodeTypeMap: map });
    } catch (e) {
      console.error('Failed to load node types:', e);
    }
  },

  checkPortCompatible: async (src, dst) => {
    const key = `${src}->${dst}`;
    const cached = get().portCompatCache[key];
    if (cached !== undefined) return cached;
    try {
      const res = await apiClient.isPortCompatible(src, dst);
      set((s) => ({
        portCompatCache: { ...s.portCompatCache, [key]: res.compatible },
      }));
      return res.compatible;
    } catch (e) {
      console.error('Failed to check port compatible:', e);
      // 出错时降级为允许连接（不阻塞用户操作）
      return true;
    }
  },

  loadTemplates: async () => {
    try {
      const res = await apiClient.listTemplates();
      set({ templates: res.templates });
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  },

  generateGraph: async (body) => {
    set({ generatingGraph: true });
    try {
      const res = await apiClient.generateGraph(body);
      return res;
    } catch (e) {
      console.error('Failed to generate graph:', e);
      return null;
    } finally {
      set({ generatingGraph: false });
    }
  },

  instantiateTemplate: async (key, name) => {
    try {
      const detail = await apiClient.instantiateTemplate(key, { name });
      await get().loadSpecs();
      return detail;
    } catch (e) {
      console.error('Failed to instantiate template:', e);
      return null;
    }
  },

  /* ---------- v6 运行历史 ---------- */
  loadRuns: async (specId, limit = 20) => {
    set({ runsLoading: true });
    try {
      const res = await apiClient.listRuns(specId, limit);
      set({ runs: res.runs, runsLoading: false });
    } catch (e) {
      console.error('Failed to load runs:', e);
      set({ runsLoading: false });
    }
  },

  loadRunDetail: async (runId) => {
    try {
      return await apiClient.getRun(runId);
    } catch (e) {
      console.error('Failed to load run detail:', e);
      return null;
    }
  },

  removeRun: async (runId) => {
    try {
      await apiClient.deleteRun(runId);
      const { runs } = get();
      set({ runs: runs.filter((r) => r.id !== runId) });
    } catch (e) {
      console.error('Failed to delete run:', e);
    }
  },

  setLastRunId: (runId) => set({ lastRunId: runId }),
}));

// 模块级变量持有当前流式执行的 abort 函数（不放入 state，避免触发渲染）
let orchestrationStreamAbort: (() => void) | null = null;
// 流式执行 epoch 计数器：每次启动新流或停止时递增，
// 旧流的 catch/finally 通过比对 epoch 判断是否已被替换，避免覆盖新流状态（竞态守卫）
let orchestrationStreamEpoch = 0;

export default useOrchestStore;
