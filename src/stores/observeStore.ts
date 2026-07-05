import { create } from 'zustand';
import { apiClient } from '@/services/api';
import { parsePrometheus } from '@/services/ws';
import type {
  AgentObservation,
  AgentObservationDetail,
  AgentObservationListResponse,
  CostResponse,
  EventInfo,
  GlobalTimelineResponse,
  MetricsDict,
  ObservabilityStatus,
  ObserveTimelineEvent,
  SpanView,
  TraceSummary,
} from '@/types/api';

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

export interface ReplayState {
  playing: boolean;
  currentTick: number;
  fromTick: number;
  toTick: number;
  speed: number;
}

export interface ObserveState {
  // ---------- Events（实时 EventBus，/api/events） ----------
  events: EventInfo[];
  lastTick: number;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  eventFilter: EventFilter;
  setEventFilter: (partial: Partial<EventFilter>) => void;
  loadEvents: () => Promise<void>;
  appendEvent: (event: EventInfo) => void;

  // ---------- Metrics ----------
  // Prometheus text（保留兼容现有 UI）
  metricsText: string;
  metricsSamples: MetricSample[];
  // 结构化 metrics（/api/metrics/json，供图表渲染）
  metricsDict: MetricsDict | null;
  metricsRange: MetricsRange;
  setMetricsRange: (range: MetricsRange) => void;
  loadMetrics: () => Promise<void>;
  loadMetricsJson: () => Promise<void>;

  // ---------- Traces（真实 /api/traces） ----------
  traceList: TraceSummary[];
  selectedTraceId: string | null;
  currentTrace: SpanView | null;
  loadingTrace: boolean;
  loadTraces: () => Promise<void>;
  selectTrace: (traceId: string) => Promise<void>;
  clearSelectedTrace: () => void;

  // ---------- Cost（真实 /api/cost） ----------
  cost: CostResponse | null;
  loadCost: () => Promise<void>;

  // ---------- Observability Status（LangSmith / OTel） ----------
  observabilityStatus: ObservabilityStatus | null;
  loadObservabilityStatus: () => Promise<void>;

  // ---------- Replay（本地 UI 控制） ----------
  replay: ReplayState;
  setReplayRange: (from: number, to: number) => void;
  playReplay: () => void;
  pauseReplay: () => void;
  stepReplay: (direction: 1 | -1) => void;
  setReplaySpeed: (n: number) => void;
  setCurrentTick: (tick: number) => void;

  // ---------- Agent 观测（P1，以 Agent 为核心） ----------
  agentObservations: AgentObservation[];
  agentSummary: AgentObservationListResponse['summary'] | null;
  selectedAgentId: string | null;
  selectedAgentDetail: AgentObservationDetail | null;
  loadingAgentDetail: boolean;
  // 时间线（全局 + 单 Agent 共用一份）
  timelineEvents: ObserveTimelineEvent[];
  timelineEventType: string;
  timelineLimit: number;
  setTimelineEventType: (type: string) => void;
  setTimelineLimit: (limit: number) => void;
  selectAgent: (agentId: string | null) => void;
  loadAgentObservations: () => Promise<void>;
  loadSelectedAgentDetail: (agentId: string) => Promise<void>;
  loadTimeline: () => Promise<void>;
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

export const useObserveStore = create<ObserveState>((set, get) => ({
  // ---------- Events ----------
  events: [],
  lastTick: 0,
  autoScroll: true,
  setAutoScroll: (value) => set({ autoScroll: value }),
  eventFilter: { type: '', source: '', search: '' },
  setEventFilter: (partial) => {
    set((s) => ({ eventFilter: { ...s.eventFilter, ...partial } }));
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
  appendEvent: (event) => {
    set((s) => {
      if (s.events.some((e) => e.id === event.id)) return {};
      const next = [...s.events, event];
      next.sort((a, b) => a.tick - b.tick || a.ts.localeCompare(b.ts));
      return { events: next, lastTick: Math.max(s.lastTick, event.tick) };
    });
  },

  // ---------- Metrics ----------
  metricsText: '',
  metricsSamples: [],
  metricsDict: null,
  metricsRange: '1h',
  setMetricsRange: (range) => set({ metricsRange: range }),
  loadMetrics: async () => {
    try {
      const text = await apiClient.metrics();
      const samples = parsePrometheus(text);
      set({ metricsText: text, metricsSamples: samples });
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  },
  loadMetricsJson: async () => {
    try {
      const dict = await apiClient.metricsJson();
      set({ metricsDict: dict });
    } catch (e) {
      console.error('Failed to load metrics json:', e);
    }
  },

  // ---------- Traces ----------
  traceList: [],
  selectedTraceId: null,
  currentTrace: null,
  loadingTrace: false,
  loadTraces: async () => {
    try {
      const res = await apiClient.listTraces(50);
      set({ traceList: res.traces });
    } catch (e) {
      console.error('Failed to load traces:', e);
    }
  },
  selectTrace: async (traceId: string) => {
    set({ selectedTraceId: traceId, loadingTrace: true, currentTrace: null });
    try {
      const span = await apiClient.getTrace(traceId);
      set({ currentTrace: span, loadingTrace: false });
    } catch (e) {
      console.error('Failed to load trace detail:', e);
      set({ loadingTrace: false });
    }
  },
  clearSelectedTrace: () =>
    set({ selectedTraceId: null, currentTrace: null, loadingTrace: false }),

  // ---------- Cost ----------
  cost: null,
  loadCost: async () => {
    try {
      const cost = await apiClient.getCost();
      set({ cost });
    } catch (e) {
      console.error('Failed to load cost:', e);
    }
  },

  // ---------- Observability Status ----------
  observabilityStatus: null,
  loadObservabilityStatus: async () => {
    try {
      const status = await apiClient.observabilityStatus();
      set({ observabilityStatus: status });
    } catch (e) {
      console.error('Failed to load observability status:', e);
    }
  },

  // ---------- Replay ----------
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

  // ---------- Agent 观测（P1，以 Agent 为核心） ----------
  agentObservations: [],
  agentSummary: null,
  selectedAgentId: null,
  selectedAgentDetail: null,
  loadingAgentDetail: false,
  timelineEvents: [],
  timelineEventType: '',
  timelineLimit: 100,
  setTimelineEventType: (type) => set({ timelineEventType: type }),
  setTimelineLimit: (limit) => set({ timelineLimit: limit }),
  selectAgent: (agentId) => {
    set((s) => ({
      selectedAgentId: agentId,
      // 切换 Agent 时清空旧详情，避免短暂展示前一个 Agent 的数据
      selectedAgentDetail: agentId === null ? null : s.selectedAgentDetail,
    }));
  },
  loadAgentObservations: async () => {
    try {
      const res = await apiClient.listAgentObservations();
      set({ agentObservations: res.agents, agentSummary: res.summary });
    } catch (e) {
      console.error('Failed to load agent observations:', e);
    }
  },
  loadSelectedAgentDetail: async (agentId: string) => {
    set({ loadingAgentDetail: true });
    try {
      const detail = await apiClient.getAgentObservation(agentId);
      set({ selectedAgentDetail: detail, loadingAgentDetail: false });
    } catch (e) {
      console.error('Failed to load agent detail:', e);
      set({ loadingAgentDetail: false });
    }
  },
  loadTimeline: async () => {
    const { selectedAgentId, timelineEventType, timelineLimit } = get();
    try {
      // 选中 Agent 时查询该 Agent 的事件，否则查询全局事件流
      if (selectedAgentId) {
        const res = await apiClient.getAgentTimeline(selectedAgentId, {
          eventType: timelineEventType || undefined,
          limit: timelineLimit,
        });
        set({ timelineEvents: res.events });
      } else {
        const res: GlobalTimelineResponse = await apiClient.getGlobalTimeline({
          eventType: timelineEventType || undefined,
          limit: timelineLimit,
        });
        set({ timelineEvents: res.events });
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
    }
  },
}));

export default useObserveStore;
