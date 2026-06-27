import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { useObserveStore, type TraceNode } from '@/stores/observeStore';
import { Button, Card, EmptyState, TextInput } from '@/components/ui';
import styles from './TraceViewer.module.css';

function spanColor(type: string): string {
  if (/llm/i.test(type)) return 'var(--chart-1)';
  if (/tool/i.test(type)) return 'var(--chart-3)';
  if (/think/i.test(type)) return 'var(--chart-5)';
  if (/message/i.test(type)) return 'var(--chart-2)';
  return 'var(--text-muted)';
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(tokens: { in: number; out: number }): string {
  return `tokens: ${tokens.in.toLocaleString()} in / ${tokens.out.toLocaleString()} out`;
}

interface RowProps {
  node: TraceNode;
  depth: number;
  totalMs: number;
}

function TraceNodeRow({ node, depth, totalMs }: RowProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const barPct = totalMs > 0 ? Math.min((node.durationMs / totalMs) * 100, 100) : 0;

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
          {node.status === 'error' ? (
            <AlertCircle size={14} className={styles.statusError} />
          ) : (
            <CheckCircle2 size={14} className={styles.statusOk} />
          )}
        </span>
        <span className={styles.name}>{node.name}</span>
        <div className={styles.barWrap} aria-hidden="true">
          <div
            className={styles.bar}
            style={{ width: `${barPct}%`, background: spanColor(node.type) }}
          />
        </div>
        <span className={styles.duration}>{formatDuration(node.durationMs)}</span>
      </div>

      {node.tokens && (
        <div
          className={styles.tokens}
          style={{ paddingLeft: `${depth * 24 + 8 + 42}px` }}
        >
          {formatTokens(node.tokens)}
        </div>
      )}

      {hasChildren && expanded && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <TraceNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              totalMs={totalMs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TraceViewer() {
  const traces = useObserveStore((s) => s.traces);
  const selectedTraceTick = useObserveStore((s) => s.selectedTraceTick);
  const buildTracesFromTick = useObserveStore((s) => s.buildTracesFromTick);
  const lastTick = useObserveStore((s) => s.lastTick);

  const [tickInput, setTickInput] = useState<string>(
    selectedTraceTick != null ? String(selectedTraceTick) : '',
  );

  // If a tick is selected but no traces built yet, build them.
  useEffect(() => {
    if (traces.length === 0 && selectedTraceTick != null) {
      buildTracesFromTick(selectedTraceTick);
    }
  }, [traces.length, selectedTraceTick, buildTracesFromTick]);

  const totalMs = useMemo(
    () => traces.reduce((m, n) => Math.max(m, n.durationMs), 0),
    [traces],
  );

  const handleBuild = () => {
    const tick = Number(tickInput);
    if (Number.isFinite(tick) && tick >= 0) {
      buildTracesFromTick(tick);
    }
  };

  const hasTraces = traces.length > 0;

  return (
    <div className={styles.wrap}>
      <Card className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <label className={styles.toolbarLabel} htmlFor="trace-tick">
            Build trace at tick
          </label>
          <TextInput
            id="trace-tick"
            type="number"
            min={0}
            value={tickInput}
            onChange={(e) => setTickInput(e.target.value)}
            placeholder={selectedTraceTick != null ? String(selectedTraceTick) : '0'}
            className={styles.tickInput}
            aria-label="Tick number"
          />
          <Button variant="primary" size="sm" onClick={handleBuild}>
            Build Trace
          </Button>
          {lastTick > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTickInput(String(lastTick));
                buildTracesFromTick(lastTick);
              }}
            >
              Latest ({lastTick})
            </Button>
          )}
          {selectedTraceTick != null && (
            <span className={styles.selectedTick}>
              selected: tick {selectedTraceTick}
            </span>
          )}
        </div>
      </Card>

      <Card className={styles.treeCard}>
        {hasTraces ? (
          <div className={styles.tree}>
            {traces.map((root) => (
              <TraceNodeRow
                key={root.id}
                node={root}
                depth={0}
                totalMs={totalMs}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Activity size={28} />}
            title="Select an event to view its trace"
            description="Click an event in the Events tab, or enter a tick above to build its trace tree."
          />
        )}
      </Card>
    </div>
  );
}

export default TraceViewer;
