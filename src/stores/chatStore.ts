import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  AgentSummary,
  ConversationSummary,
  MessageInfo,
} from '@/types/api';

export type ChatMode = 'ws' | 'sse' | 'http';

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

export const useChatStore = create<ChatState>((set, get) => ({
  agents: [],
  currentAgentId: null,
  conversations: [],
  currentConversationId: null,
  messages: [],

  chatMode: 'ws',
  setChatMode: (mode) => set({ chatMode: mode }),

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
      const { currentAgentId } = get();
      if (!currentAgentId && res.agents.length > 0) {
        const id = res.agents[0].id;
        set({ currentAgentId: id });
        await get().loadConversations();
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  selectAgent: (agentId) => {
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
      const res = await apiClient.listConversations();
      const filtered = res.conversations.filter(
        (c) =>
          c.participants.includes(currentAgentId) ||
          c.participants.includes('human'),
      );
      set({ conversations: filtered });
      get().markRead(currentAgentId);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadMessages: async (convId) => {
    try {
      const res = await apiClient.getConversationMessages(convId, 100);
      set({ messages: res.messages, currentConversationId: convId });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  sendMessage: async (text) => {
    const { chatMode, currentAgentId, currentConversationId } = get();
    if (!currentAgentId) {
      set({ error: 'No agent selected' });
      return;
    }
    get().appendLocalUserMessage(text);
    set({ loading: true, streaming: true, error: null });

    if (chatMode === 'http') {
      try {
        const res = await apiClient.chat({
          agent_id: currentAgentId,
          message: text,
          conversation_id: currentConversationId,
        });
        get().appendAssistantMessage(res.reply);
        set({
          currentConversationId: res.conversation_id,
          streaming: false,
          streamingText: '',
          streamingThinking: [],
          streamingTools: [],
          loading: false,
        });
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
    } else {
      // ws / sse: the hook dispatches the actual send and feeds onStream* helpers.
      get().startStreaming();
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
      content: streamingText,
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
}));

export default useChatStore;
