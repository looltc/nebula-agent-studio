import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Copy, Pause, Play, Trash2 } from 'lucide-react';
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
  /** Remove an agent from the local list (no backend delete API). */
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Responsive card grid of agents. Handles loading (skeletons), empty state,
 * per-card navigation and an operation menu (Edit / Duplicate / Pause / Delete).
 */
export function AgentList({
  agents,
  loading,
  tools,
  onTogglePause,
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
            onDuplicate={handleDuplicate}
            onTogglePause={onTogglePause}
            onDeleteRequest={() => setDeleteTarget(agent)}
          />
        ))}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete agent"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
          cannot be undone.
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
  onDuplicate: (agent: AgentSummary) => void;
  onTogglePause: (id: string) => void;
  onDeleteRequest: () => void;
}

function AgentCardItem({
  agent,
  toolNames,
  onOpen,
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
    toast.info(isActive ? 'Agent paused' : 'Agent resumed', agent.name);
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
            aria-label={`Actions for ${agent.name}`}
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
                  onOpen(agent.id);
                }}
              >
                <Edit size={14} />
                <span>Edit</span>
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
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={handlePauseToggle}
              >
                {isActive ? <Pause size={14} /> : <Play size={14} />}
                <span>{isActive ? 'Pause' : 'Resume'}</span>
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
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.roleRow}>
        <StatusDot status={status} />
        <span className={styles.role}>{agent.role}</span>
        <span className={styles.statusText}>{isActive ? 'Active' : 'Idle'}</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.metaRow}>
        <span className={styles.metaKey}>Thinking</span>
        <Badge variant="mono">ReAct</Badge>
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaKey}>Model</span>
        <Badge variant="mono">gpt-4o</Badge>
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaKey}>Tools</span>
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
          <span className={styles.statLabel}>Messages</span>
          <span className={styles.statValue}>0</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Tokens</span>
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
