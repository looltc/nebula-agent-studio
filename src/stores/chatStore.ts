import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  AgentSummary,
  ConversationSummary,
  MessageInfo,
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

function initialChatMode(): ChatMode {
  const stored = readLS(LS_CHAT_MODE);
  if (stored === 'ws' || stored === 'sse' || stored === 'http') return stored;
  return 'ws';
}

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
  streamingThinking: StreamingThinkingStep[];
  streamingTools: StreamingTool[];

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

export const useChatStore = create<ChatState>((set, get) => ({
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
  streamingThinking: [],
  streamingTools: [],

  loading: false,
  error: null,

  unread: {},
  markRead: (agentId) => {
    set((s) => ({ unread: { ...s.unread, [agentId]: 0 } }));
  },

  loadAgents: async () => {
    try {
      const res = await apiClient.listAgents();
      set({ agents: res.agents });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  selectAgent: (agentId) => {
    const { currentAgentId } = get();
    if (currentAgentId === agentId) return;
    writeLS(LS_AGENT_ID, agentId);
    set({
      currentAgentId: agentId,
      messages: [],
      currentConversationId: null,
      streaming: false,
      streamingText: '',
      streamingThinking: [],
      streamingTools: [],
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
      const sorted = [...res.conversations].sort((a, b) => {
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
      const sorted = [...res.messages]
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
    if (id) set({ currentConversationId: id });
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
        streamingThinking: [],
        streamingTools: [],
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
        streamingThinking: [],
        streamingTools: [],
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
    set({
      streaming: true,
      streamingText: '',
      streamingThinking: [],
      streamingTools: [],
    });
  },

  onStreamChunk: (text) => {
    set((s) => ({ streamingText: s.streamingText + text }));
  },

  onStreamThinking: (step, content) => {
    set((s) => ({
      streamingThinking: [...s.streamingThinking, { step, content }],
    }));
  },

  onStreamToolStart: (tool, args) => {
    const t: StreamingTool = { id: genId(), tool, args, status: 'loading' };
    set((s) => ({ streamingTools: [...s.streamingTools, t] }));
  },

  onStreamToolEnd: (tool, result) => {
    set((s) => {
      const tools = [...s.streamingTools];
      let idx = -1;
      for (let i = tools.length - 1; i >= 0; i--) {
        if (tools[i].tool === tool && tools[i].status === 'loading') {
          idx = i;
          break;
        }
      }
      if (idx >= 0) {
        tools[idx] = { ...tools[idx], status: 'done', result };
      }
      return { streamingTools: tools };
    });
  },

  onStreamDone: (messageId) => {
    const { streamingText, currentAgentId } = get();
    const msg: MessageInfo = {
      id: messageId ?? genId(),
      source: currentAgentId ?? 'assistant',
      role: 'assistant',
      content: trimLeadingNewlines(streamingText),
      ts: nowIso(),
    };
    set((s) => ({
      messages: [...s.messages, msg],
      streaming: false,
      streamingText: '',
      streamingThinking: [],
      streamingTools: [],
      loading: false,
    }));
    // Refresh conversation list so title updates
    void get().loadConversations();
  },

  onStreamError: (error) => {
    get().appendAssistantMessage(`[Error: ${error}]`);
    set({
      error,
      streaming: false,
      streamingText: '',
      streamingThinking: [],
      streamingTools: [],
      loading: false,
    });
  },

  clearChat: () => {
    set({
      messages: [],
      streaming: false,
      streamingText: '',
      currentConversationId: null,
    });
  },

  startNewChat: () => {
    set({
      messages: [],
      currentConversationId: null,
      streaming: false,
      streamingText: '',
      streamingThinking: [],
      streamingTools: [],
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
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== convId),
      currentConversationId:
        s.currentConversationId === convId ? null : s.currentConversationId,
      messages: s.currentConversationId === convId ? [] : s.messages,
    }));
  },
}));

export default useChatStore;
