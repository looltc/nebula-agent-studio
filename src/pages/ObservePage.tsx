import { useEffect, useMemo, useState } from 'react';
import { ContentHeader, PageContainer } from '@/components/layout';
import { StatCard, Tabs, type TabItem } from '@/components/ui';
import {
  EventTimeline,
  MetricsDashboard,
  TraceViewer,
  ReplayControls,
  CostPanel,
} from '@/components/observe';
import { useObserveStore } from '@/stores/observeStore';
import { usePolling } from '@/hooks/usePolling';
import styles from './ObservePage.module.css';

type ObserveTab = 'events' | 'metrics' | 'traces' | 'replay';

const TABS: TabItem[] = [
  { key: 'events', label: 'Events' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'traces', label: 'Traces' },
  { key: 'replay', label: 'Replay' },
];

export default function ObservePage() {
  const [observeTab, setObserveTab] = useState<ObserveTab>('events');

  const events = useObserveStore((s) => s.events);
  const lastTick = useObserveStore((s) => s.lastTick);
  const metricsSamples = useObserveStore((s) => s.metricsSamples);
  const traces = useObserveStore((s) => s.traces);
  const selectedTraceTick = useObserveStore((s) => s.selectedTraceTick);
  const loadEvents = useObserveStore((s) => s.loadEvents);
  const loadMetrics = useObserveStore((s) => s.loadMetrics);
  const buildTracesFromTick = useObserveStore((s) => s.buildTracesFromTick);

  // Initial load + ongoing polling (5s) for events and metrics.
  useEffect(() => {
    void loadEvents();
    void loadMetrics();
  }, [loadEvents, loadMetrics]);

  usePolling(loadEvents, 5000);
  usePolling(loadMetrics, 5000);

  // Build an initial trace tree from the latest tick once events arrive.
  useEffect(() => {
    if (
      traces.length === 0 &&
      selectedTraceTick === null &&
      lastTick > 0 &&
      events.length > 0
    ) {
      buildTracesFromTick(lastTick);
    }
  }, [traces.length, selectedTraceTick, lastTick, events.length, buildTracesFromTick]);

  // ===== Shared stats row =====
  const tokenTotal = useMemo(
    () =>
      metricsSamples
        .filter((s) => /token/i.test(s.name))
        .reduce((sum, s) => sum + s.value, 0),
    [metricsSamples],
  );

  const latencyMax = useMemo(() => {
    const vals = metricsSamples
      .filter((s) => /latency|duration/i.test(s.name))
      .map((s) => s.value);
    return vals.length === 0 ? null : Math.max(...vals);
  }, [metricsSamples]);

  const errorCount = useMemo(
    () => events.filter((e) => e.type === 'error' || /error/i.test(e.type)).length,
    [events],
  );

  const handleDrillToTrace = () => {
    setObserveTab('traces');
  };

  return (
    <PageContainer>
      <ContentHeader
        title="Observe"
        subtitle="Inspect the event stream, metrics, traces, and replay the simulation."
      />

      <div className={styles.statsRow}>
        <StatCard
          label="Tokens"
          value={tokenTotal > 0 ? tokenTotal.toLocaleString() : '—'}
        />
        <StatCard
          label="Latency"
          value={latencyMax != null ? `${(latencyMax / 1000).toFixed(1)}s` : '—'}
        />
        <StatCard
          label="Errors"
          value={errorCount.toLocaleString()}
        />
      </div>

      <Tabs
        tabs={TABS}
        active={observeTab}
        onChange={(k) => setObserveTab(k as ObserveTab)}
        variant="underline"
        className={styles.tabs}
      />

      <div className={styles.tabContent}>
        {observeTab === 'events' && (
          <EventTimeline onDrillToTrace={handleDrillToTrace} />
        )}
        {observeTab === 'metrics' && <MetricsDashboard />}
        {observeTab === 'traces' && <TraceViewer />}
        {observeTab === 'replay' && (
          <div className={styles.replayLayout}>
            <ReplayControls />
            <CostPanel />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
