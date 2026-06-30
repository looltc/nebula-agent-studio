import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  AgentSummary,
  ConversationSummary,
  MessageInfo,
  TimelineEvent,
} from '@/types/api';

export type ChatMode = 'ws' | 'sse' | 'http';

function readLS(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

const LS_AGENT_ID = 'chat.currentAgentId';
const LS_CHAT_MODE = 'chat.chatMode';
const LS_CONVERSATION_ID = 'chat.currentConversationId';

function initialChatMode(): ChatMode {
  const stored = readLS(LS_CHAT_MODE);
  if (stored === 'ws' || stored === 'sse' || stored === 'http') return stored;
  return 'ws';
}

/**
 * 流式期间使用的思考步骤类型（向后兼容导出）。
 * 内部统一用 TimelineEvent，此类型仅用于 ToolCallBlock 等历史组件兼容。
 */
export interface StreamingThinkingStep {
  step: string;
  content: string;
}

export interface StreamingTool {
  id: string;
  tool: string;
  args?: Record<string, unknown>;
  status: 'loading' | 'done' | 'error';
  result?: unknown;
  durationMs?: number;
  error?: string;
}

export interface ChatState {
  agents: AgentSummary[];
  currentAgentId: string | null;
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: MessageInfo[];

  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;

  streaming: boolean;
  streamingText: string;
  /** 流式期间的统一时间线事件（思考 + 工具），按 seq 升序。 */
  streamingEvents: TimelineEvent[];

  loading: boolean;
  error: string | null;

  unread: Record<string, number>;
  markRead: (agentId: string) => void;

  loadAgents: () => Promise<void>;
  selectAgent: (agentId: string) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (convId: string) => Promise<void>;
  setCurrentConversationId: (id: string | null) => void;
  sendMessage: (text: string) => Promise<void>;
  appendLocalUserMessage: (text: string) => void;
  appendAssistantMessage: (content: string) => void;
  startStreaming: () => void;
  onStreamChunk: (text: string) => void;
  onStreamThinking: (step: string, content: string) => void;
  onStreamToolStart: (tool: string, args?: Record<string, unknown>) => void;
  onStreamToolEnd: (tool: string, result?: unknown) => void;
  onStreamDone: (messageId?: string) => void;
  onStreamError: (error: string) => void;
  clearChat: () => void;
  startNewChat: () => void;
  deleteConversation: (convId: string) => Promise<void>;
  /**
   * 页面刷新后恢复会话：从 localStorage 读取上次的 conversation_id，
   * 若存在则重新加载该会话的消息列表，避免刷新后"正在进行的对话找不到"。
   */
  restoreSession: () => Promise<void>;
}

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return Date.now().toString() + Math.random();
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Strip leading newlines/whitespace from an LLM reply. Local models often
 * emit a few leading "\n" before the actual content; trimming them keeps the
 * chat UI tidy and the first line aligned with the bubble top.
 */
function trimLeadingNewlines(s: string): string {
  // Trim leading \r, \n, \t and spaces — but only at the very start; internal
  // whitespace (including leading blank lines inside code blocks) is preserved.
  return s.replace(/^[\r\n\t ]+/, '');
}

export const useChatStore = create<ChatState>((set, get) => {
  /** 流式事件自增 seq，保证时间线顺序。每次 startStreaming 重置。 */
  let streamSeq = 0;

  return {
  agents: [],
  currentAgentId: readLS(LS_AGENT_ID),
  conversations: [],
  currentConversationId: null,
  messages: [],

  chatMode: initialChatMode(),
  setChatMode: (mode) => {
    writeLS(LS_CHAT_MODE, mode);
    set({ chatMode: mode });
  },

  streaming: false,
  streamingText: '',
  streamingEvents: [],

  loading: false,
  error: null,

  unread: {},
  markRead: (agentId) => {
    set((s) => ({ unread: { ...s.unread, [agentId]: 0 } }));
  },

  loadAgents: async () => {
    try {
      const res = await apiClient.listAgents();
      set({ agents: Array.isArray(res.agents) ? res.agents : [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  selectAgent: (agentId) => {
    const { currentAgentId } = get();
    if (currentAgentId === agentId) return;
    writeLS(LS_AGENT_ID, agentId);
    writeLS(LS_CONVERSATION_ID, '');
    set({
      currentAgentId: agentId,
      messages: [],
      currentConversationId: null,
      streaming: false,
      streamingText: '',
      streamingEvents: [],
      error: null,
    });
    void get().loadConversations();
  },

  loadConversations: async () => {
    const { currentAgentId } = get();
    if (!currentAgentId) return;
    try {
      const res = await apiClient.listConversations(currentAgentId);
      // Newest first: sort by started_at descending.
      const sorted = [...(Array.isArray(res.conversations) ? res.conversations : [])].sort((a, b) => {
        const ta = Date.parse(a.started_at);
        const tb = Date.parse(b.started_at);
        if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return tb - ta;
      });
      set({ conversations: sorted });
      get().markRead(currentAgentId);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadMessages: async (convId) => {
    try {
      const res = await apiClient.getConversationMessages(convId, 100);
      // Sort by timestamp ascending to fix jumbled order; also strip leading
      // newlines from assistant messages so loaded history stays tidy.
      const sorted = [...(Array.isArray(res.messages) ? res.messages : [])]
        .map((m) =>
          m.role === 'assistant' ? { ...m, content: trimLeadingNewlines(m.content) } : m,
        )
        .sort((a, b) => {
          const ta = Date.parse(a.ts);
          const tb = Date.parse(b.ts);
          if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
          return 0;
        });
      set({ messages: sorted, currentConversationId: convId });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  setCurrentConversationId: (id) => {
    if (id) {
      writeLS(LS_CONVERSATION_ID, id);
      set({ currentConversationId: id });
    }
  },

  sendMessage: async (text) => {
    const { currentAgentId, currentConversationId } = get();
    if (!currentAgentId) {
      set({ error: '未选择 Agent' });
      return;
    }
    // Note: user message already appended by useChatTransport.send
    set({ loading: true, streaming: true, error: null });

    try {
      const res = await apiClient.chat({
        agent_id: currentAgentId,
        message: text,
        conversation_id: currentConversationId,
      });
      get().appendAssistantMessage(trimLeadingNewlines(res.reply));
      set({
        currentConversationId: res.conversation_id,
        streaming: false,
        streamingText: '',
        streamingEvents: [],
        loading: false,
      });
      // Refresh conversation list so the new conversation appears with its title
      void get().loadConversations();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({
        error: msg,
        streaming: false,
        streamingText: '',
        streamingEvents: [],
        loading: false,
      });
    }
  },

  appendLocalUserMessage: (text) => {
    const msg: MessageInfo = {
      id: genId(),
      source: 'human',
      role: 'user',
      content: text,
      ts: nowIso(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  appendAssistantMessage: (content) => {
    const { currentAgentId } = get();
    const msg: MessageInfo = {
      id: genId(),
      source: currentAgentId ?? 'assistant',
      role: 'assistant',
      content,
      ts: nowIso(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  startStreaming: () => {
    streamSeq = 0;
    set({
      streaming: true,
      streamingText: '',
      streamingEvents: [],
    });
  },

  onStreamChunk: (text) => {
    set((s) => {
      const events = [...s.streamingEvents];
      // 连续 chunk 合并到同一个 text 事件，避免文本碎片化
      const last = events[events.length - 1];
      if (last && last.kind === 'text') {
        events[events.length - 1] = { ...last, content: last.content + text };
      } else {
        events.push({ kind: 'text' as const, seq: ++streamSeq, content: text });
      }
      return { streamingText: s.streamingText + text, streamingEvents: events };
    });
  },

  onStreamThinking: (step, content) => {
    set((s) => {
      const events = [...s.streamingEvents];
      // 连续相同 step 的 thinking 片段合并（如 reasoning 的多个 token 片段）
      const last = events[events.length - 1];
      if (last && last.kind === 'thinking' && last.step === step) {
        events[events.length - 1] = { ...last, content: last.content + content };
      } else {
        events.push({ kind: 'thinking' as const, seq: ++streamSeq, step, content });
      }
      return { streamingEvents: events };
    });
  },

  onStreamToolStart: (tool, args) => {
    const seq = ++streamSeq;
    const id = genId();
    set((s) => ({
      streamingEvents: [
        ...s.streamingEvents,
        { kind: 'tool' as const, seq, id, tool, args, status: 'loading' as const },
      ],
    }));
  },

  onStreamToolEnd: (tool, result) => {
    set((s) => {
      // 从后向前找到第一个同名且 loading 的工具事件，更新为 done
      const events = [...s.streamingEvents];
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (ev.kind === 'tool' && ev.tool === tool && ev.status === 'loading') {
          events[i] = { ...ev, status: 'done', result };
          break;
        }
      }
      return { streamingEvents: events };
    });
  },

  onStreamDone: (messageId) => {
    const { streamingText, streamingEvents, currentAgentId } = get();
    const msg: MessageInfo = {
      id: messageId ?? genId(),
      source: currentAgentId ?? 'assistant',
      role: 'assistant',
      content: trimLeadingNewlines(streamingText),
      ts: nowIso(),
      // 持久化思考/工具时间线，不再丢弃
      events: streamingEvents.length > 0 ? streamingEvents : undefined,
    };
    set((s) => ({
      messages: [...s.messages, msg],
      streaming: false,
      streamingText: '',
      streamingEvents: [],
      loading: false,
    }));
    // Refresh conversation list so title updates
    void get().loadConversations();
  },

  onStreamError: (error) => {
    // 错误时也保留已发生的思考/工具事件到错误消息上，便于排查
    const { streamingEvents, currentAgentId } = get();
    const msg: MessageInfo = {
      id: genId(),
      source: currentAgentId ?? 'assistant',
      role: 'assistant',
      content: `[Error: ${error}]`,
      ts: nowIso(),
      events: streamingEvents.length > 0 ? streamingEvents : undefined,
    };
    set((s) => ({
      messages: [...s.messages, msg],
      error,
      streaming: false,
      streamingText: '',
      streamingEvents: [],
      loading: false,
    }));
  },

  clearChat: () => {
    writeLS(LS_CONVERSATION_ID, '');
    set({
      messages: [],
      streaming: false,
      streamingText: '',
      streamingEvents: [],
      currentConversationId: null,
    });
  },

  startNewChat: () => {
    writeLS(LS_CONVERSATION_ID, '');
    set({
      messages: [],
      currentConversationId: null,
      streaming: false,
      streamingText: '',
      streamingEvents: [],
      error: null,
    });
  },

  deleteConversation: async (convId) => {
    // Call the backend so the conversation is removed from disk and won't
    // reappear on refresh; then update local state optimistically on success.
    try {
      await apiClient.deleteConversation(convId);
    } catch (e) {
      // Surface the error so the UI can warn the user the delete failed.
      set({ error: e instanceof Error ? e.message : String(e) });
      return;
    }
    set((s) => {
      const isCurrent = s.currentConversationId === convId;
      if (isCurrent) writeLS(LS_CONVERSATION_ID, '');
      return {
        conversations: s.conversations.filter((c) => c.id !== convId),
        currentConversationId: isCurrent ? null : s.currentConversationId,
        messages: isCurrent ? [] : s.messages,
      };
    });
  },

  restoreSession: async () => {
    // 从 localStorage 恢复上次正在进行的 conversation
    const savedConvId = readLS(LS_CONVERSATION_ID);
    const { currentAgentId } = get();
    if (!savedConvId || !currentAgentId) {
      // 没有保存的会话 ID，但如果有残留的 streaming 状态（如新会话第一消息
      // 发送后立即切换页面，stream_done 前连接断开），重置它避免 UI 卡在流式态
      if (get().streaming) {
        set({ streaming: false, streamingText: '', streamingEvents: [] });
      }
      return;
    }

    try {
      // 拉取该 conversation 的消息列表，恢复到 store
      const res = await apiClient.getConversationMessages(savedConvId, 100);
      const sorted = [...(Array.isArray(res.messages) ? res.messages : [])]
        .map((m) =>
          m.role === 'assistant' ? { ...m, content: trimLeadingNewlines(m.content) } : m,
        )
        .sort((a, b) => {
          const ta = Date.parse(a.ts);
          const tb = Date.parse(b.ts);
          if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
          return 0;
        });
      // 重置 streaming 状态：切换页面/刷新后流式连接已断开，
      // 后端已在 finally 块持久化部分回复，这里从 DB 加载最终内容即可。
      set({
        messages: sorted,
        currentConversationId: savedConvId,
        streaming: false,
        streamingText: '',
        streamingEvents: [],
      });
    } catch {
      // conversation 已被删除或不存在，清除 localStorage
      writeLS(LS_CONVERSATION_ID, '');
    }
  },
  };
});

export default useChatStore;
