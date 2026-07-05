import { useCallback, useEffect, useState } from 'react';
import {
  Database,
  Trash2,
  RefreshCw,
  Moon,
  Filter,
  Clock,
  Eye,
  User,
  Bot,
  Globe,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge, Button, Spinner, useToast } from '@/components/ui';
import { apiClient } from '@/services/api';
import type { MemoryItem, MemoryStats } from '@/types/api';
import { cx } from '@/lib/cx';
import { formatRelativeTime as formatTime } from '@/lib/datetime';
import styles from './MemoryPanel.module.css';

/** 记忆类型 → 中文标签 + Badge 配色 */
const TYPE_META: Record<
  string,
  { label: string; variant: 'primary' | 'success' | 'warning' | 'default' }
> = {
  semantic: { label: '语义', variant: 'primary' },
  episodic: { label: '情景', variant: 'success' },
  preference: { label: '偏好', variant: 'warning' },
  procedural: { label: '程序', variant: 'default' },
};

/** 所有可过滤的记忆类型（固定顺序） */
const TYPE_FILTERS = ['semantic', 'episodic', 'preference', 'procedural'] as const;

/** subject 认知对象维度 → 图标 + 中文标签 + 配色类 */
interface SubjectMeta {
  icon: typeof User;
  label: string;
  variant: 'self' | 'user' | 'agent' | 'world';
}

function getSubjectMeta(item: MemoryItem): SubjectMeta | null {
  // 优先从 metadata.subject 读取
  const subject =
    (item.metadata?.subject as string | undefined) ??
    item.tags
      .find((t) => t.startsWith('subject:'))
      ?.split(':', 2)[1];
  if (!subject) return null;

  if (subject === 'self') {
    return { icon: Target, label: '自我认知', variant: 'self' };
  }
  if (subject.startsWith('user:')) {
    return {
      icon: User,
      label: subject.slice(5),
      variant: 'user',
    };
  }
  if (subject.startsWith('agent:')) {
    return {
      icon: Bot,
      label: subject.slice(6),
      variant: 'agent',
    };
  }
  if (subject === 'world') {
    return { icon: Globe, label: '世界', variant: 'world' };
  }
  return null;
}

/** 从 tags 提取需要展示的（排除已用其它维度展示的 subject:/role:） */
function getDisplayTags(item: MemoryItem): string[] {
  return item.tags.filter(
    (t) => !t.startsWith('subject:') && !t.startsWith('role:'),
  );
}

export interface MemoryPanelProps {
  agentId: string;
  /** L2 短期记忆容量（max_messages），来自 AgentDetail 配置 */
  bufferCapacity: number;
}

/**
 * Agent 长期记忆可视化面板：
 * - 顶部统计卡（总数 / 按类型计数 / 平均重要性 / 总访问次数）
 * - 类型过滤 + 刷新 + 梦境整理（consolidate）
 * - 记忆条目列表：类型徽章 + 内容 + 重要性条 + 时间 + 访问次数 + 遗忘按钮
 *
 * 错误隔离：记忆系统未启用或后端 404 时降级为提示文案，不阻断详情页。
 */
export function MemoryPanel({ agentId, bufferCapacity }: MemoryPanelProps) {
  const toast = useToast();
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [forgettingId, setForgettingId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [clearing, setClearing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.memoryStats(agentId).catch(() => null),
        apiClient.listMemory(agentId, typeFilter ?? undefined, 50).catch(() => null),
      ]);
      if (statsRes) setStats(statsRes);
      if (listRes) setMemories(listRes.memories ?? []);
      // 若两次请求都返回 null（网络或后端未启用），标记为未启用
      if (statsRes === null && listRes === null) setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [agentId, typeFilter]);

  useEffect(() => {
    setEnabled(true);
    reload();
  }, [reload]);

  const handleForget = async (memoryId: string) => {
    setForgettingId(memoryId);
    try {
      await apiClient.forgetMemory(agentId, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      // 同步刷新统计（不阻塞 UI）
      apiClient.memoryStats(agentId).then(setStats).catch(() => {});
      toast.success('已遗忘', '该记忆已从长期记忆中移除。');
    } catch (e) {
      toast.error('遗忘失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setForgettingId(null);
    }
  };

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      const res = await apiClient.consolidateMemory(agentId);
      const r = res.report;
      const summary =
        `提取 ${r.extracted} · 深加工 ${r.deep_encoded ?? 0} · 重抽象 ${r.re_encoded ?? 0} · ` +
        `合并 ${r.merged} · 强化 ${r.reinforced} · 遗忘 ${r.forgotten}` +
        (r.errors.length > 0 ? ` · 错误 ${r.errors.length}` : '');
      toast.success('梦境整理完成', summary);
      await reload();
    } catch (e) {
      // ApiError 的 status===404 表示未启用长期记忆/梦境
      if (e && typeof e === 'object' && 'status' in e && e.status === 404) {
        toast.info('未启用梦境整理', '该 Agent 未启用长期记忆或梦境整理功能，请在配置中开启。');
      } else {
        const msg = e instanceof Error ? e.message : '请重试';
        toast.error('整理失败', msg);
      }
    } finally {
      setConsolidating(false);
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      `确定要清空 Agent "${agentId}" 的所有记忆吗？\n\n` +
      `将清空：\n` +
      `• L2 对话记忆（所有会话）\n` +
      `• L3 长期记忆（SQLite + 向量库）\n\n` +
      `此操作不可恢复！`,
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await apiClient.clearAllMemory(agentId);
      const summary =
        `L2 对话 ${res.l2_deleted} 条 · L3 长期 ${res.l3_deleted} 条` +
        (res.vector_collections_deleted.length > 0
          ? ` · 向量库 ${res.vector_collections_deleted.length} 个 collection`
          : '');
      toast.success('记忆已清空', summary);
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请重试';
      toast.error('清空失败', msg);
    } finally {
      setClearing(false);
    }
  };

  // 未启用长期记忆：降级提示
  if (!enabled) {
    return (
      <div className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.title}>
            <Database size={14} />
            长期记忆
          </span>
          <Badge variant="default">L2 Buffer · {bufferCapacity}</Badge>
        </div>
        <p className={styles.emptyText}>
          该 Agent 未启用长期记忆（L3）。请在配置中开启 long_term.enabled 以使用自主回忆与梦境整理。
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* ===== 头部：标题 + 操作 ===== */}
      <div className={styles.head}>
        <span className={styles.title}>
          <Database size={14} />
          长期记忆
          {stats && <span className={styles.count}>{stats.total_count}</span>}
        </span>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={reload}
            disabled={loading}
            title="刷新"
            aria-label="刷新记忆"
          >
            <RefreshCw size={14} className={loading ? styles.spinning : undefined} />
          </button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Moon size={14} />}
            loading={consolidating}
            onClick={handleConsolidate}
          >
            梦境整理
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            loading={clearing}
            onClick={handleClearAll}
          >
            清空记忆
          </Button>
        </div>
      </div>

      {/* ===== 统计区 ===== */}
      {stats && (
        <div className={styles.statsRow}>
          <StatCell label="总条数" value={String(stats.total_count)} />
          <StatCell
            label="平均重要性"
            value={stats.avg_importance.toFixed(2)}
          />
          <StatCell label="总访问" value={String(stats.total_access_count)} />
          <StatCell label="L2 容量" value={String(bufferCapacity)} muted />
        </div>
      )}

      {/* 类型分布条 */}
      {stats && stats.total_count > 0 && (
        <TypeDistribution byType={stats.by_type} total={stats.total_count} />
      )}

      {/* ===== 过滤栏 ===== */}
      <div className={styles.filterRow}>
        <Filter size={12} className={styles.filterIcon} />
        <button
          type="button"
          className={cx(styles.chip, !typeFilter && styles.chipActive)}
          onClick={() => setTypeFilter(null)}
        >
          全部
        </button>
        {TYPE_FILTERS.map((t) => {
          const meta = TYPE_META[t];
          const count = stats?.by_type[t] ?? 0;
          if (count === 0 && typeFilter !== t) return null;
          return (
            <button
              key={t}
              type="button"
              className={cx(
                styles.chip,
                typeFilter === t && styles.chipActive,
              )}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            >
              {meta.label}
              {count > 0 && <span className={styles.chipCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ===== 记忆列表 ===== */}
      {loading && memories.length === 0 ? (
        <div className={styles.loadingRow}>
          <Spinner size="sm" />
          <span>正在加载记忆…</span>
        </div>
      ) : memories.length === 0 ? (
        <p className={styles.emptyText}>
          {typeFilter
            ? `暂无「${TYPE_META[typeFilter]?.label ?? typeFilter}」类型记忆。`
            : '暂无长期记忆。Agent 对话后，梦境系统会在闲时自动整理出记忆。'}
        </p>
      ) : (
        <ul className={styles.list}>
          {memories.map((m) => (
            <MemoryRow
              key={m.id}
              item={m}
              forgetting={forgettingId === m.id}
              onForget={() => handleForget(m.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- 单条记忆 ---------- */

function MemoryRow({
  item,
  forgetting,
  onForget,
}: {
  item: MemoryItem;
  forgetting: boolean;
  onForget: () => void;
}) {
  const meta = TYPE_META[item.memory_type] ?? {
    label: item.memory_type,
    variant: 'default' as const,
  };
  // 重要性 0~1 → 百分比
  const imp = Math.max(0, Math.min(1, item.importance));
  const impPct = Math.round(imp * 100);
  // 重要性等级配色
  const impLevel =
    imp >= 0.6 ? 'high' : imp >= 0.3 ? 'mid' : 'low';
  // subject 认知对象维度
  const subjectMeta = getSubjectMeta(item);
  // 是否经过梦境重抽象
  const isReEncoded = item.metadata?.re_encoded === true;
  // 需要展示的 tags（排除 subject:/role: 等已被其它维度展示的）
  const displayTags = getDisplayTags(item);

  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <Badge variant={meta.variant}>{meta.label}</Badge>
        {subjectMeta && (
          <span
            className={cx(styles.subjectBadge, styles[`subj_${subjectMeta.variant}`])}
            title={`认知对象：${subjectMeta.label}`}
          >
            <subjectMeta.icon size={11} />
            {subjectMeta.label}
          </span>
        )}
        {isReEncoded && (
          <span className={styles.reEncodedBadge} title="此记忆已经过梦境重抽象">
            <Sparkles size={11} />
            已整理
          </span>
        )}
        <div className={styles.importanceWrap} title={`重要性 ${impPct}%`}>
          <div className={cx(styles.importanceBar, styles[`imp_${impLevel}`])}>
            <div className={styles.importanceFill} style={{ width: `${impPct}%` }} />
          </div>
          <span className={styles.importanceVal}>{impPct}</span>
        </div>
        <button
          type="button"
          className={styles.forgetBtn}
          onClick={onForget}
          disabled={forgetting}
          title="遗忘此记忆"
          aria-label="遗忘此记忆"
        >
          {forgetting ? <Spinner size="sm" /> : <Trash2 size={13} />}
        </button>
      </div>
      <p className={styles.content}>{item.content}</p>
      <div className={styles.rowMeta}>
        <span className={styles.metaItem} title="创建时间">
          <Clock size={11} />
          {formatTime(item.ts)}
        </span>
        <span className={styles.metaItem} title="访问次数">
          <Eye size={11} />
          {item.access_count}
        </span>
        {displayTags.length > 0 && (
          <span className={styles.metaTags}>
            {displayTags.slice(0, 4).map((t) => (
              <span key={t} className={styles.tag}>{t}</span>
            ))}
            {displayTags.length > 4 && (
              <span className={styles.tagMore}>+{displayTags.length - 4}</span>
            )}
          </span>
        )}
        {item.entities.length > 0 && (
          <span className={styles.metaEntities}>
            {item.entities.slice(0, 3).map((e) => (
              <span key={e} className={styles.entity}>{e}</span>
            ))}
            {item.entities.length > 3 && (
              <span className={styles.entityMore}>+{item.entities.length - 3}</span>
            )}
          </span>
        )}
        {item.ttl !== null && item.ttl !== undefined && (
          <span className={styles.ttlBadge} title={`TTL ${item.ttl}s`}>
            TTL {Math.round(item.ttl / 60)}m
          </span>
        )}
      </div>
    </li>
  );
}

/* ---------- 统计单元 ---------- */

function StatCell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={styles.statCell}>
      <span className={styles.statLabel}>{label}</span>
      <span className={cx(styles.statValue, muted && styles.statValueMuted)}>
        {value}
      </span>
    </div>
  );
}

/* ---------- 类型分布条 ---------- */

function TypeDistribution({
  byType,
  total,
}: {
  byType: Record<string, number>;
  total: number;
}) {
  const segments = TYPE_FILTERS.map((t) => ({
    type: t,
    count: byType[t] ?? 0,
  })).filter((s) => s.count > 0);

  if (segments.length === 0) return null;

  return (
    <div className={styles.distBar} title="记忆类型分布">
      {segments.map((s) => {
        const pct = (s.count / total) * 100;
        return (
          <div
            key={s.type}
            className={cx(styles.distSeg, styles[`dist_${s.type}`])}
            style={{ width: `${pct}%` }}
            title={`${TYPE_META[s.type]?.label ?? s.type}: ${s.count} (${pct.toFixed(0)}%)`}
          />
        );
      })}
    </div>
  );
}

/* ---------- helpers ---------- */

/* formatTime 已统一到 @/lib/datetime 的 formatRelativeTime */

export default MemoryPanel;
