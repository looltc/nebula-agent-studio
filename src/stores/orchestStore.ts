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
  WorldStateResponse,
} from '@/types/api';

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
  /** 流式事件接收中的 agent 回复临时聚合（agent_id → 正在生成的文本） */
  streamingReplies: Record<string, string>;
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

export const useOrchestStore = create<OrchestState>((set, get) => ({
  world: null,
  events: [],
  relations: null,
  groupChats: [],
  selectedGroupChatId: null,
  currentGroupChat: null,
  groupMessages: [],
  streamingReplies: {},
  groupStreaming: false,
  worldRunning: false,
  worldSpeed: 1,
  loading: false,
  lastTick: 0,

  // 当前 SSE 连接（不放入 state，避免渲染）
  _groupStreamSource: null as EventSource | null,

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

  selectGroupChat: (id) => set({ selectedGroupChatId: id }),

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
    } catch (e) {
      console.error('Failed to load group chat detail:', e);
      set({ currentGroupChat: null, groupMessages: [] });
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
    // 用闭包变量持有，避免放进 state 触发渲染
    (get() as { _groupStreamSource?: EventSource | null })._groupStreamSource = source;
    // 记录当前 gcId，stopGroupStream 调后端 stop 端点用
    (get() as { _groupStreamId?: string | null })._groupStreamId = id;

    source.onmessage = (ev) => {
      try {
        const event: GroupStreamEvent = JSON.parse(ev.data);
        // 处理 chunk：累积到 streamingReplies
        if (event.type === 'chunk' && event.agent_id && event.payload?.text) {
          set((s) => ({
            streamingReplies: {
              ...s.streamingReplies,
              [event.agent_id!]: (s.streamingReplies[event.agent_id!] || '') + (event.payload!.text as string),
            },
          }));
        }
        // 处理 message：追加到 groupMessages
        if (event.type === 'message' && event.message) {
          set((s) => ({
            groupMessages: [...s.groupMessages, event.message!],
            // 若该 agent 有 streamingReplies，清掉（已转为正式消息）
            streamingReplies:
              event.message!.source in (s.streamingReplies)
                ? Object.fromEntries(Object.entries(s.streamingReplies).filter(([k]) => k !== event.message!.source))
                : s.streamingReplies,
          }));
        }
        // end / error → 结束流式
        if (event.type === 'end' || event.type === 'error') {
          set({ groupStreaming: false, streamingReplies: {} });
          source.close();
          (get() as { _groupStreamSource?: EventSource | null })._groupStreamSource = null;
          (get() as { _groupStreamId?: string | null })._groupStreamId = null;
        }
        onEvent?.(event);
      } catch (err) {
        console.error('Failed to parse group stream event:', err);
      }
    };

    source.onerror = () => {
      set({ groupStreaming: false, streamingReplies: {} });
      source.close();
      (get() as { _groupStreamSource?: EventSource | null })._groupStreamSource = null;
      (get() as { _groupStreamId?: string | null })._groupStreamId = null;
    };
  },

  stopGroupStream: () => {
    const src = (get() as { _groupStreamSource?: EventSource | null })._groupStreamSource;
    const gid = (get() as { _groupStreamId?: string | null })._groupStreamId;
    if (src) {
      src.close();
      (get() as { _groupStreamSource?: EventSource | null })._groupStreamSource = null;
    }
    if (gid) {
      // fire-and-forget 调后端 stop，让 dispatcher 停止后续接话递归
      apiClient.stopGroupChat(gid).catch((e) => {
        console.warn('stopGroupChat 调用失败:', e);
      });
      (get() as { _groupStreamId?: string | null })._groupStreamId = null;
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
