import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  EventInfo,
  GroupChatCreateRequest,
  GroupChatSummary,
  RelationGraphResponse,
  WorldStateResponse,
} from '@/types/api';

export interface OrchestState {
  world: WorldStateResponse | null;
  events: EventInfo[];
  relations: RelationGraphResponse | null;
  groupChats: GroupChatSummary[];
  selectedGroupChatId: string | null;
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

  selectGroupChat: (id) => set({ selectedGroupChatId: id }),

  createGroupChat: async (body) => {
    try {
      await apiClient.createGroupChat(body);
      await get().loadGroupChats();
    } catch (e) {
      console.error('Failed to create group chat:', e);
    }
  },

  setWorldRunning: (running) => set({ worldRunning: running }),
  setWorldSpeed: (speed) => set({ worldSpeed: speed }),

  stepWorld: async () => {
    await get().loadWorld();
  },
}));

export default useOrchestStore;
