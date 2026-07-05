import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  X,
  Activity,
  BarChart3,
  GitBranch,
  Clock,
  Cpu,
  Coins,
  Zap,
  Wrench,
  ChevronDown,
} from 'lucide-react';
import { ContentHeader, PageContainer } from '@/components/layout';
import {
  StatCard,
  Tabs,
  Button,
  Avatar,
  type TabItem,
} from '@/components/ui';
import {
  EventTimeline,
  MetricsDashboard,
  TraceViewer,
  ReplayControls,
  CostPanel,
  TimelineChart,
} from '@/components/observe';
import { useObserveStore } from '@/stores/observeStore';
import { usePolling } from '@/hooks/usePolling';
import { formatRelativeTime } from '@/lib/datetime';
import { resolveAvatarSrc } from '@/lib/avatar';
import { cx } from '@/lib/cx';
import styles from './ObservePage.module.css';

type ObserveTab = 'agents' | 'events' | 'metrics' | 'traces' | 'replay';

const TABS: TabItem[] = [
  { key: 'agents', label: 'Agents' },
  { key: 'events', label: 'Events' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'traces', label: 'Traces' },
  { key: 'replay', label: 'Replay' },
];

/** 时间范围快捷预设 */
const TIME_PRESETS: Array<{ key: string; label: string; ms: number }> = [
  { key: '15m', label: '近15分钟', ms: 15 * 60 * 1000 },
  { key: '30m', label: '近30分钟', ms: 30 * 60 * 1000 },
  { key: '1h', label: '近1小时', ms: 60 * 60 * 1000 },
  { key: '6h', label: '近6小时', ms: 6 * 60 * 60 * 1000 },
  { key: '24h', label: '近24小时', ms: 24 * 60 * 60 * 1000 },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(usd: number): string {
  if (usd <= 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export default function ObservePage() {
  const [observeTab, setObserveTab] = useState<ObserveTab>('agents');
  // Agent 选择宫格展开状态（点击展开，非 hover 浮层）
  const [pickerOpen, setPickerOpen] = useState(false);
  // 时间范围（绝对时间戳 ms）；null 表示显示全部
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  // 自定义时间选择器展开状态 + 临时输入值（格式 yyyy-MM-ddTHH:mm）
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const agentObservations = useObserveStore((s) => s.agentObservations);
  const selectedAgentId = useObserveStore((s) => s.selectedAgentId);
  const selectedAgentDetail = useObserveStore((s) => s.selectedAgentDetail);
  const loadingAgentDetail = useObserveStore((s) => s.loadingAgentDetail);
  const selectAgent = useObserveStore((s) => s.selectAgent);
  const loadAgentObservations = useObserveStore((s) => s.loadAgentObservations);
  const loadSelectedAgentDetail = useObserveStore(
    (s) => s.loadSelectedAgentDetail,
  );
  const loadTimeline = useObserveStore((s) => s.loadTimeline);

  const loadEvents = useObserveStore((s) => s.loadEvents);
  const loadMetrics = useObserveStore((s) => s.loadMetrics);
  const loadCost = useObserveStore((s) => s.loadCost);

  // ===== Agents tab: 初次加载 + 轮询 =====
  useEffect(() => {
    if (observeTab === 'agents') {
      void loadAgentObservations();
      void loadTimeline();
    }
  }, [observeTab, loadAgentObservations, loadTimeline]);

  usePolling(loadAgentObservations, 5000);
  usePolling(loadTimeline, 5000);

  // 选中 Agent 时加载详情
  useEffect(() => {
    if (selectedAgentId) {
      void loadSelectedAgentDetail(selectedAgentId);
    }
  }, [selectedAgentId, loadSelectedAgentDetail]);

  // 其他 tab 切换时按需加载
  useEffect(() => {
    if (observeTab === 'events') void loadEvents();
    if (observeTab === 'metrics') void loadMetrics();
    if (observeTab === 'replay') void loadCost();
  }, [observeTab, loadEvents, loadMetrics, loadCost]);

  usePolling(loadEvents, 5000);
  usePolling(loadMetrics, 5000);

  // ===== 顶部统计：选中显示当前 Agent，未选中从 agentObservations 求和（与列表一致） =====
  const stats = useMemo(() => {
    if (selectedAgentId && selectedAgentDetail) {
      return {
        title: selectedAgentDetail.name,
        agentCount: 1,
        totalTokens: selectedAgentDetail.total_tokens,
        inputTokens: selectedAgentDetail.input_tokens,
        outputTokens: selectedAgentDetail.output_tokens,
        totalCost: selectedAgentDetail.cost_usd,
        dailyCost: selectedAgentDetail.daily_cost_usd,
        llmCalls: selectedAgentDetail.llm_calls,
        toolCalls: selectedAgentDetail.tool_calls,
        lastActive: selectedAgentDetail.updated_at,
      };
    }
    // 未选中：直接从 agentObservations 求和，避免与列表数据不一致
    const sum = agentObservations.reduce(
      (acc, a) => {
        acc.totalTokens += a.total_tokens;
        acc.inputTokens += a.input_tokens;
        acc.outputTokens += a.output_tokens;
        acc.totalCost += a.cost_usd;
        acc.dailyCost += a.daily_cost_usd;
        acc.llmCalls += a.llm_calls;
        acc.toolCalls += a.tool_calls;
        return acc;
      },
      {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        dailyCost: 0,
        llmCalls: 0,
        toolCalls: 0,
      },
    );
    return {
      title: '全局汇总',
      agentCount: agentObservations.length,
      ...sum,
      lastActive: null as string | null,
    };
  }, [selectedAgentId, selectedAgentDetail, agentObservations]);

  // 选中 Agent 的观测数据（用于卡片显示头像）
  const selectedAgentObs = useMemo(
    () => agentObservations.find((a) => a.id === selectedAgentId) ?? null,
    [agentObservations, selectedAgentId],
  );

  // ===== 时间范围快捷预设 =====
  const applyPreset = (ms: number, key: string) => {
    const end = Date.now();
    const start = end - ms;
    setTimeRange([start, end]);
    setActivePreset(key);
  };

  const clearTimeRange = () => {
    setTimeRange(null);
    setActivePreset(null);
  };

  // 把 Date 转成 datetime-local 输入框所需的本地时间字符串（yyyy-MM-ddTHH:mm）
  const toLocalInput = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 打开自定义选择器时，用当前 timeRange 或默认（近1小时）初始化输入框
  const openCustom = () => {
    const now = new Date();
    const start = timeRange ? new Date(timeRange[0]) : new Date(now.getTime() - 60 * 60 * 1000);
    const end = timeRange ? new Date(timeRange[1]) : now;
    setCustomStart(toLocalInput(start));
    setCustomEnd(toLocalInput(end));
    setCustomOpen(true);
  };

  // 应用自定义时间范围
  const applyCustom = () => {
    const startMs = new Date(customStart).getTime();
    const endMs = new Date(customEnd).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return;
    if (startMs >= endMs) return;
    setTimeRange([startMs, endMs]);
    setActivePreset(null);
    setCustomOpen(false);
  };

  // brush 选区回调：把百分比映射回绝对时间戳，真正改变时间轴范围
  const handleBrushApply = (startTs: number, endTs: number) => {
    setTimeRange([startTs, endTs]);
    setActivePreset(null);
  };

  // 选择 Agent 时关闭宫格
  const handleSelectAgent = (id: string | null) => {
    selectAgent(id);
    setPickerOpen(false);
  };

  return (
    <PageContainer flushTop>
      <ContentHeader
        title="观测"
        subtitle={
          selectedAgentId
            ? `当前选中：${stats.title} — 顶部统计已切换为该 Agent 数据`
            : '以 Agent 为核心的实时观测体系：顶部 Agent 筛选 + 下方横向时间线图表'
        }
      />

      <Tabs
        tabs={TABS}
        active={observeTab}
        onChange={(k) => setObserveTab(k as ObserveTab)}
        variant="underline"
        className={styles.tabs}
      />

      <div className={styles.tabContent}>
        {observeTab === 'agents' && (
          <div className={styles.agentsLayout}>
            {/* ===== 顶部统计卡片 ===== */}
            <div className={styles.statsRow}>
              {/* Agent 总数卡片：点击展开内联宫格（非浮层）；选中后可再次点击切换 */}
              <div className={styles.agentStatWrap}>
                <button
                  type="button"
                  className={styles.agentStatBtn}
                  onClick={() => setPickerOpen((v) => !v)}
                  aria-expanded={pickerOpen}
                  aria-label={selectedAgentId ? '切换 Agent' : '选择 Agent'}
                >
                  {selectedAgentId && selectedAgentObs ? (
                    <div className={styles.agentStatSelectedInner}>
                      <Avatar
                        name={selectedAgentObs.name}
                        size="sm"
                        src={resolveAvatarSrc(selectedAgentObs.avatar)}
                        online={selectedAgentObs.enabled}
                      />
                      <div className={styles.agentStatMeta}>
                        <span className={styles.agentStatLabel}>当前 Agent</span>
                        <span className={styles.agentStatValue}>
                          {selectedAgentObs.name}
                        </span>
                        {selectedAgentObs.llm_model && (
                          <span className={styles.agentStatHint}>
                            {selectedAgentObs.llm_model}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.agentStatSelectedInner}>
                      <span className={styles.agentStatIconWrap} aria-hidden="true">
                        <Users size={14} />
                      </span>
                      <div className={styles.agentStatMeta}>
                        <span className={styles.agentStatLabel}>Agent 总数</span>
                        <span className={styles.agentStatValue}>
                          {formatNumber(stats.agentCount)}
                        </span>
                      </div>
                    </div>
                  )}
                  <ChevronDown
                    size={14}
                    className={cx(
                      styles.agentStatChevron,
                      pickerOpen && styles.agentStatChevronOpen,
                    )}
                  />
                </button>

                {/* 清除筛选按钮（仅选中态显示） */}
                {selectedAgentId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.agentStatClear}
                    onClick={() => handleSelectAgent(null)}
                    aria-label="清除 Agent 筛选"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              <StatCard
                label="累计 Tokens"
                value={
                  stats.totalTokens > 0 ? formatNumber(stats.totalTokens) : '—'
                }
                icon={<Cpu size={14} />}
                hint={
                  stats.totalTokens > 0
                    ? `↑${formatNumber(stats.inputTokens)} ↓${formatNumber(stats.outputTokens)}`
                    : undefined
                }
              />
              <StatCard
                label="累计花费"
                value={stats.totalCost > 0 ? formatCost(stats.totalCost) : '—'}
                icon={<Coins size={14} />}
                hint={
                  selectedAgentId && stats.dailyCost > 0
                    ? `今日 ${formatCost(stats.dailyCost)}`
                    : undefined
                }
              />
              <StatCard
                label="LLM 调用"
                value={stats.llmCalls > 0 ? formatNumber(stats.llmCalls) : '—'}
                icon={<Zap size={14} />}
              />
              <StatCard
                label="工具调用"
                value={stats.toolCalls > 0 ? formatNumber(stats.toolCalls) : '—'}
                icon={<Wrench size={14} />}
              />
            </div>

            {/* ===== Agent 选择宫格（点击展开，push 布局独立行） ===== */}
            {pickerOpen && (
              <div
                className={styles.pickerRow}
                role="listbox"
                aria-label="选择 Agent"
              >
                <button
                  type="button"
                  className={cx(
                    styles.pickerItem,
                    styles.pickerAll,
                    selectedAgentId === null && styles.pickerItemActive,
                  )}
                  onClick={() => handleSelectAgent(null)}
                >
                  <span className={styles.pickerAllIcon} aria-hidden="true">
                    <Users size={14} />
                  </span>
                  <span className={styles.pickerName}>全部</span>
                  <span className={styles.pickerCount}>
                    {agentObservations.length}
                  </span>
                </button>
                {agentObservations.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    className={cx(
                      styles.pickerItem,
                      agent.id === selectedAgentId && styles.pickerItemActive,
                    )}
                    onClick={() => handleSelectAgent(agent.id)}
                    title={agent.name}
                  >
                    <Avatar
                      name={agent.name}
                      size="sm"
                      src={resolveAvatarSrc(agent.avatar)}
                      online={agent.enabled}
                    />
                    <span className={styles.pickerName}>{agent.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ===== 时间范围快捷按钮 ===== */}
            <div className={styles.timeRangeBar}>
              <span className={styles.timeRangeLabel}>时间范围：</span>
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={cx(
                    styles.presetBtn,
                    activePreset === p.key && styles.presetBtnActive,
                  )}
                  onClick={() => applyPreset(p.ms, p.key)}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className={cx(
                  styles.presetBtn,
                  timeRange === null && activePreset === null && !customOpen && styles.presetBtnActive,
                )}
                onClick={clearTimeRange}
              >
                全部
              </button>
              {customOpen ? (
                <span className={styles.customRange}>
                  <input
                    type="datetime-local"
                    className={styles.customInput}
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    aria-label="开始时间"
                    autoFocus
                  />
                  <span className={styles.customArrow}>→</span>
                  <input
                    type="datetime-local"
                    className={styles.customInput}
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    aria-label="结束时间"
                  />
                  <button
                    type="button"
                    className={styles.customApplyBtn}
                    onClick={applyCustom}
                    disabled={
                      !customStart ||
                      !customEnd ||
                      new Date(customStart).getTime() >= new Date(customEnd).getTime()
                    }
                  >
                    应用
                  </button>
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setCustomOpen(false)}
                  >
                    取消
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.timeRangeToggle}
                  onClick={openCustom}
                  title="点击选择自定义时间"
                >
                  {timeRange ? (
                    <>
                      {new Date(timeRange[0]).toLocaleString('zh-CN', {
                        hour12: false,
                      })}
                      {' → '}
                      {new Date(timeRange[1]).toLocaleString('zh-CN', {
                        hour12: false,
                      })}
                    </>
                  ) : (
                    <span className={styles.timeRangePlaceholder}>
                      选择时间…
                    </span>
                  )}
                </button>
              )}
              {timeRange && !customOpen && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={clearTimeRange}
                >
                  清除
                </button>
              )}
            </div>

            {/* ===== 主区域：横向时间线图表 ===== */}
            <div className={styles.chartArea}>
              <TimelineChart
                agents={agentObservations.map((a) => ({
                  id: a.id,
                  name: a.name,
                  avatar: resolveAvatarSrc(a.avatar),
                }))}
                timeRange={timeRange}
                onBrushApply={handleBrushApply}
              />
            </div>

            {/* ===== 选中 Agent 详情侧栏 ===== */}
            {selectedAgentId && selectedAgentDetail && !loadingAgentDetail && (
              <aside className={styles.detailPanel} aria-label="Agent 详情">
                <div className={styles.detailHeader}>
                  <div className={styles.detailIdentity}>
                    <Avatar
                      name={selectedAgentDetail.name}
                      size="sm"
                      src={resolveAvatarSrc(selectedAgentDetail.avatar)}
                      online
                    />
                    <div className={styles.detailMeta}>
                      <div className={styles.detailName}>
                        {selectedAgentDetail.name}
                      </div>
                      <div className={styles.detailSub}>
                        {selectedAgentDetail.llm_provider} ·{' '}
                        {selectedAgentDetail.llm_model || '—'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectAgent(null)}
                    aria-label="关闭详情"
                  >
                    <X size={14} />
                  </Button>
                </div>

                {selectedAgentObs?.last_active && (
                  <div className={styles.detailActive}>
                    <span className={styles.detailActiveDot} aria-hidden="true" />
                    <span>
                      最后活跃 {formatRelativeTime(selectedAgentObs.last_active)}
                    </span>
                  </div>
                )}

                <dl className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <dt>Thinking</dt>
                    <dd>{selectedAgentDetail.thinking_model}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>最大迭代</dt>
                    <dd>{selectedAgentDetail.max_iterations}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>预算上限</dt>
                    <dd>
                      {selectedAgentDetail.budget_limit_usd != null
                        ? formatCost(selectedAgentDetail.budget_limit_usd)
                        : '∞'}
                    </dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>今日花费</dt>
                    <dd>{formatCost(selectedAgentDetail.daily_cost_usd)}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>累计花费</dt>
                    <dd>{formatCost(selectedAgentDetail.cost_usd)}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Token 用量</dt>
                    <dd>
                      ↑{formatNumber(selectedAgentDetail.input_tokens)} ↓
                      {formatNumber(selectedAgentDetail.output_tokens)}
                    </dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>LLM 调用</dt>
                    <dd>{formatNumber(selectedAgentDetail.llm_calls)}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>工具调用</dt>
                    <dd>{formatNumber(selectedAgentDetail.tool_calls)}</dd>
                  </div>
                  {selectedAgentDetail.tools.length > 0 && (
                    <div className={styles.detailRow}>
                      <dt>工具</dt>
                      <dd className={styles.detailTools}>
                        {selectedAgentDetail.tools.join(', ')}
                      </dd>
                    </div>
                  )}
                  {selectedAgentDetail.skills.length > 0 && (
                    <div className={styles.detailRow}>
                      <dt>技能</dt>
                      <dd className={styles.detailTools}>
                        {selectedAgentDetail.skills.join(', ')}
                      </dd>
                    </div>
                  )}
                </dl>
              </aside>
            )}
          </div>
        )}

        {observeTab === 'events' && (
          <div className={styles.auxTab}>
            <div className={styles.auxHint}>
              <Activity size={14} aria-hidden="true" />
              <span>
                Events 展示实时 EventBus 事件流（来自内存，进程重启后清空）。启动 Agent
                对话后事件会自动出现在这里。如需查询持久化历史事件，请用 Agents tab
                的时间线。
              </span>
            </div>
            <EventTimeline onDrillToTrace={() => setObserveTab('traces')} />
          </div>
        )}
        {observeTab === 'metrics' && (
          <div className={styles.auxTab}>
            <div className={styles.auxHint}>
              <BarChart3 size={14} aria-hidden="true" />
              <span>
                Metrics 展示 Prometheus 指标（tokens / cost / latency / tool
                calls），数据来自后端 MetricsRegistry。启动 Agent 对话后指标会自动生成。
              </span>
            </div>
            <MetricsDashboard />
          </div>
        )}
        {observeTab === 'traces' && (
          <div className={styles.auxTab}>
            <div className={styles.auxHint}>
              <GitBranch size={14} aria-hidden="true" />
              <span>
                Traces 展示后端 Tracer 收集的 span 树（agent.astream → LLM → tool
                等嵌套调用）。每次 Agent 流式响应会生成一条 root trace。
              </span>
            </div>
            <TraceViewer />
          </div>
        )}
        {observeTab === 'replay' && (
          <div className={styles.auxTab}>
            <div className={styles.auxHint}>
              <Clock size={14} aria-hidden="true" />
              <span>
                Replay 提供 tick 回放控件（拖动进度条查看历史 tick
                状态），CostPanel 展示预算用量与每个 Agent 的花费。
              </span>
            </div>
            <div className={styles.replayLayout}>
              <ReplayControls />
              <CostPanel />
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
