import { useState } from 'react';
import { Plus, Trash2, Star, FileText } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import { cx } from '@/lib/cx';
import { formatDateTime } from '@/lib/datetime';
import CreateSpecModal from './CreateSpecModal';
import styles from './SpecListPanel.module.css';

export interface SpecListPanelProps {
  className?: string;
}

/**
 * 编排图列表面板（左侧栏）。
 *
 * 功能：
 * - 列出所有编排图（含名称 / 节点数 / 边数 / 激活标识）
 * - 创建新编排图（点击「新建」打开 CreateSpecModal：空白 / 从模板 / AI 生成）
 * - 选中编排图（加载详情 + 编译）
 * - 删除编排图
 * - 设为激活编排图（同时只有一个 active）
 */
export default function SpecListPanel({ className }: SpecListPanelProps) {
  const specs = useOrchestStore((s) => s.specs);
  const currentSpec = useOrchestStore((s) => s.currentSpec);
  const loading = useOrchestStore((s) => s.orchestrationLoading);
  const selectSpec = useOrchestStore((s) => s.selectSpec);
  const removeSpec = useOrchestStore((s) => s.removeSpec);
  const activateSpec = useOrchestStore((s) => s.activateSpec);

  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定删除此编排图？')) return;
    await removeSpec(id);
  };

  const handleActivate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await activateSpec(id);
  };

  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.head}>
        <span className={styles.title}>编排图列表</span>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={12} />}
          onClick={() => setModalOpen(true)}
        >
          新建
        </Button>
      </div>

      <div className={styles.list}>
        {loading && specs.length === 0 ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <Skeleton width="60%" height={12} />
                <Skeleton width="40%" height={10} />
              </div>
            ))}
          </div>
        ) : specs.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="暂无编排图"
            description="点击「新建」创建第一个编排图。"
            className={styles.empty}
          />
        ) : (
          specs.map((spec) => {
            const isActive = currentSpec?.id === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                className={cx(styles.item, isActive && styles.active)}
                onClick={() => selectSpec(spec.id)}
              >
                <div className={styles.itemHead}>
                  <span className={styles.itemName} title={spec.name}>
                    {spec.name}
                  </span>
                  {spec.is_active && (
                    <span className={styles.activeBadge} title="已激活">
                      <Star size={9} className={styles.activeIcon} />
                      激活
                    </span>
                  )}
                </div>
                <div className={styles.itemMeta}>
                  <span>{spec.node_count} 节点</span>
                  <span className={styles.dot}>·</span>
                  <span>{spec.edge_count} 边</span>
                  {spec.updated_at && (
                    <>
                      <span className={styles.dot}>·</span>
                      <span className={styles.time}>
                        {formatDateTime(spec.updated_at)}
                      </span>
                    </>
                  )}
                </div>
                <div className={styles.actions}>
                  {!spec.is_active && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      title="设为激活"
                      onClick={(e) => handleActivate(e, spec.id)}
                    >
                      <Star size={11} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={cx(styles.actionBtn, styles.danger)}
                    title="删除"
                    onClick={(e) => handleDelete(e, spec.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </button>
            );
          })
        )}
      </div>

      <CreateSpecModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
