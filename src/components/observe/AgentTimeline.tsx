import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  X,
  Cpu,
  Wrench,
  MessageSquare,
  AlertOctagon,
  RefreshCcw,
  type LucideIcon,
} from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import type { ObserveTimelineEvent } from '@/types/api';
import {
  Badge,
  Button,
  EmptyState,
  Select,
  TextInput,
  type BadgeVariant,
} from '@/components/ui';
import { formatDateTime, formatRelativeTime } from '@/lib/datetime';
import { cx } from '@/lib/cx';
import styles from './AgentTimeline.module.css';

const TYPE_OPTIONS = [
  'llm_invoke',
  'tool_call',
  'loop_detected',
  'agent_action',
  'message',
  'error',
] as const;

type EventType = (typeof TYPE_OPTIONS)[number] | 'other';

const TYPE_VARIANT: Record<EventType, BadgeVariant> = {
  llm_invoke: 'primary',
  tool_call: 'mono',
  loop_detected: 'danger',
  agent_action: 'warning',
  message: 'primary',
  error: 'danger',
  other: 'default',
};

const TYPE_ICON: Record<EventType, LucideIcon> = {
  llm_invoke: Cpu,
  tool_call: Wrench,
  loop_detected: RefreshCcw,
  agent_action: Activity,
  message: MessageSquare,
  error: AlertOctagon,
  other: Activity,
};

const TYPE_COLOR: Record<EventType, string> = {
  llm_invoke: 'var(--chart-1, #5b8def)',
  tool_call: 'var(--chart-3, #10b981)',
  loop_detected: 'var(--chart-4, #f59e0b)',
  agent_action: 'var(--chart-5, #a855f7)',
  message: 'var(--chart-2, #06b6d4)',
  error: 'var(--danger, #ef4444)',
  other: 'var(--text-muted, #6b7280)',
};

function typeOf(t: string): EventType {
  return (TYPE_OPTIONS as readonly string[]).includes(t) ? (t as EventType) : 'other';
}

function variantForType(t: string): BadgeVariant {
  return TYPE_VARIANT[typeOf(t)];
}

function colorForType(t: string): string {
  return TYPE_COLOR[typeOf(t)];
}

function iconForType(t: string): LucideIcon {
  return TYPE_ICON[typeOf(t)];
}

function previewText(payload: Record<string, unknown>): string {
  try {
    const text = JSON.stringify(payload);
    return text.length > 140 ? text.slice(0, 140) + '…' : text;
  } catch {
    return String(payload);
  }
}

function fullText(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

/** 从 payload 中提取一句话摘要（按事件类型定制） */
function summarize(event: ObserveTimelineEvent): string {
  const p = event.payload;
  switch (event.type) {
    case 'llm_invoke': {
      const model = typeof p.model === 'string' ? p.model : '';
      const inT = typeof p.input_tokens === 'number' ? p.input_tokens : 0;
      const outT = typeof p.output_tokens === 'number' ? p.output_tokens : 0;
      const toolCalls = typeof p.tool_calls === 'number' ? p.tool_calls : 0;
      const parts: string[] = [];
      if (model) parts.push(model);
      if (inT || outT) parts.push(`↑${inT} ↓${outT}`);
      if (toolCalls > 0) parts.push(`tools=${toolCalls}`);
      return parts.join(' · ');
    }
    case 'tool_call': {
      const tool = typeof p.tool === 'string' ? p.tool : 'unknown';
      const durationMs = typeof p.duration_ms === 'number' ? p.duration_ms : null;
      const status = typeof p.status === 'string' ? p.status : '';
      const parts: string[] = [tool];
      if (durationMs != null) parts.push(`${durationMs.toFixed(0)}ms`);
      if (status === 'error' || status === 'failed') parts.push('失败');
      return parts.join(' · ');
    }
    case 'loop_detected': {
      const reason = typeof p.reason === 'string' ? p.reason : '';
      return reason ? `循环: ${reason}` : '检测到循环';
    }
    case 'error': {
      const msg = typeof p.message === 'string' ? p.message : '';
      return msg || '发生错误';
    }
    case 'message': {
      const content = typeof p.content === 'string' ? p.content : '';
      if (!content) return '';
      return content.length > 80 ? content.slice(0, 80) + '…' : content;
    }
    default:
      return '';
  }
}

/** 提取可视化指标（用于绘制右侧指标条） */
interface MetricBar {
  /** 0-100 之间的占比 */
  pct: number;
  /** 指标条颜色 */
  color: string;
  /** 指标条标签文本 */
  label: string;
}

function metricBar(event: ObserveTimelineEvent): MetricBar | null {
  const p = event.payload;
  if (event.type === 'llm_invoke') {
    const inT = typeof p.input_tokens === 'number' ? p.input_tokens : 0;
    const outT = typeof p.output_tokens === 'number' ? p.output_tokens : 0;
    const total = inT + outT;
    if (total === 0) return null;
    // token 数映射到 0-100%（每 4000 token 视为满）
    const pct = Math.min((total / 4000) * 100, 100);
    return {
      pct,
      color: colorForType('llm_invoke'),
      label: `${total} tok`,
    };
  }
  if (event.type === 'tool_call') {
    const durationMs = typeof p.duration_ms === 'number' ? p.duration_ms : 0;
    if (durationMs === 0) return null;
    // 2000ms 视为满
    const pct = Math.min((durationMs / 2000) * 100, 100);
    return {
      pct,
      color: colorForType('tool_call'),
      label: `${durationMs.toFixed(0)} ms`,
    };
  }
  return null;
}

function TimelineRow({ event }: { event: ObserveTimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const summary = summarize(event);
  const Icon = iconForType(event.type);
  const color = colorForType(event.type);
  const bar = metricBar(event);
  const failed =
    event.type === 'error' ||
    event.type === 'loop_detected' ||
    (event.type === 'tool_call' &&
      (event.payload.status === 'error' || event.payload.status === 'failed'));

  return (
    <div className={cx(styles.row, failed && styles.rowFailed)}>
      {/* 左侧时间轴：圆点 + 连接线 */}
      <div className={styles.axis} aria-hidden="true">
        <div
          className={styles.dot}
          style={{
            background: color,
            boxShadow: `0 0 0 3px var(--bg-card), 0 0 0 4px ${color}33`,
          }}
        >
          <Icon size={10} color="var(--bg-card)" strokeWidth={2.5} />
        </div>
        <div className={styles.axisLine} style={{ background: `${color}55` }} />
      </div>

      {/* 右侧事件卡片 */}
      <div className={styles.card}>
        <button
          type="button"
          className={styles.cardHeader}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className={styles.headerLeft}>
            <Badge variant={variantForType(event.type)}>{event.type}</Badge>
            <span className={styles.source} title={event.source}>
              {event.source || 'system'}
            </span>
            <span className={styles.tick}>tick {event.tick}</span>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.ts} title={formatDateTime(event.ts, true)}>
              {formatRelativeTime(event.ts)}
            </span>
            {expanded ? (
              <ChevronDown size={12} className={styles.chevron} aria-hidden="true" />
            ) : (
              <ChevronRight size={12} className={styles.chevron} aria-hidden="true" />
            )}
          </div>
        </button>

        {summary && <div className={styles.summary}>{summary}</div>}

        {/* 可视化指标条 */}
        {bar && (
          <div className={styles.metricBar} aria-label={bar.label}>
            <div className={styles.metricTrack}>
              <div
                className={styles.metricFill}
                style={{ width: `${bar.pct}%`, background: bar.color }}
              />
            </div>
            <span className={styles.metricLabel}>{bar.label}</span>
          </div>
        )}

        {expanded && (
          <pre className={styles.payloadFull}>
            <code>{fullText(event.payload)}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

export interface AgentTimelineProps {
  /** 选中 Agent 时显示 Agent 时间线标题，否则显示全局时间线 */
  selectedAgentName?: string | null;
}

export function AgentTimeline({ selectedAgentName }: AgentTimelineProps) {
  const events = useObserveStore((s) => s.timelineEvents);
  const eventType = useObserveStore((s) => s.timelineEventType);
  const setEventType = useObserveStore((s) => s.setTimelineEventType);
  const loadTimeline = useObserveStore((s) => s.loadTimeline);
  const selectedAgentId = useObserveStore((s) => s.selectedAgentId);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 本地搜索过滤（在已加载事件的基础上）
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const hay = `${e.source || ''} ${e.type} ${previewText(e.payload)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [events, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTimeline();
    } finally {
      setRefreshing(false);
    }
  };

  // 切换事件类型时自动重新加载
  useEffect(() => {
    void loadTimeline();
    // 依赖 eventType 和 selectedAgentId：切换时重新查询
  }, [loadTimeline, eventType, selectedAgentId]);

  const scopeLabel = selectedAgentName
    ? `${selectedAgentName} 的事件时间线`
    : '全局事件时间线';

  return (
    <div className={styles.wrap}>
      {/* ===== Toolbar ===== */}
      <div className={styles.toolbar}>
        <div className={styles.scope}>
          <Activity size={16} className={styles.scopeIcon} aria-hidden="true" />
          <span className={styles.scopeLabel}>{scopeLabel}</span>
          <Badge variant="mono">{filtered.length}</Badge>
        </div>

        <div className={styles.filters}>
          <Select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            aria-label="按事件类型过滤"
            className={styles.typeSelect}
          >
            <option value="">全部类型</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <TextInput
            icon={<Search size={14} />}
            placeholder="本地搜索…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="本地搜索事件"
            className={styles.searchInput}
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              aria-label="清除搜索"
            >
              <X size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="刷新时间线"
          >
            <RefreshCw size={14} className={cx(refreshing && styles.spinning)} />
            <span>刷新</span>
          </Button>
        </div>
      </div>

      {/* ===== 图例 ===== */}
      <div className={styles.legend}>
        {(Object.keys(TYPE_COLOR) as EventType[]).map((t) => {
          const Icon = TYPE_ICON[t];
          return (
            <div key={t} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: TYPE_COLOR[t] }}
                aria-hidden="true"
              >
                <Icon size={9} color="var(--bg-card)" strokeWidth={2.5} />
              </span>
              <span className={styles.legendText}>{t}</span>
            </div>
          );
        })}
      </div>

      {/* ===== List ===== */}
      <div className={styles.list} ref={scrollRef}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Activity size={28} />}
            title="暂无事件"
            description={
              events.length === 0
                ? selectedAgentId
                  ? '该 Agent 还没有产生事件，启动对话后事件会出现在这里。'
                  : '启动 Agent 对话后，事件会自动出现在这里。'
                : '没有匹配当前筛选条件的事件。'
            }
          />
        ) : (
          <div className={styles.listInner}>
            {filtered.map((e) => (
              <TimelineRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentTimeline;
