import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { MoreVertical, Edit, Copy, Pause, Play, Trash2 } from 'lucide-react';
=======
import { MoreVertical, Edit, Copy, Pause, Play, Trash2, Plus } from 'lucide-react';
>>>>>>> feat-implement-frontend-design-GH23Da
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
import type { AgentSummary, ToolInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './AgentList.module.css';

export interface AgentListProps {
  agents: AgentSummary[];
  loading: boolean;
  tools: ToolInfo[];
  /** Toggle local pause/resume. Parent owns the override state. */
  onTogglePause: (id: string) => void;
<<<<<<< HEAD
  /** Remove an agent from the local list (no backend delete API). */
  onRemove: (id: string) => void;
=======
>>>>>>> feat-implement-frontend-design-GH23Da
  className?: string;
}

/**
 * Responsive card grid of agents. Handles loading (skeletons), empty state,
<<<<<<< HEAD
 * per-card navigation and an operation menu (Edit / Duplicate / Pause / Delete).
=======
 * per-card navigation and an operation menu (编辑 / 复制 / 暂停 / 删除).
>>>>>>> feat-implement-frontend-design-GH23Da
 */
export function AgentList({
  agents,
  loading,
  tools,
  onTogglePause,
<<<<<<< HEAD
  onRemove,
  className,
}: AgentListProps) {
  const navigate = useNavigate();
  const duplicateAgent = useAgentStore((s) => s.duplicateAgent);
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AgentSummary | null>(null);

  const open = (id: string) => navigate(`/agents/${id}`);

  const handleDuplicate = (agent: AgentSummary) => {
    duplicateAgent(agent.id);
    toast.info('Agent duplicated', `Opened "${agent.id}-copy" in the create modal.`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onRemove(deleteTarget.id);
    toast.success('Agent deleted', `"${deleteTarget.name}" removed from the list.`);
    setDeleteTarget(null);
=======
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
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
        icon={<MoreVertical size={28} />}
        title="No agents yet"
        description="Create your first agent to get started with Nebula Agent Studio."
        action={
          <Button
            variant="primary"
            icon={<Edit size={16} />}
            onClick={() => useAgentStore.getState().setCreateOpen(true)}
          >
            New Agent
=======
        icon={<Plus size={28} />}
        title="尚无 Agent"
        description="创建你的第一个 Agent 以开始使用 Nebula Agent Studio。"
        action={
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleNewAgent}>
            新建 Agent
>>>>>>> feat-implement-frontend-design-GH23Da
          </Button>
        }
        className={className}
      />
    );
  }

  const toolNames = tools.map((t) => t.name);

  return (
    <>
      <div className={cx(styles.grid, className)}>
        {agents.map((agent) => (
          <AgentCardItem
            key={agent.id}
            agent={agent}
            toolNames={toolNames}
            onOpen={open}
<<<<<<< HEAD
=======
            onEdit={() => startEdit(agent.id)}
>>>>>>> feat-implement-frontend-design-GH23Da
            onDuplicate={handleDuplicate}
            onTogglePause={onTogglePause}
            onDeleteRequest={() => setDeleteTarget(agent)}
          />
        ))}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
<<<<<<< HEAD
        title="Delete agent"
=======
        title="删除 Agent"
>>>>>>> feat-implement-frontend-design-GH23Da
        danger
        size="sm"
        footer={
          <>
<<<<<<< HEAD
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={confirmDelete}>
              Delete
=======
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} loading={deleting} onClick={confirmDelete}>
              删除
>>>>>>> feat-implement-frontend-design-GH23Da
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
<<<<<<< HEAD
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
          cannot be undone.
=======
          确定要删除 <strong>{deleteTarget?.name}</strong> 吗？此操作无法撤销。
>>>>>>> feat-implement-frontend-design-GH23Da
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
  toolNames: string[];
  onOpen: (id: string) => void;
<<<<<<< HEAD
=======
  onEdit: () => void;
>>>>>>> feat-implement-frontend-design-GH23Da
  onDuplicate: (agent: AgentSummary) => void;
  onTogglePause: (id: string) => void;
  onDeleteRequest: () => void;
}

function AgentCardItem({
  agent,
  toolNames,
  onOpen,
<<<<<<< HEAD
=======
  onEdit,
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
    toast.info(isActive ? 'Agent paused' : 'Agent resumed', agent.name);
=======
    toast.info(isActive ? 'Agent 已暂停' : 'Agent 已恢复', agent.name);
>>>>>>> feat-implement-frontend-design-GH23Da
  };

  const previewTools = toolNames.slice(0, 2);
  const extraTools = Math.max(0, toolNames.length - previewTools.length);

  return (
    <Card className={styles.card} onClick={() => onOpen(agent.id)}>
      <div className={styles.head}>
        <div className={styles.identity} onClick={stop}>
          <Avatar name={agent.name} size="md" online={isActive} />
          <div className={styles.identityText}>
            <span className={styles.name}>{agent.name}</span>
            <span className={styles.idLabel}>{agent.id}</span>
          </div>
        </div>
        <div className={styles.menuWrap} ref={menuRef} onClick={stop}>
          <button
            type="button"
            className={styles.menuBtn}
<<<<<<< HEAD
            aria-label={`Actions for ${agent.name}`}
=======
            aria-label={`操作 ${agent.name}`}
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
                  onOpen(agent.id);
                }}
              >
                <Edit size={14} />
                <span>Edit</span>
=======
                  onEdit();
                }}
              >
                <Edit size={14} />
                <span>编辑</span>
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
                <span>Duplicate</span>
=======
                <span>复制</span>
>>>>>>> feat-implement-frontend-design-GH23Da
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={handlePauseToggle}
              >
                {isActive ? <Pause size={14} /> : <Play size={14} />}
<<<<<<< HEAD
                <span>{isActive ? 'Pause' : 'Resume'}</span>
=======
                <span>{isActive ? '暂停' : '恢复'}</span>
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
                <span>Delete</span>
=======
                <span>删除</span>
>>>>>>> feat-implement-frontend-design-GH23Da
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.roleRow}>
        <StatusDot status={status} />
        <span className={styles.role}>{agent.role}</span>
<<<<<<< HEAD
        <span className={styles.statusText}>{isActive ? 'Active' : 'Idle'}</span>
=======
        <span className={styles.statusText}>{isActive ? '运行中' : '空闲'}</span>
>>>>>>> feat-implement-frontend-design-GH23Da
      </div>

      <div className={styles.divider} />

      <div className={styles.metaRow}>
<<<<<<< HEAD
        <span className={styles.metaKey}>Thinking</span>
=======
        <span className={styles.metaKey}>思维</span>
>>>>>>> feat-implement-frontend-design-GH23Da
        <Badge variant="mono">ReAct</Badge>
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaKey}>Model</span>
        <Badge variant="mono">gpt-4o</Badge>
      </div>
      <div className={styles.metaRow}>
<<<<<<< HEAD
        <span className={styles.metaKey}>Tools</span>
=======
        <span className={styles.metaKey}>工具</span>
>>>>>>> feat-implement-frontend-design-GH23Da
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

      <div className={styles.divider} />

      <div className={styles.stats}>
        <span className={styles.stat}>
<<<<<<< HEAD
          <span className={styles.statLabel}>Messages</span>
          <span className={styles.statValue}>0</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Tokens</span>
=======
          <span className={styles.statLabel}>消息数</span>
          <span className={styles.statValue}>0</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Token</span>
>>>>>>> feat-implement-frontend-design-GH23Da
          <span className={styles.statValue}>0</span>
        </span>
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
      <div className={styles.skDivider} />
      <div className={styles.skStats}>
        <Skeleton width={70} height={12} />
        <Skeleton width={70} height={12} />
      </div>
    </div>
  );
}

export default AgentList;
