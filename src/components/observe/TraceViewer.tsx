import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import { Button, Card, EmptyState } from '@/components/ui';
import type { SpanView, TraceSummary } from '@/types/api';
import styles from './TraceViewer.module.css';

function spanColor(name: string): string {
  if (/astream|decide/i.test(name)) return 'var(--chart-2)';
  if (/llm/i.test(name)) return 'var(--chart-1)';
  if (/tool/i.test(name)) return 'var(--chart-3)';
  if (/think/i.test(name)) return 'var(--chart-5)';
  if (/message/i.test(name)) return 'var(--chart-4)';
  return 'var(--text-muted)';
}

function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(attrs: Record<string, unknown>): string | null {
  const tin = typeof attrs.input_tokens === 'number' ? attrs.input_tokens : null;
  const tout = typeof attrs.output_tokens === 'number' ? attrs.output_tokens : null;
  if (tin === null && tout === null) return null;
  return `tokens: ${(tin ?? 0).toLocaleString()} in / ${(tout ?? 0).toLocaleString()} out`;
}

interface RowProps {
  span: SpanView;
  depth: number;
  totalMs: number;
}

function SpanRow({ span, depth, totalMs }: RowProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = span.children.length > 0;
  const barPct = totalMs > 0 ? Math.min((span.duration_ms / totalMs) * 100, 100) : 0;
  const tokenLine = formatTokens(span.attrs);
  const status: 'ok' | 'error' = span.status === 'error' ? 'error' : 'ok';

  return (
    <div className={styles.node}>
      <div
        className={styles.row}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className={styles.toggleSpacer} aria-hidden="true" />
          )}
        </button>
        <span className={styles.statusIcon} aria-hidden="true">
          {status === 'error' ? (
            <AlertCircle size={14} className={styles.statusError} />
          ) : (
            <CheckCircle2 size={14} className={styles.statusOk} />
          )}
        </span>
        <span className={styles.name}>{span.name}</span>
        <div className={styles.barWrap} aria-hidden="true">
          <div
            className={styles.bar}
            style={{ width: `${barPct}%`, background: spanColor(span.name) }}
          />
        </div>
        <span className={styles.duration}>{formatDuration(span.duration_ms)}</span>
      </div>

      {tokenLine && (
        <div
          className={styles.tokens}
          style={{ paddingLeft: `${depth * 24 + 8 + 42}px` }}
        >
          {tokenLine}
        </div>
      )}

      {hasChildren && expanded && (
        <div className={styles.children}>
          {span.children.map((child) => (
            <SpanRow
              key={child.span_id}
              span={child}
              depth={depth + 1}
              totalMs={totalMs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceListItem({
  trace,
  selected,
  onSelect,
}: {
  trace: TraceSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const status: 'ok' | 'error' = trace.status === 'error' ? 'error' : 'ok';
  const agentId =
    typeof trace.attrs.agent_id === 'string' ? trace.attrs.agent_id : '';
  return (
    <button
      type="button"
      className={`${styles.traceItem} ${selected ? styles.traceItemSelected : ''}`}
      onClick={onSelect}
    >
      <span className={styles.statusIcon} aria-hidden="true">
        {status === 'error' ? (
          <AlertCircle size={12} className={styles.statusError} />
        ) : (
          <CheckCircle2 size={12} className={styles.statusOk} />
        )}
      </span>
      <span className={styles.traceName}>{trace.name}</span>
      {agentId && <span className={styles.traceAgent}>{agentId}</span>}
      <span className={styles.traceDuration}>{formatDuration(trace.duration_ms)}</span>
      <span className={styles.traceSpans}>{trace.span_count} spans</span>
    </button>
  );
}

export function TraceViewer() {
  const traceList = useObserveStore((s) => s.traceList);
  const selectedTraceId = useObserveStore((s) => s.selectedTraceId);
  const currentTrace = useObserveStore((s) => s.currentTrace);
  const loadingTrace = useObserveStore((s) => s.loadingTrace);
  const loadTraces = useObserveStore((s) => s.loadTraces);
  const selectTrace = useObserveStore((s) => s.selectTrace);

  const [refreshing, setRefreshing] = useState(false);

  // 初始加载 trace 列表
  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  const totalMs = useMemo(
    () => (currentTrace ? currentTrace.duration_ms : 0),
    [currentTrace],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTraces();
    setRefreshing(false);
  };

  const hasList = traceList.length > 0;
  const hasDetail = currentTrace !== null;

  return (
    <div className={styles.wrap}>
      <Card className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <span className={styles.toolbarLabel}>Traces</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh traces"
          >
            <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
            Refresh
          </Button>
          <span className={styles.traceCount}>{traceList.length} traces</span>
        </div>
      </Card>

      <div className={styles.body}>
        <Card className={styles.listCard}>
          {hasList ? (
            <div className={styles.traceList}>
              {traceList.map((t) => (
                <TraceListItem
                  key={t.trace_id}
                  trace={t}
                  selected={t.trace_id === selectedTraceId}
                  onSelect={() => selectTrace(t.trace_id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={28} />}
              title="No traces yet"
              description="Run an agent to generate traces. They will appear here after the first astream call."
            />
          )}
        </Card>

        <Card className={styles.treeCard}>
          {loadingTrace ? (
            <EmptyState
              icon={<RefreshCw size={28} className={styles.spinning} />}
              title="Loading trace..."
              description="Fetching span tree from backend."
            />
          ) : hasDetail ? (
            <div className={styles.tree}>
              <SpanRow span={currentTrace} depth={0} totalMs={totalMs} />
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={28} />}
              title="Select a trace to view its span tree"
              description="Click a trace on the left to inspect its nested spans (LLM calls, tool calls, etc.)."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default TraceViewer;
