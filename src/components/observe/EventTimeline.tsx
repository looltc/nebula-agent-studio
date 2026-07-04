import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import type { EventInfo } from '@/types/api';
import {
  Badge,
  Select,
  TextInput,
  Toggle,
  EmptyState,
  type BadgeVariant,
} from '@/components/ui';
import styles from './EventTimeline.module.css';

const TYPE_OPTIONS = [
  'tick',
  'agent_action',
  'message',
  'tool_call',
  'llm_invoke',
  'world_change',
  'budget_warn',
  'error',
  'loop_detected',
] as const;

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  tick: 'success',
  agent_action: 'warning',
  message: 'primary',
  tool_call: 'mono',
  llm_invoke: 'primary',
  world_change: 'warning',
  budget_warn: 'warning',
  error: 'danger',
  loop_detected: 'danger',
};

function variantForType(type: string): BadgeVariant {
  return TYPE_VARIANT[type] ?? 'default';
}

function previewText(payload: Record<string, unknown>): string {
  try {
    const text = JSON.stringify(payload);
    return text.length > 120 ? text.slice(0, 120) + '…' : text;
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

interface EventTimelineProps {
  onDrillToTrace?: (tick: number) => void;
}

function EventRow({
  event,
  onDrillToTrace,
}: {
  event: EventInfo;
  onDrillToTrace?: (tick: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleDrill = () => {
    onDrillToTrace?.(event.tick);
  };

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.rowHeader}
        onClick={handleDrill}
        aria-label={`Drill to trace for tick ${event.tick}`}
      >
        <span className={styles.tick}>tick {event.tick}</span>
        <Badge variant={variantForType(event.type)}>{event.type}</Badge>
        <span className={styles.source}>{event.source || '—'}</span>
        <Activity size={14} className={styles.drillIcon} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.payloadToggle}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className={styles.payloadPreview}>{previewText(event.payload)}</span>
      </button>
      {expanded && (
        <pre className={styles.payloadFull}>
          <code>{fullText(event.payload)}</code>
        </pre>
      )}
    </div>
  );
}

export function EventTimeline({ onDrillToTrace }: EventTimelineProps) {
  const events = useObserveStore((s) => s.events);
  const autoScroll = useObserveStore((s) => s.autoScroll);
  const setAutoScroll = useObserveStore((s) => s.setAutoScroll);
  const eventFilter = useObserveStore((s) => s.eventFilter);
  const setEventFilter = useObserveStore((s) => s.setEventFilter);

  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const type = eventFilter.type.trim();
    const src = eventFilter.source.trim().toLowerCase();
    const q = eventFilter.search.trim().toLowerCase();

    return events.filter((e) => {
      if (type && e.type !== type) return false;
      if (src && !(e.source || '').toLowerCase().includes(src)) return false;
      if (q) {
        const hay = `${e.source || ''} ${previewText(e.payload)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, eventFilter.type, eventFilter.source, eventFilter.search]);

  // Newest first.
  const ordered = useMemo(() => [...filtered].reverse(), [filtered]);

  // Virtual scrolling: cap rendered rows at the most recent 500 to keep DOM light.
  // Full virtualization deferred; 500 rows is comfortably performant for this view.
  const rendered = useMemo(
    () => (ordered.length > 500 ? ordered.slice(0, 500) : ordered),
    [ordered],
  );

  const prevCountRef = useRef(events.length);
  useEffect(() => {
    if (autoScroll && events.length > prevCountRef.current && scrollRef.current) {
      // List is reversed so newest sits at the top → scroll to top.
      scrollRef.current.scrollTop = 0;
    }
    prevCountRef.current = events.length;
  }, [events.length, autoScroll]);

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar}>
        <Select
          value={eventFilter.type}
          onChange={(e) => setEventFilter({ type: e.target.value })}
          aria-label="Filter event type"
          className={styles.typeSelect}
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <TextInput
          placeholder="Filter source"
          value={eventFilter.source}
          onChange={(e) => setEventFilter({ source: e.target.value })}
          aria-label="Filter event source"
          className={styles.sourceInput}
        />
        <TextInput
          icon={<Search size={14} />}
          placeholder="Search payload…"
          value={eventFilter.search}
          onChange={(e) => setEventFilter({ search: e.target.value })}
          aria-label="Search event payloads"
          className={styles.searchInput}
        />
        <label className={styles.autoScroll}>
          <Toggle
            checked={autoScroll}
            onChange={setAutoScroll}
            aria-label="Auto-scroll on new events"
          />
          <span className={styles.autoScrollLabel}>Auto-scroll</span>
        </label>
        <span className={styles.count}>
          {filtered.length}
          {ordered.length > 500 ? ' (showing 500)' : ''} events
        </span>
      </div>

      <div className={styles.list} ref={scrollRef}>
        {rendered.length === 0 ? (
          <EmptyState
            icon={<Activity size={28} />}
            title="No events"
            description={
              events.length === 0
                ? 'Events will stream here once agents start running.'
                : 'No events match the current filters.'
            }
          />
        ) : (
          <div className={styles.listInner}>
            {rendered.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onDrillToTrace={onDrillToTrace}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventTimeline;
