import { useMemo, type ReactElement, type ReactNode } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Cpu, Clock, DollarSign, Wrench } from 'lucide-react';
import { useObserveStore, type MetricSample, type MetricsRange } from '@/stores/observeStore';
import { Card, Select, EmptyState } from '@/components/ui';
import styles from './MetricsDashboard.module.css';

const RANGE_OPTIONS: MetricsRange[] = ['1h', '6h', '24h', '7d'];

const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 11 };
const AXIS_LINE = { stroke: 'var(--border-divider)' };
const GRID_LINE = 'var(--border-divider)';
const TOOLTIP_STYLE = {
  background: 'var(--bg-popover)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  color: 'var(--text-foreground)',
  fontSize: 12,
};

function tickOf(s: MetricSample): string {
  return s.labels.tick ?? s.labels.t ?? s.labels.T ?? 'agg';
}

function sortTicks(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

/* ---------- Token Usage ---------- */
interface TokenPoint {
  tick: string;
  input: number;
  output: number;
  total: number;
}

function buildTokenData(samples: MetricSample[]): TokenPoint[] {
  const matched = samples.filter((s) => /token/i.test(s.name));
  if (matched.length === 0) return [];
  const map = new Map<string, TokenPoint>();
  for (const s of matched) {
    const key = tickOf(s);
    let p = map.get(key);
    if (!p) {
      p = { tick: key, input: 0, output: 0, total: 0 };
      map.set(key, p);
    }
    if (/total/i.test(s.name)) p.total += s.value;
    else if (/out(put)?/i.test(s.name)) p.output += s.value;
    else if (/in(put)?/i.test(s.name)) p.input += s.value;
    else p.total += s.value;
  }
  return Array.from(map.values()).sort((a, b) => sortTicks(a.tick, b.tick));
}

/* ---------- Cost USD ---------- */
interface CostPoint {
  tick: string;
  cost: number;
}

function buildCostData(samples: MetricSample[]): CostPoint[] {
  const matched = samples.filter((s) => /cost|spend|usd/i.test(s.name));
  if (matched.length === 0) return [];
  const map = new Map<string, CostPoint>();
  for (const s of matched) {
    const key = tickOf(s);
    let p = map.get(key);
    if (!p) {
      p = { tick: key, cost: 0 };
      map.set(key, p);
    }
    p.cost += s.value;
  }
  return Array.from(map.values()).sort((a, b) => sortTicks(a.tick, b.tick));
}

/* ---------- Latency ---------- */
interface LatencyPoint {
  tick: string;
  llm: number;
  tool: number;
}

function buildLatencyData(samples: MetricSample[]): LatencyPoint[] {
  const matched = samples.filter((s) => /latency|duration/i.test(s.name));
  if (matched.length === 0) return [];
  const map = new Map<string, LatencyPoint>();
  for (const s of matched) {
    const key = tickOf(s);
    let p = map.get(key);
    if (!p) {
      p = { tick: key, llm: 0, tool: 0 };
      map.set(key, p);
    }
    if (/llm/i.test(s.name)) p.llm += s.value;
    else if (/tool/i.test(s.name)) p.tool += s.value;
  }
  return Array.from(map.values()).sort((a, b) => sortTicks(a.tick, b.tick));
}

/* ---------- Tool Calls ---------- */
interface ToolCallPoint {
  tick: string;
  success: number;
  fail: number;
}

function buildToolCallData(samples: MetricSample[]): ToolCallPoint[] {
  const matched = samples.filter((s) => /tool/i.test(s.name));
  if (matched.length === 0) return [];
  const map = new Map<string, ToolCallPoint>();
  for (const s of matched) {
    const key = tickOf(s);
    let p = map.get(key);
    if (!p) {
      p = { tick: key, success: 0, fail: 0 };
      map.set(key, p);
    }
    const isFail =
      /fail|error/i.test(s.name) ||
      /fail|error/i.test(s.labels.status ?? '') ||
      /fail|error/i.test(s.labels.result ?? '');
    if (isFail) p.fail += s.value;
    else p.success += s.value;
  }
  return Array.from(map.values()).sort((a, b) => sortTicks(a.tick, b.tick));
}

interface ChartCardProps {
  title: string;
  icon: ReactNode;
  hasData: boolean;
  emptyTitle: string;
  children: ReactNode;
}

function ChartCard({ title, icon, hasData, emptyTitle, children }: ChartCardProps) {
  return (
    <Card className={styles.chartCard}>
      <div className={styles.chartHead}>
        <span className={styles.chartIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.chartTitle}>{title}</span>
      </div>
      <div className={styles.chartBody}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            {children as ReactElement}
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={<Activity size={24} />} title={emptyTitle} />
        )}
      </div>
    </Card>
  );
}

export function MetricsDashboard() {
  const metricsSamples = useObserveStore((s) => s.metricsSamples);
  const metricsRange = useObserveStore((s) => s.metricsRange);
  const setMetricsRange = useObserveStore((s) => s.setMetricsRange);

  const tokenData = useMemo(() => buildTokenData(metricsSamples), [metricsSamples]);
  const costData = useMemo(() => buildCostData(metricsSamples), [metricsSamples]);
  const latencyData = useMemo(() => buildLatencyData(metricsSamples), [metricsSamples]);
  const toolCallData = useMemo(() => buildToolCallData(metricsSamples), [metricsSamples]);

  return (
    <div className={styles.wrap}>
      <div className={styles.rangeBar}>
        <label className={styles.rangeLabel} htmlFor="metrics-range">
          Time range
        </label>
        <Select
          id="metrics-range"
          value={metricsRange}
          onChange={(e) => setMetricsRange(e.target.value as MetricsRange)}
          aria-label="Metrics time range"
          className={styles.rangeSelect}
        >
          {RANGE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              Last {r}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.grid}>
        <ChartCard
          title="Token Usage"
          icon={<Cpu size={16} />}
          hasData={tokenData.length > 0}
          emptyTitle="No token metrics"
        >
          <LineChart data={tokenData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tick" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
            <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} width={48} />
            <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'var(--accent-ring)' }} />
            <Line type="monotone" dataKey="input" name="Input" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="output" name="Output" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="total" name="Total" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartCard>

        <ChartCard
          title="Cost (USD)"
          icon={<DollarSign size={16} />}
          hasData={costData.length > 0}
          emptyTitle="No cost metrics"
        >
          <LineChart data={costData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tick" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
            <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} width={48} />
            <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'var(--accent-ring)' }} />
            <Line type="monotone" dataKey="cost" name="USD" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartCard>

        <ChartCard
          title="Latency (ms)"
          icon={<Clock size={16} />}
          hasData={latencyData.length > 0}
          emptyTitle="No latency metrics"
        >
          <BarChart data={latencyData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tick" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
            <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} width={48} />
            <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--bg-muted)' }} />
            <Bar dataKey="llm" name="LLM" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="tool" name="Tool" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Tool Calls"
          icon={<Wrench size={16} />}
          hasData={toolCallData.length > 0}
          emptyTitle="No tool-call metrics"
        >
          <BarChart data={toolCallData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tick" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
            <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} width={48} />
            <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--bg-muted)' }} />
            <Bar dataKey="success" name="Success" stackId="t" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="fail" name="Fail" stackId="t" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

export default MetricsDashboard;
