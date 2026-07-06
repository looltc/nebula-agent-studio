import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Cpu,
  Wrench,
  RefreshCcw,
  MessageSquare,
  AlertOctagon,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import type { ObserveTimelineEvent } from '@/types/api';
import { Badge, EmptyState, Avatar, type BadgeVariant } from '@/components/ui';
import { formatDateTime, formatRelativeTime } from '@/lib/datetime';
import { cx } from '@/lib/cx';
import styles from './TimelineChart.module.css';

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  llm_invoke: 'primary',
  tool_call: 'mono',
  loop_detected: 'danger',
  agent_action: 'warning',
  message: 'primary',
  error: 'danger',
};

/**
 * 事件类型主色（实色十六进制，跨色相，确保视觉区分）。
 * 不依赖 CSS chart 变量（chart-1~5 全是蓝色系，无法区分事件类型）。
 */
const TYPE_COLOR: Record<string, string> = {
  llm_invoke: '#7c3aed', // 紫色 - LLM 调用
  tool_call: '#10b981', // 绿色 - 工具调用
  loop_detected: '#f59e0b', // 橙色 - 循环检测
  agent_action: '#ec4899', // 粉色 - Agent 动作
  message: '#06b6d4', // 青色 - 消息
  error: '#ef4444', // 红色 - 错误
  other: '#6b7280', // 灰色 - 其他
};

const TYPE_ICON: Record<string, LucideIcon> = {
  llm_invoke: Cpu,
  tool_call: Wrench,
  loop_detected: RefreshCcw,
  agent_action: Activity,
  message: MessageSquare,
  error: AlertOctagon,
  other: Activity,
};

/** 关键事件类型，圆点持续脉冲以吸引注意 */
const PULSE_TYPES = new Set(['error', 'loop_detected']);

/** 堆叠判定阈值：横向位置差值（百分比）小于此值视为同一组 */
const STACK_THRESHOLD_PCT = 2.5;

function colorFor(t: string): string {
  return TYPE_COLOR[t] ?? TYPE_COLOR.other;
}

/** 提取事件摘要（用于 hover 详情） */
function summary(event: ObserveTimelineEvent): string {
  const p = event.payload;
  switch (event.type) {
    case 'llm_invoke': {
      const inT = typeof p.input_tokens === 'number' ? p.input_tokens : 0;
      const outT = typeof p.output_tokens === 'number' ? p.output_tokens : 0;
      const toolCalls = typeof p.tool_calls === 'number' ? p.tool_calls : 0;
      const parts: string[] = [];
      parts.push(`↑${inT} ↓${outT}`);
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
    case 'loop_detected':
      return typeof p.reason === 'string' ? `循环: ${p.reason}` : '检测到循环';
    case 'error':
      return typeof p.message === 'string' ? p.message : '发生错误';
    case 'message': {
      const c = typeof p.content === 'string' ? p.content : '';
      return c.length > 100 ? c.slice(0, 100) + '…' : c;
    }
    default:
      return '';
  }
}

function payloadText(p: Record<string, unknown>): string {
  try {
    return JSON.stringify(p, null, 2);
  } catch {
    return String(p);
  }
}

interface AgentLane {
  agentId: string;
  agentName: string;
  avatar?: string | null;
}

interface PlacedEvent {
  event: ObserveTimelineEvent;
  /** 0-100 横向位置百分比；-1 表示用 offsetPx 像素偏移（堆叠展开时） */
  xPercent: number;
  /** 像素偏移（仅堆叠展开时使用，相对 stackExpanded 容器中心） */
  offsetPx?: number;
  agentId: string;
}

/** 堆叠分组：同一泳道内位置接近的事件归为一组 */
interface StackGroup {
  /** 组中心 xPercent */
  center: number;
  /** 组内事件（保持原顺序） */
  events: PlacedEvent[];
  /** 组是否被 hover 展开 */
  id: string;
}

function groupStacks(
  placed: PlacedEvent[],
  threshold: number,
): StackGroup[] {
  if (placed.length === 0) return [];
  const sorted = [...placed].sort((a, b) => a.xPercent - b.xPercent);
  const groups: StackGroup[] = [];
  let current: PlacedEvent[] = [sorted[0]!];
  let currentMin = sorted[0]!.xPercent;
  let currentMax = sorted[0]!.xPercent;

  for (let i = 1; i < sorted.length; i++) {
    const ev = sorted[i]!;
    // 若与当前组最右端距离 <= 阈值，归入当前组
    if (ev.xPercent - currentMax <= threshold) {
      current.push(ev);
      currentMax = ev.xPercent;
    } else {
      groups.push({
        center: (currentMin + currentMax) / 2,
        events: current,
        id: current[0]!.event.id,
      });
      current = [ev];
      currentMin = ev.xPercent;
      currentMax = ev.xPercent;
    }
  }
  groups.push({
    center: (currentMin + currentMax) / 2,
    events: current,
    id: current[0]!.event.id,
  });
  return groups;
}

export interface TimelineChartProps {
  /** Agent 头像/名称作为泳道 */
  agents: Array<{ id: string; name: string; avatar?: string | null }>;
  /** 父组件控制的时间范围 [startTs, endTs]（绝对毫秒）；null 表示自动从事件计算 */
  timeRange?: [number, number] | null;
  /** brush 选区完成回调，把选区的绝对时间戳传回父组件以更新 timeRange */
  onBrushApply?: (startTs: number, endTs: number) => void;
}

/** 左侧泳道标签列宽度 */
const LANE_LABEL_WIDTH = 140;

export function TimelineChart({
  agents,
  timeRange,
  onBrushApply,
}: TimelineChartProps) {
  const allEvents = useObserveStore((s) => s.timelineEvents);
  const loadTimeline = useObserveStore((s) => s.loadTimeline);
  const selectedAgentId = useObserveStore((s) => s.selectedAgentId);
  const selectAgent = useObserveStore((s) => s.selectAgent);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  /** hover 展开的堆叠组 id（mouseenter 设置，mouseleave 延迟清除） */
  const [hoveredStackId, setHoveredStackId] = useState<string | null>(null);
  /** 点击固定的堆叠组 id（点击聚合圆点切换，避免 hover 离开就收起） */
  const [pinnedStackId, setPinnedStackId] = useState<string | null>(null);
  /** mouseleave 延迟句柄，给鼠标在子圆点间移动留缓冲 */
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStackEnter = useCallback((id: string) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHoveredStackId(id);
  }, []);

  const handleStackLeave = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setHoveredStackId(null);
      leaveTimerRef.current = null;
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // ===== brush 拖动临时状态 =====
  const [dragBrush, setDragBrush] = useState<[number, number] | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const brushLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline, selectedAgentId]);

  const lanes: AgentLane[] = useMemo(() => {
    if (selectedAgentId) {
      const a = agents.find((x) => x.id === selectedAgentId);
      return [
        {
          agentId: selectedAgentId,
          agentName: a?.name ?? selectedAgentId,
          avatar: a?.avatar,
        },
      ];
    }
    return agents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      avatar: a.avatar,
    }));
  }, [agents, selectedAgentId]);

  // ===== 计算时间范围 + 过滤事件 + 事件位置 =====
  const { placedByAgent, minTs, maxTs, timeTicks, totalCount, visibleCount } =
    useMemo(() => {
      if (allEvents.length === 0) {
        return {
          placedByAgent: new Map<string, PlacedEvent[]>(),
          minTs: 0,
          maxTs: 0,
          timeTicks: [] as number[],
          totalCount: 0,
          visibleCount: 0,
        };
      }
      const tsList = allEvents
        .map((e) => new Date(e.ts).getTime())
        .filter((t) => !Number.isNaN(t));
      if (tsList.length === 0) {
        return {
          placedByAgent: new Map<string, PlacedEvent[]>(),
          minTs: 0,
          maxTs: 0,
          timeTicks: [] as number[],
          totalCount: 0,
          visibleCount: 0,
        };
      }

      const autoMin = Math.min(...tsList);
      const autoMax = Math.max(...tsList);
      const effMin = timeRange ? timeRange[0] : autoMin;
      const effMax = timeRange ? timeRange[1] : autoMax;
      const span = effMax - effMin || 1;

      const byAgent = new Map<string, PlacedEvent[]>();
      let visCount = 0;
      for (const event of allEvents) {
        const t = new Date(event.ts).getTime();
        if (Number.isNaN(t)) continue;
        if (t < effMin || t > effMax) continue;
        const xPercent = ((t - effMin) / span) * 100;
        const list = byAgent.get(event.source) ?? [];
        list.push({ event, xPercent, agentId: event.source });
        byAgent.set(event.source, list);
        visCount++;
      }
      for (const list of byAgent.values()) {
        list.sort((a, b) => a.xPercent - b.xPercent);
      }

      const ticks: number[] = [];
      for (let i = 0; i <= 4; i++) {
        ticks.push(effMin + (span * i) / 4);
      }
      return {
        placedByAgent: byAgent,
        minTs: effMin,
        maxTs: effMax,
        timeTicks: ticks,
        totalCount: allEvents.length,
        visibleCount: visCount,
      };
    }, [allEvents, timeRange]);

  // ===== 按泳道分组堆叠 =====
  const stacksByAgent = useMemo(() => {
    const map = new Map<string, StackGroup[]>();
    for (const [agentId, placed] of placedByAgent.entries()) {
      map.set(agentId, groupStacks(placed, STACK_THRESHOLD_PCT));
    }
    return map;
  }, [placedByAgent]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return allEvents.find((e) => e.id === selectedEventId) ?? null;
  }, [selectedEventId, allEvents]);

  // ===== brush 拖动处理 =====
  const getPercent = useCallback((clientX: number): number => {
    const el = brushLayerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  }, []);

  const handleBrushMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onBrushApply) return;
      const target = e.target as HTMLElement;
      if (target.closest(`.${styles.dot}`)) return;
      const pct = getPercent(e.clientX);
      setDragStart(pct);
      setDragBrush([pct, pct]);
    },
    [getPercent, onBrushApply],
  );

  useEffect(() => {
    if (dragStart === null) return;
    const onMove = (e: MouseEvent) => {
      const pct = getPercent(e.clientX);
      setDragBrush(() => {
        const lo = Math.min(dragStart, pct);
        const hi = Math.max(dragStart, pct);
        return [lo, hi];
      });
    };
    const onUp = () => {
      setDragBrush((cur) => {
        if (cur && onBrushApply) {
          const [a, b] = cur;
          if (Math.abs(b - a) >= 1) {
            const span = maxTs - minTs || 1;
            const startTs = minTs + (span * a) / 100;
            const endTs = minTs + (span * b) / 100;
            onBrushApply(startTs, endTs);
          }
        }
        return null;
      });
      setDragStart(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragStart, getPercent, onBrushApply, minTs, maxTs]);

  const activeBrush = dragBrush;

  // 渲染单个圆点（堆叠展开后用）
  const renderDot = (placed: PlacedEvent) => {
    const event = placed.event;
    const color = colorFor(event.type);
    const Icon = TYPE_ICON[event.type] ?? TYPE_ICON.other;
    const isHovered = hoveredId === event.id;
    const isSelected = selectedEventId === event.id;
    const isPulse = PULSE_TYPES.has(event.type);
    // xPercent === -1 表示堆叠展开态，用像素偏移；否则用百分比
    const leftStyle =
      placed.xPercent === -1
        ? `calc(50% + ${placed.offsetPx ?? 0}px)`
        : `${placed.xPercent}%`;
    return (
      <button
        key={event.id}
        type="button"
        className={cx(
          styles.dot,
          isHovered && styles.dotHovered,
          isSelected && styles.dotSelected,
          isPulse && styles.dotPulse,
        )}
        style={{
          left: leftStyle,
          // 扁平风：纯色填充，无边框，图标用白色
          background: color,
          border: 'none',
          ['--pulse-color' as string]: color,
          zIndex: isSelected ? 4 : isHovered ? 3 : 2,
        }}
        onMouseEnter={() => {
          // 进入子圆点时清除容器的 leave 定时器，防止展开态收起
          if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
          }
          setHoveredId(event.id);
        }}
        onMouseLeave={() => {
          setHoveredId(null);
          // 离开子圆点时启动容器 leave 延迟
          handleStackLeave();
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEventId((cur) => (cur === event.id ? null : event.id));
        }}
        aria-label={`${event.type} @ ${formatDateTime(event.ts)}`}
      >
        <Icon size={12} color="#ffffff" strokeWidth={2.4} />
      </button>
    );
  };

  return (
    <div className={styles.wrap}>
      {/* ===== 时间刻度尺 ===== */}
      <div className={styles.axis} style={{ paddingLeft: LANE_LABEL_WIDTH }}>
        {allEvents.length === 0 ? (
          <div className={styles.axisEmpty}>暂无事件</div>
        ) : visibleCount === 0 ? (
          <div className={styles.axisEmpty}>当前时间范围内无事件</div>
        ) : (
          timeTicks.map((t, i) => (
            <div
              key={i}
              className={styles.tick}
              style={{ left: `${(i / 4) * 100}%` }}
            >
              <div className={styles.tickMark} />
              <div className={styles.tickLabel}>
                {formatRelativeTime(new Date(t).toISOString())}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== 泳道区域 ===== */}
      <div className={styles.lanes}>
        {lanes.length === 0 ? (
          <EmptyState
            icon={<Activity size={28} />}
            title="还没有 Agent"
            description="创建 Agent 并启动对话后，事件会出现在时间线上。"
          />
        ) : visibleCount === 0 ? (
          <EmptyState
            icon={<Activity size={28} />}
            title="当前范围内暂无事件"
            description="调整时间范围或清除 Agent 筛选后重试。"
          />
        ) : (
          <>
            {lanes.map((lane) => {
              const placed = placedByAgent.get(lane.agentId) ?? [];
              if (placed.length === 0 && !selectedAgentId) return null;
              const stacks = stacksByAgent.get(lane.agentId) ?? [];
              return (
                <div
                  key={lane.agentId}
                  className={styles.lane}
                  style={{
                    gridTemplateColumns: `${LANE_LABEL_WIDTH}px minmax(0, 1fr)`,
                  }}
                >
                  <div className={styles.laneLabel} title={lane.agentName}>
                    <Avatar
                      name={lane.agentName}
                      size="sm"
                      src={lane.avatar}
                    />
                    <span className={styles.laneName}>{lane.agentName}</span>
                    <Badge variant="mono">{placed.length}</Badge>
                  </div>
                  <div className={styles.laneTrack}>
                    <div className={styles.laneLine} />
                    {stacks.map((stack) => {
                      // 单事件组：直接渲染圆点
                      if (stack.events.length === 1) {
                        return renderDot(stack.events[0]!);
                      }
                      // 多事件堆叠组：hover 或 pinned 时展开
                      const isExpanded =
                        hoveredStackId === stack.id ||
                        pinnedStackId === stack.id;
                      if (isExpanded) {
                        // 展开：横向扇形展开各事件，每个圆点间距 26px
                        const step = 26;
                        return (
                          <div
                            key={stack.id}
                            className={styles.stackExpanded}
                            style={{ left: `${stack.center}%` }}
                            onMouseEnter={() => handleStackEnter(stack.id)}
                            onMouseLeave={handleStackLeave}
                          >
                            {stack.events.map((placed, i) => {
                              const offsetPx =
                                (i - (stack.events.length - 1) / 2) * step;
                              return renderDot({
                                ...placed,
                                xPercent: -1, // 哨兵值，表示用像素偏移
                                offsetPx,
                              });
                            })}
                          </div>
                        );
                      }
                      // 折叠态：聚合圆点 + 数量徽章
                      const color = colorFor(stack.events[0]!.event.type);
                      const Icon =
                        TYPE_ICON[stack.events[0]!.event.type] ??
                        TYPE_ICON.other;
                      return (
                        <button
                          key={stack.id}
                          type="button"
                          className={cx(styles.dot, styles.dotStack)}
                          style={{
                            left: `${stack.center}%`,
                            background: color,
                            border: 'none',
                            ['--pulse-color' as string]: color,
                          }}
                          onMouseEnter={() => handleStackEnter(stack.id)}
                          onMouseLeave={handleStackLeave}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedStackId((cur) =>
                              cur === stack.id ? null : stack.id,
                            );
                          }}
                          aria-label={`${stack.events.length} 个事件堆叠，点击固定展开`}
                          title={`${stack.events.length} 个事件 — 悬停展开 / 点击固定`}
                        >
                          <Icon size={12} color="#ffffff" strokeWidth={2.4} />
                          <span
                            className={styles.stackBadge}
                            style={{ background: '#ffffff', color }}
                          >
                            {stack.events.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ===== brush 选区层 ===== */}
            {onBrushApply && (
              <div
                ref={brushLayerRef}
                className={styles.brushLayer}
                style={{ left: LANE_LABEL_WIDTH }}
                onMouseDown={handleBrushMouseDown}
                role="presentation"
                aria-label="拖动选择时间窗口"
              >
                {activeBrush && (
                  <div
                    className={styles.brushSelection}
                    style={{
                      left: `${activeBrush[0]}%`,
                      width: `${Math.max(0, activeBrush[1] - activeBrush[0])}%`,
                    }}
                  >
                    <div
                      className={cx(
                        styles.brushHandle,
                        styles.brushHandleLeft,
                      )}
                    />
                    <div
                      className={cx(
                        styles.brushHandle,
                        styles.brushHandleRight,
                      )}
                    />
                    <div className={styles.brushLabel}>
                      {Math.round(activeBrush[1] - activeBrush[0])}%
                    </div>
                  </div>
                )}
                {activeBrush === null && (
                  <div className={styles.brushPlaceholder}>
                    <span>横向拖动以缩放时间轴</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== 图例 ===== */}
      <div className={styles.legend}>
        {Object.entries(TYPE_COLOR).map(([t, color]) => {
          if (t === 'other') return null;
          const Icon = TYPE_ICON[t];
          if (!Icon) return null;
          return (
            <div key={t} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: color }}
                aria-hidden="true"
              >
                <Icon size={11} color="#ffffff" strokeWidth={2.4} />
              </span>
              <span className={styles.legendText}>{t}</span>
            </div>
          );
        })}
      </div>

      {/* ===== Hover 提示 ===== */}
      {hoveredId && (
        <div className={styles.hoverHint}>
          {(() => {
            const e = allEvents.find((x) => x.id === hoveredId);
            if (!e) return null;
            return (
              <>
                <Badge variant={TYPE_VARIANT[e.type] ?? 'default'}>
                  {e.type}
                </Badge>
                <span className={styles.hoverTime}>
                  {formatDateTime(e.ts, true)}
                </span>
                {summary(e) && (
                  <span className={styles.hoverSummary}>{summary(e)}</span>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ===== 选中事件详情卡片 ===== */}
      {selectedEvent && (
        <aside className={styles.detailPanel} aria-label="事件详情">
          <div className={styles.detailHeader}>
            <div className={styles.detailTitleRow}>
              <Badge variant={TYPE_VARIANT[selectedEvent.type] ?? 'default'}>
                {selectedEvent.type}
              </Badge>
              <span className={styles.detailSource}>{selectedEvent.source}</span>
              <span className={styles.detailTick}>
                tick {selectedEvent.tick}
              </span>
            </div>
            <button
              type="button"
              className={styles.detailClose}
              onClick={() => setSelectedEventId(null)}
              aria-label="关闭详情"
            >
              <X size={14} />
            </button>
          </div>
          <div className={styles.detailTime}>
            {formatDateTime(selectedEvent.ts, true)}
          </div>
          {summary(selectedEvent) && (
            <div className={styles.detailSummary}>{summary(selectedEvent)}</div>
          )}
          <pre className={styles.detailPayload}>
            <code>{payloadText(selectedEvent.payload)}</code>
          </pre>
        </aside>
      )}

      {/* ===== 时间范围 + 选区提示 ===== */}
      {allEvents.length > 0 && (
        <div className={styles.rangeHint}>
          <span>
            范围：{formatDateTime(new Date(minTs).toISOString(), true)}
          </span>
          <span>→</span>
          <span>{formatDateTime(new Date(maxTs).toISOString(), true)}</span>
          <span className={styles.rangeDivider}>·</span>
          <span>
            显示 {visibleCount} / 共 {totalCount}
          </span>
          {selectedAgentId && (
            <>
              <span className={styles.rangeDivider}>·</span>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => selectAgent(null)}
              >
                清除 Agent 筛选
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TimelineChart;
