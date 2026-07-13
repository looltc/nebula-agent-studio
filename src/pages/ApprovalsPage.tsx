import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { ContentHeader, PageContainer } from '@/components/layout';
import { Button, EmptyState, useToast } from '@/components/ui';
import { HITLApproval } from '@/components/chat/HITLApproval';
import { apiClient } from '@/services/api';
import { usePolling } from '@/hooks/usePolling';
import { cx } from '@/lib/cx';
import type { ApprovalInfo } from '@/types/api';
import styles from './ApprovalsPage.module.css';

type SceneFilter = 'all' | 'chat' | 'group' | 'orch';

const SCENE_FILTERS: Array<{ key: SceneFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'chat', label: '单聊' },
  { key: 'group', label: '群聊' },
  { key: 'orch', label: '编排' },
];

const POLL_INTERVAL_MS = 3000;

/**
 * 统一审批中心：轮询 /approvals/pending，集中展示三场景（单聊/群聊/编排）
 * 的待人工审批任务。每条用 HITLApproval 卡片渲染，审批后从列表移除。
 */
export default function ApprovalsPage() {
  const toast = useToast();
  const [approvals, setApprovals] = useState<ApprovalInfo[]>([]);
  const [sceneFilter, setSceneFilter] = useState<SceneFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listPendingApprovals();
      setApprovals(res.approvals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 轮询
  usePolling(refresh, POLL_INTERVAL_MS, true, [refresh]);

  const filtered = useMemo(() => {
    if (sceneFilter === 'all') return approvals;
    return approvals.filter((a) => a.scene === sceneFilter);
  }, [approvals, sceneFilter]);

  const counts = useMemo(() => {
    const base: Record<SceneFilter, number> = { all: approvals.length, chat: 0, group: 0, orch: 0 };
    for (const a of approvals) {
      if (a.scene in base) base[a.scene as SceneFilter] += 1;
    }
    return base;
  }, [approvals]);

  const handleResolved = useCallback(
    (approvalId: string, tool: string) => {
      setApprovals((prev) => prev.filter((a) => a.approval_id !== approvalId));
      toast.success('Approval resolved', `${tool} approval has been processed.`);
    },
    [toast],
  );

  return (
    <PageContainer flushTop>
      <ContentHeader
        title="审批中心"
        subtitle="集中查看并处理单聊 / 群聊 / 编排三场景的人工审批任务"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? styles.spinning : undefined} />}
            onClick={() => void refresh()}
            disabled={loading}
          >
            刷新
          </Button>
        }
        filters={
          <div className={styles.filters}>
            {SCENE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={cx(styles.filterChip, sceneFilter === f.key && styles.filterChipActive)}
                onClick={() => setSceneFilter(f.key)}
              >
                {f.label}
                <span className={styles.filterCount}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className={styles.body}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            加载失败：{error}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title="暂无待审批任务"
            description="所有场景均无 pending 审批。页面会自动轮询刷新。"
            className={styles.empty}
          />
        ) : (
          <div className={styles.list}>
            {filtered.map((a) => (
              <HITLApproval
                key={a.approval_id}
                approvalId={a.approval_id}
                agentId={a.agent_id ?? a.tool}
                tool={a.tool}
                args={a.args}
                scene={a.scene}
                onResolved={() => handleResolved(a.approval_id, a.tool)}
                timeoutSeconds={600}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
