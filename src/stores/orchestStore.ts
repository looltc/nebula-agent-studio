import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  EventInfo,
  GroupChatCreateRequest,
  GroupChatSummary,
  GroupChatUpdateRequest,
  GroupMessage,
  GroupMessageRequest,
  GroupStreamEvent,
  RelationGraphResponse,
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
}));

export default useOrchestStore;
