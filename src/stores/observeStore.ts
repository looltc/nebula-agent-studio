import { create } from 'zustand';
import { apiClient } from '@/services/api';
import { parsePrometheus } from '@/services/ws';
import type { EventInfo } from '@/types/api';

export interface MetricSample {
  name: string;
  value: number;
  labels: Record<string, string>;
}

export type MetricsRange = '1h' | '6h' | '24h' | '7d';

export interface EventFilter {
  type: string;
  source: string;
  search: string;
}

export interface TraceNode {
  id: string;
  name: string;
  type: string;
  durationMs: number;
  status: 'ok' | 'error';
  tokens?: { in: number; out: number };
  children: TraceNode[];
}

export interface ReplayState {
  playing: boolean;
  currentTick: number;
  fromTick: number;
  toTick: number;
  speed: number;
}

export interface CostState {
  dailyCap: number;
  used: number;
  perAgent: Array<{ agentId: string; used: number; cap: number }>;
}

export interface ObserveState {
  events: EventInfo[];
  lastTick: number;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  eventFilter: EventFilter;
  setEventFilter: (partial: Partial<EventFilter>) => void;

  metricsText: string;
  metricsSamples: MetricSample[];
  metricsRange: MetricsRange;
  setMetricsRange: (range: MetricsRange) => void;

  traces: TraceNode[];
  buildTracesFromTick: (tick: number) => void;
  selectedTraceTick: number | null;
  selectTraceTick: (tick: number) => void;

  replay: ReplayState;
  setReplayRange: (from: number, to: number) => void;
  playReplay: () => void;
  pauseReplay: () => void;
  stepReplay: (direction: 1 | -1) => void;
  setReplaySpeed: (n: number) => void;
  setCurrentTick: (tick: number) => void;

  cost: CostState;
  refreshCost: () => void;

  loadEvents: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  appendEvent: (event: EventInfo) => void;
}

const MAX_EVENTS = 2000;

function mergeAndSort(existing: EventInfo[], incoming: EventInfo[]): EventInfo[] {
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

function buildTickTree(tick: number, events: EventInfo[]): TraceNode[] {
  const tickEvents = events.filter((e) => e.tick === tick);
  const children: TraceNode[] = tickEvents.map((e) => {
    const payload = e.payload ?? {};
    const status: 'ok' | 'error' =
      typeof payload.error === 'string' || /error/i.test(e.type) ? 'error' : 'ok';
    const durationMs =
      typeof payload.duration_ms === 'number'
        ? payload.duration_ms
        : typeof payload.durationMs === 'number'
          ? payload.durationMs
          : 0;
    const tokensIn = typeof payload.tokens_in === 'number' ? payload.tokens_in : null;
    const tokensOut = typeof payload.tokens_out === 'number' ? payload.tokens_out : null;
    const tokens =
      tokensIn !== null || tokensOut !== null
        ? { in: tokensIn ?? 0, out: tokensOut ?? 0 }
        : undefined;
    return {
      id: e.id,
      name: e.source || e.type,
      type: e.type,
      durationMs,
      status,
      tokens,
      children: [],
    };
  });
  return children;
}

export const useObserveStore = create<ObserveState>((set, get) => ({
  events: [],
  lastTick: 0,
  autoScroll: true,
  setAutoScroll: (value) => set({ autoScroll: value }),
  eventFilter: { type: '', source: '', search: '' },
  setEventFilter: (partial) => {
    set((s) => ({ eventFilter: { ...s.eventFilter, ...partial } }));
  },

  metricsText: '',
  metricsSamples: [],
  metricsRange: '1h',
  setMetricsRange: (range) => set({ metricsRange: range }),

  traces: [],
  buildTracesFromTick: (tick) => {
    const { events } = get();
    const children = buildTickTree(tick, events);
    const root: TraceNode = {
      id: `tick-${tick}`,
      name: `Tick ${tick}`,
      type: 'tick',
      durationMs: children.reduce((m, c) => m + c.durationMs, 0),
      status: children.some((c) => c.status === 'error') ? 'error' : 'ok',
      children,
    };
    set({ traces: [root], selectedTraceTick: tick });
  },
  selectedTraceTick: null,
  selectTraceTick: (tick) => set({ selectedTraceTick: tick }),

  replay: { playing: false, currentTick: 0, fromTick: 0, toTick: 0, speed: 1 },
  setReplayRange: (from, to) => {
    set((s) => ({ replay: { ...s.replay, fromTick: from, toTick: to, currentTick: from } }));
  },
  playReplay: () => set((s) => ({ replay: { ...s.replay, playing: true } })),
  pauseReplay: () => set((s) => ({ replay: { ...s.replay, playing: false } })),
  stepReplay: (direction) => {
    set((s) => {
      const { fromTick, toTick, currentTick } = s.replay;
      const next = Math.min(Math.max(currentTick + direction, fromTick), toTick);
      return { replay: { ...s.replay, currentTick: next } };
    });
  },
  setReplaySpeed: (n) => set((s) => ({ replay: { ...s.replay, speed: n } })),
  setCurrentTick: (tick) => set((s) => ({ replay: { ...s.replay, currentTick: tick } })),

  cost: { dailyCap: 50, used: 0, perAgent: [] },
  refreshCost: () => {
    const { metricsSamples, cost } = get();
    const costSamples = metricsSamples.filter((s) => /cost|spend|usd/i.test(s.name));
    if (costSamples.length === 0) {
      // leave defaults
      return;
    }
    const perAgentMap = new Map<string, number>();
    let total = 0;
    for (const s of costSamples) {
      const agentId = s.labels.agent ?? s.labels.agent_id ?? 'default';
      perAgentMap.set(agentId, (perAgentMap.get(agentId) ?? 0) + s.value);
      total += s.value;
    }
    const perAgent = Array.from(perAgentMap.entries()).map(([agentId, used]) => ({
      agentId,
      used,
      cap: cost.dailyCap,
    }));
    set({ cost: { ...cost, used: total, perAgent } });
  },

  loadEvents: async () => {
    try {
      const res = await apiClient.listEvents(get().lastTick, 100);
      set((s) => {
        let merged = mergeAndSort(s.events, res.events);
        if (merged.length > MAX_EVENTS) {
          merged = merged.slice(merged.length - MAX_EVENTS);
        }
        return { events: merged, lastTick: maxTickOf(merged, s.lastTick) };
      });
    } catch (e) {
      console.error('Failed to load events:', e);
    }
  },

  loadMetrics: async () => {
    try {
      const text = await apiClient.metrics();
      const samples = parsePrometheus(text);
      set({ metricsText: text, metricsSamples: samples });
      get().refreshCost();
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  },

  appendEvent: (event) => {
    set((s) => {
      if (s.events.some((e) => e.id === event.id)) return {};
      const next = [...s.events, event];
      next.sort((a, b) => a.tick - b.tick || a.ts.localeCompare(b.ts));
      return { events: next, lastTick: Math.max(s.lastTick, event.tick) };
    });
  },
}));

export default useObserveStore;
