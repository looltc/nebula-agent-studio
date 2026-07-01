import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Copy, Pause, Play, Trash2, Plus } from 'lucide-react';
import {
  Card,
  Badge,
  Avatar,
  StatusDot,
  Skeleton,
  EmptyState,
  Button,
  Modal,
  useToast,
} from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import type { AgentSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './AgentList.module.css';

export interface AgentListProps {
  agents: AgentSummary[];
  loading: boolean;
  /** Toggle local pause/resume. Parent owns the override state. */
  onTogglePause: (id: string) => void;
  className?: string;
}

/**
 * Responsive card grid of agents. Handles loading (skeletons), empty state,
 * per-card navigation and an operation menu (编辑 / 复制 / 暂停 / 删除).
 */
export function AgentList({
  agents,
  loading,
  onTogglePause,
  className,
}: AgentListProps) {
  const navigate = useNavigate();
  const startEdit = useAgentStore((s) => s.startEdit);
  const duplicateAgent = useAgentStore((s) => s.duplicateAgent);
  const deleteAgent = useAgentStore((s) => s.deleteAgent);
  const setCreateOpen = useAgentStore((s) => s.setCreateOpen);
  const resetForm = useAgentStore((s) => s.resetForm);
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AgentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = (id: string) => navigate(`/agents/${id}`);

  const handleNewAgent = () => {
    resetForm();
    setCreateOpen(true);
  };

  const handleDuplicate = (agent: AgentSummary) => {
    duplicateAgent(agent.id);
    toast.info('Agent 已复制', `已为 "${agent.id}" 打开复制创建窗口。`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await deleteAgent(deleteTarget.id);
      if (ok) {
        toast.success('Agent 已删除', `"${deleteTarget.name}" 已删除。`);
        setDeleteTarget(null);
      } else {
        toast.error('删除失败', '请检查后端连接或重试。');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={cx(styles.grid, className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className={styles.card}>
            <SkeletonBlock />
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={<Plus size={28} />}
        title="尚无 Agent"
        description="创建你的第一个 Agent 以开始使用 Nebula Agent Studio。"
        action={
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleNewAgent}>
            新建 Agent
          </Button>
        }
        className={className}
      />
    );
  }

  // 按修改时间倒序：最近修改的 Agent 排在最前。无 updated_at 的排到末尾。
  const sortedAgents = [...agents].sort((a, b) => {
    const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
    const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
    return tb - ta;
  });

  return (
    <>
      <div className={cx(styles.grid, className)}>
        {sortedAgents.map((agent) => (
          <AgentCardItem
            key={agent.id}
            agent={agent}
            onOpen={open}
            onEdit={() => startEdit(agent.id)}
            onDuplicate={handleDuplicate}
            onTogglePause={onTogglePause}
            onDeleteRequest={() => setDeleteTarget(agent)}
          />
        ))}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="删除 Agent"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} loading={deleting} onClick={confirmDelete}>
              删除
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          确定要删除 <strong>{deleteTarget?.name}</strong> 吗？此操作无法撤销。
        </p>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AgentCardItem                                                        */
/* ------------------------------------------------------------------ */

interface AgentCardItemProps {
  agent: AgentSummary;
  onOpen: (id: string) => void;
  onEdit: () => void;
  onDuplicate: (agent: AgentSummary) => void;
  onTogglePause: (id: string) => void;
  onDeleteRequest: () => void;
}

function AgentCardItem({
  agent,
  onOpen,
  onEdit,
  onDuplicate,
  onTogglePause,
  onDeleteRequest,
}: AgentCardItemProps) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const isActive = agent.enabled;
  const status: 'active' | 'idle' = isActive ? 'active' : 'idle';

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handlePauseToggle = (e: React.MouseEvent) => {
    stop(e);
    setMenuOpen(false);
    onTogglePause(agent.id);
    toast.info(isActive ? 'Agent 已暂停' : 'Agent 已恢复', agent.name);
  };

  const agentTools = agent.tools ?? [];
  const agentSkills = agent.skills ?? [];
  const previewTools = agentTools.slice(0, 2);
  const extraTools = Math.max(0, agentTools.length - previewTools.length);
  const previewSkills = agentSkills.slice(0, 2);
  const extraSkills = Math.max(0, agentSkills.length - previewSkills.length);

  return (
    <Card className={styles.card} onClick={() => onOpen(agent.id)}>
      <div className={styles.head}>
        <div className={styles.identity} onClick={stop}>
          <Avatar
            name={agent.name}
            size="md"
            online={isActive}
            src={agent.avatar ? `/avatars/${agent.avatar}` : null}
          />
          <div className={styles.identityText}>
            <span className={styles.name}>{agent.name}</span>
            <span className={styles.idLabel}>{agent.id}</span>
          </div>
        </div>
        <div className={styles.menuWrap} ref={menuRef} onClick={stop}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={`操作 ${agent.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className={styles.menu} role="menu">
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <Edit size={14} />
                <span>编辑</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onDuplicate(agent);
                }}
              >
                <Copy size={14} />
                <span>复制</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={handlePauseToggle}
              >
                {isActive ? <Pause size={14} /> : <Play size={14} />}
                <span>{isActive ? '暂停' : '恢复'}</span>
              </button>
              <div className={styles.menuDivider} />
              <button
                type="button"
                className={cx(styles.menuItem, styles.menuItemDanger)}
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onDeleteRequest();
                }}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.roleRow}>
        <StatusDot status={status} />
        <span className={styles.role}>{agent.role}</span>
        <span className={styles.statusText}>{isActive ? '运行中' : '空闲'}</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.metaRow}>
        <span className={styles.metaKey}>思维</span>
        <Badge variant="mono">{agent.thinking_model || 'react'}</Badge>
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaKey}>Model</span>
        <Badge variant="mono">{agent.llm?.model || '—'}</Badge>
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaKey}>工具</span>
        <div className={styles.toolBadges}>
          {previewTools.length > 0 ? (
            <>
              {previewTools.map((t) => (
                <Badge key={t} variant="mono">
                  {t}
                </Badge>
              ))}
              {extraTools > 0 && <Badge variant="default">+{extraTools}</Badge>}
            </>
          ) : (
            <span className={styles.metaEmpty}>&mdash;</span>
          )}
        </div>
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaKey}>Skills</span>
        <div className={styles.toolBadges}>
          {previewSkills.length > 0 ? (
            <>
              {previewSkills.map((s) => (
                <Badge key={s} variant="mono">
                  {s}
                </Badge>
              ))}
              {extraSkills > 0 && <Badge variant="default">+{extraSkills}</Badge>}
            </>
          ) : (
            <span className={styles.metaEmpty}>&mdash;</span>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                     */
/* ------------------------------------------------------------------ */

function SkeletonBlock() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skHead}>
        <Skeleton width={36} height={36} rounded />
        <div className={styles.skText}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={10} />
        </div>
      </div>
      <Skeleton width="50%" height={12} />
      <div className={styles.skDivider} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="70%" height={12} />
    </div>
  );
}

export default AgentList;
