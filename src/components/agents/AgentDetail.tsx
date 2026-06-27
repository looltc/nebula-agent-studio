import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MoreVertical,
  Edit,
  Pause,
  Play,
  Trash2,
  Wrench,
  Cpu,
  Database,
} from 'lucide-react';
import {
  Card,
  Badge,
  Avatar,
  StatusDot,
  Button,
  Modal,
  EmptyState,
  useToast,
} from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import type { AgentSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './AgentDetail.module.css';

export interface AgentDetailProps {
  agent: AgentSummary | null;
  onTogglePause: (id: string) => void;
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Agent detail page: read-only configuration (left, 60%) + runtime status
 * (right, 40%) with an operation menu and Edit/Pause actions.
 */
export function AgentDetail({ agent, onTogglePause, onRemove, className }: AgentDetailProps) {
  const navigate = useNavigate();
  const tools = useAgentStore((s) => s.tools);
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  if (!agent) {
    return (
      <div className={cx(styles.wrap, className)}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate('/agents')}
        >
          <ChevronLeft size={14} />
          <span>Agents</span>
        </button>
        <EmptyState
          icon={<Wrench size={28} />}
          title="Agent not found"
          description="This agent may have been removed. Return to the agents list."
          action={
            <Button variant="primary" onClick={() => navigate('/agents')}>
              Back to Agents
            </Button>
          }
        />
      </div>
    );
  }

  const isActive = agent.enabled;
  const status: 'active' | 'idle' = isActive ? 'active' : 'idle';

  const handleEdit = () => {
    setMenuOpen(false);
    toast.info('Editing is not yet available', 'Duplicate the agent to reconfigure.');
  };

  const handlePauseToggle = () => {
    setMenuOpen(false);
    onTogglePause(agent.id);
    toast.info(isActive ? 'Agent paused' : 'Agent resumed', agent.name);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmDelete(true);
  };

  const confirmDeleteAction = () => {
    onRemove(agent.id);
    toast.success('Agent deleted', `"${agent.name}" removed.`);
    setConfirmDelete(false);
    navigate('/agents');
  };

  return (
    <div className={cx(styles.wrap, className)}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate('/agents')}
        >
          <ChevronLeft size={14} />
          <span>Agents</span>
        </button>
        <span className={styles.crumbSep}>/</span>
        <span className={styles.crumbCurrent}>{agent.id}</span>
      </div>

      {/* Header card */}
      <Card className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerIdentity}>
            <Avatar name={agent.name} size="lg" online={isActive} />
            <div className={styles.headerText}>
              <div className={styles.headerNameRow}>
                <h1 className={styles.headerName}>{agent.name}</h1>
                <StatusDot status={status} />
                <span className={styles.headerStatus}>{isActive ? 'Active' : 'Idle'}</span>
              </div>
              <div className={styles.headerSub}>
                <span className={styles.headerId}>{agent.id}</span>
                <span className={styles.headerRole}>{agent.role}</span>
              </div>
            </div>
          </div>

          <div className={styles.menuWrap} ref={menuRef}>
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
                <button type="button" className={styles.menuItem} role="menuitem" onClick={handleEdit}>
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
                <button type="button" className={styles.menuItem} role="menuitem" onClick={handlePauseToggle}>
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isActive ? 'Pause' : 'Resume'}</span>
                </button>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  className={cx(styles.menuItem, styles.menuItemDanger)}
                  role="menuitem"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Two-column body */}
      <div className={styles.columns}>
        {/* Left: configuration */}
        <div className={styles.leftCol}>
          <Card className={styles.section}>
            <SectionTitle icon={<Cpu size={14} />}>Configuration</SectionTitle>
            <div className={styles.kvGrid}>
              <KV label="Thinking Model" value="ReAct" />
              <KV label="Model" value="gpt-4o" mono />
              <KV label="Temperature" value="0.7" mono />
              <KV label="Max Iterations" value="5" mono />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionTitle icon={<Wrench size={14} />}>
              Tools
              <span className={styles.sectionCount}>{tools.length}</span>
            </SectionTitle>
            {tools.length > 0 ? (
              <div className={styles.toolList}>
                {tools.map((t) => (
                  <div key={t.name} className={styles.toolRow}>
                    <span className={styles.toolName}>{t.name}</span>
                    <Badge variant={t.dangerous ? 'danger' : 'success'}>
                      {t.dangerous ? 'dangerous' : 'safe'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>No tools registered.</p>
            )}
          </Card>

          <Card className={styles.section}>
            <SectionTitle icon={<Database size={14} />}>Memory</SectionTitle>
            <div className={styles.kvGrid}>
              <KV label="Type" value="Buffer" />
              <KV label="Capacity" value="50 / 50" mono />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionTitle>System Prompt</SectionTitle>
            <details className={styles.promptDetails}>
              <summary className={styles.promptSummary}>
                <span>Click to expand</span>
              </summary>
              <pre className={styles.promptCode}>
                <code>
                  {agent.role
                    ? `You are a ${agent.role}. Engage in conversation, answer questions, and assist.`
                    : 'You are a helpful assistant. Engage in conversation, answer questions, and assist.'}
                </code>
              </pre>
            </details>
          </Card>
        </div>

        {/* Right: runtime status */}
        <div className={styles.rightCol}>
          <Card className={styles.section}>
            <SectionTitle icon={<Cpu size={14} />}>Runtime Status</SectionTitle>
            <div className={styles.statusGrid}>
              <Stat label="State" value={isActive ? 'active' : 'idle'} />
              <Stat label="Last Tick" value="0" mono />
              <Stat label="Decisions" value="0" mono />
              <Stat label="Messages" value="0" mono />
              <Stat label="Tokens" value="0" mono />
              <Stat label="Cost" value="$0.00" mono />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionTitle>Recent Actions</SectionTitle>
            <div className={styles.actionsEmpty}>
              <Wrench size={20} className={styles.actionsEmptyIcon} />
              <p className={styles.emptyText}>No recent actions recorded.</p>
            </div>
          </Card>

          <div className={styles.actionButtons}>
            <Button variant="primary" icon={<Edit size={16} />} onClick={handleEdit} fullWidth>
              Edit Agent
            </Button>
            <Button
              variant="secondary"
              icon={isActive ? <Pause size={16} /> : <Play size={16} />}
              onClick={handlePauseToggle}
              fullWidth
            >
              {isActive ? 'Pause Agent' : 'Resume Agent'}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete agent"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={confirmDeleteAction}>
              Delete
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}

/* ---------- internal helpers ---------- */

function SectionTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className={styles.sectionTitle}>
      {icon && (
        <span className={styles.sectionTitleIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={cx(styles.kvValue, mono && styles.mono)}>{value}</span>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={cx(styles.statValue, mono && styles.mono)}>{value}</span>
    </div>
  );
}

export default AgentDetail;
