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
<<<<<<< HEAD
=======
  User,
>>>>>>> feat-implement-frontend-design-GH23Da
} from 'lucide-react';
import {
  Card,
  Badge,
  Avatar,
  StatusDot,
  Button,
  Modal,
  EmptyState,
<<<<<<< HEAD
=======
  Spinner,
>>>>>>> feat-implement-frontend-design-GH23Da
  useToast,
} from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import type { AgentSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './AgentDetail.module.css';

export interface AgentDetailProps {
  agent: AgentSummary | null;
<<<<<<< HEAD
  onTogglePause: (id: string) => void;
  onRemove: (id: string) => void;
=======
>>>>>>> feat-implement-frontend-design-GH23Da
  className?: string;
}

/**
 * Agent detail page: read-only configuration (left, 60%) + runtime status
<<<<<<< HEAD
 * (right, 40%) with an operation menu and Edit/Pause actions.
 */
export function AgentDetail({ agent, onTogglePause, onRemove, className }: AgentDetailProps) {
  const navigate = useNavigate();
  const tools = useAgentStore((s) => s.tools);
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

=======
 * (right, 40%) with an operation menu and Edit/Pause actions. Wired to real
 * backend data via agentStore.currentDetail.
 */
export function AgentDetail({ agent, className }: AgentDetailProps) {
  const navigate = useNavigate();
  const currentDetail = useAgentStore((s) => s.currentDetail);
  const detailLoading = useAgentStore((s) => s.detailLoading);
  const tools = useAgentStore((s) => s.tools);
  const loadAgentDetail = useAgentStore((s) => s.loadAgentDetail);
  const startEdit = useAgentStore((s) => s.startEdit);
  const deleteAgent = useAgentStore((s) => s.deleteAgent);
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load full agent detail when the agent id changes.
  useEffect(() => {
    if (agent) {
      loadAgentDetail(agent.id);
    }
  }, [agent?.id, loadAgentDetail]);

>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
          <span>Agents</span>
        </button>
        <EmptyState
          icon={<Wrench size={28} />}
          title="Agent not found"
          description="This agent may have been removed. Return to the agents list."
          action={
            <Button variant="primary" onClick={() => navigate('/agents')}>
              Back to Agents
=======
          <span>返回列表</span>
        </button>
        <EmptyState
          icon={<Wrench size={28} />}
          title="未找到 Agent"
          description="该 Agent 可能已被删除，请返回列表查看。"
          action={
            <Button variant="primary" onClick={() => navigate('/agents')}>
              返回列表
>>>>>>> feat-implement-frontend-design-GH23Da
            </Button>
          }
        />
      </div>
    );
  }

  const isActive = agent.enabled;
  const status: 'active' | 'idle' = isActive ? 'active' : 'idle';

<<<<<<< HEAD
  const handleEdit = () => {
    setMenuOpen(false);
    toast.info('Editing is not yet available', 'Duplicate the agent to reconfigure.');
=======
  const handleEdit = async () => {
    setMenuOpen(false);
    await startEdit(agent.id);
    navigate('/agents');
>>>>>>> feat-implement-frontend-design-GH23Da
  };

  const handlePauseToggle = () => {
    setMenuOpen(false);
<<<<<<< HEAD
    onTogglePause(agent.id);
    toast.info(isActive ? 'Agent paused' : 'Agent resumed', agent.name);
=======
    toast.info('功能开发中', '暂停/恢复功能尚未实现。');
>>>>>>> feat-implement-frontend-design-GH23Da
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmDelete(true);
  };

<<<<<<< HEAD
  const confirmDeleteAction = () => {
    onRemove(agent.id);
    toast.success('Agent deleted', `"${agent.name}" removed.`);
    setConfirmDelete(false);
    navigate('/agents');
  };

=======
  const confirmDeleteAction = async () => {
    setDeleting(true);
    try {
      const ok = await deleteAgent(agent.id);
      if (ok) {
        toast.success('Agent 已删除', `"${agent.name}" 已删除。`);
        setConfirmDelete(false);
        navigate('/agents');
      } else {
        toast.error('删除失败', '请检查后端连接或重试。');
      }
    } finally {
      setDeleting(false);
    }
  };

  const thinkingModelLabel =
    currentDetail?.thinking_model === 'plan_execute' ? 'Plan-Execute' : 'ReAct';

  // Build a map of tool name -> dangerous for badge rendering.
  const toolDangerMap = new Map(tools.map((t) => [t.name, t.dangerous]));
  const agentTools = currentDetail?.tools ?? [];

>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
          <span>Agents</span>
=======
          <span>返回列表</span>
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
                <span className={styles.headerStatus}>{isActive ? 'Active' : 'Idle'}</span>
=======
                <span className={styles.headerStatus}>
                  {isActive ? '运行中' : '空闲'}
                </span>
>>>>>>> feat-implement-frontend-design-GH23Da
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
                <button type="button" className={styles.menuItem} role="menuitem" onClick={handleEdit}>
                  <Edit size={14} />
<<<<<<< HEAD
                  <span>Edit</span>
                </button>
                <button type="button" className={styles.menuItem} role="menuitem" onClick={handlePauseToggle}>
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isActive ? 'Pause' : 'Resume'}</span>
=======
                  <span>编辑</span>
                </button>
                <button type="button" className={styles.menuItem} role="menuitem" onClick={handlePauseToggle}>
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isActive ? '暂停' : '恢复'}</span>
>>>>>>> feat-implement-frontend-design-GH23Da
                </button>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  className={cx(styles.menuItem, styles.menuItemDanger)}
                  role="menuitem"
                  onClick={handleDelete}
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
      </Card>

      {/* Two-column body */}
      <div className={styles.columns}>
        {/* Left: configuration */}
        <div className={styles.leftCol}>
<<<<<<< HEAD
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
=======
          {detailLoading && !currentDetail ? (
            <Card className={styles.section}>
              <div className={styles.loadingState}>
                <Spinner size="sm" />
                <span>正在加载配置…</span>
              </div>
            </Card>
          ) : currentDetail ? (
            <>
              <Card className={styles.section}>
                <SectionTitle icon={<Cpu size={14} />}>配置</SectionTitle>
                <div className={styles.kvGrid}>
                  <KV label="思维模型" value={thinkingModelLabel} />
                  <KV label="模型" value={currentDetail.llm.model} mono />
                  <KV label="Temperature" value={currentDetail.llm.temperature.toFixed(1)} mono />
                  <KV label="最大迭代次数" value={String(currentDetail.max_iterations)} mono />
                  <KV label="Provider" value={currentDetail.llm.provider} mono />
                  <KV
                    label="Base URL"
                    value={currentDetail.llm.base_url ?? '默认'}
                    mono
                    muted={!currentDetail.llm.base_url}
                  />
                </div>
              </Card>

              <Card className={styles.section}>
                <SectionTitle icon={<User size={14} />}>身份</SectionTitle>
                <Field label="人设">
                  <p className={styles.persona}>
                    {currentDetail.persona || '（未设置）'}
                  </p>
                </Field>
                <SimpleList
                  label="目标"
                  items={currentDetail.goals}
                  emptyText="（未设置目标）"
                />
                <SimpleList
                  label="约束"
                  items={currentDetail.constraints}
                  emptyText="（未设置约束）"
                />
              </Card>

              <Card className={styles.section}>
                <SectionTitle icon={<Wrench size={14} />}>
                  工具
                  <span className={styles.sectionCount}>{agentTools.length}</span>
                </SectionTitle>
                {agentTools.length > 0 ? (
                  <div className={styles.toolList}>
                    {agentTools.map((name) => (
                      <div key={name} className={styles.toolRow}>
                        <span className={styles.toolName}>{name}</span>
                        <Badge variant={toolDangerMap.get(name) ? 'danger' : 'success'}>
                          {toolDangerMap.get(name) ? '危险' : '安全'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyText}>该 Agent 未授权任何工具。</p>
                )}
              </Card>

              <Card className={styles.section}>
                <SectionTitle icon={<Database size={14} />}>记忆</SectionTitle>
                <div className={styles.kvGrid}>
                  <KV label="类型" value="Buffer" />
                  <KV label="容量" value={`${currentDetail.max_messages}`} mono />
                </div>
              </Card>

              <Card className={styles.section}>
                <SectionTitle>System Prompt</SectionTitle>
                <details className={styles.promptDetails}>
                  <summary className={styles.promptSummary}>
                    <span>点击展开</span>
                  </summary>
                  <pre className={styles.promptCode}>
                    <code>
                      {currentDetail.system_prompt || '（未设置 System Prompt）'}
                    </code>
                  </pre>
                </details>
              </Card>
            </>
          ) : (
            <Card className={styles.section}>
              <div className={styles.loadingState}>无法加载 Agent 配置。</div>
            </Card>
          )}
>>>>>>> feat-implement-frontend-design-GH23Da
        </div>

        {/* Right: runtime status */}
        <div className={styles.rightCol}>
          <Card className={styles.section}>
<<<<<<< HEAD
            <SectionTitle icon={<Cpu size={14} />}>Runtime Status</SectionTitle>
            <div className={styles.statusGrid}>
              <Stat label="State" value={isActive ? 'active' : 'idle'} />
              <Stat label="Last Tick" value="0" mono />
              <Stat label="Decisions" value="0" mono />
              <Stat label="Messages" value="0" mono />
              <Stat label="Tokens" value="0" mono />
              <Stat label="Cost" value="$0.00" mono />
=======
            <SectionTitle icon={<Cpu size={14} />}>运行状态</SectionTitle>
            <div className={styles.statusGrid}>
              <Stat label="状态" value={isActive ? '运行中' : '空闲'} />
              <Stat label="最大消息数" value={currentDetail ? String(currentDetail.max_messages) : '—'} mono />
              <Stat label="决策数" value="—" mono />
              <Stat label="消息数" value="—" mono />
              <Stat label="Tokens" value="—" mono />
              <Stat label="费用" value="—" mono />
>>>>>>> feat-implement-frontend-design-GH23Da
            </div>
          </Card>

          <Card className={styles.section}>
<<<<<<< HEAD
            <SectionTitle>Recent Actions</SectionTitle>
            <div className={styles.actionsEmpty}>
              <Wrench size={20} className={styles.actionsEmptyIcon} />
              <p className={styles.emptyText}>No recent actions recorded.</p>
=======
            <SectionTitle>最近操作</SectionTitle>
            <div className={styles.actionsEmpty}>
              <Wrench size={20} className={styles.actionsEmptyIcon} />
              <p className={styles.emptyText}>暂无最近操作记录。</p>
>>>>>>> feat-implement-frontend-design-GH23Da
            </div>
          </Card>

          <div className={styles.actionButtons}>
            <Button variant="primary" icon={<Edit size={16} />} onClick={handleEdit} fullWidth>
<<<<<<< HEAD
              Edit Agent
=======
              编辑 Agent
>>>>>>> feat-implement-frontend-design-GH23Da
            </Button>
            <Button
              variant="secondary"
              icon={isActive ? <Pause size={16} /> : <Play size={16} />}
              onClick={handlePauseToggle}
              fullWidth
            >
<<<<<<< HEAD
              {isActive ? 'Pause Agent' : 'Resume Agent'}
=======
              {isActive ? '暂停 Agent' : '恢复 Agent'}
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={handleDelete}
              fullWidth
            >
              删除 Agent
>>>>>>> feat-implement-frontend-design-GH23Da
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
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
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={confirmDeleteAction}>
              Delete
=======
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} loading={deleting} onClick={confirmDeleteAction}>
              删除
>>>>>>> feat-implement-frontend-design-GH23Da
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
<<<<<<< HEAD
          Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be
          undone.
=======
          确定要删除 <strong>{agent.name}</strong> 吗？此操作无法撤销。
>>>>>>> feat-implement-frontend-design-GH23Da
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

<<<<<<< HEAD
function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={cx(styles.kvValue, mono && styles.mono)}>{value}</span>
=======
function KV({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={cx(styles.kvValue, mono && styles.mono, muted && styles.kvValueMuted)}>
        {value}
      </span>
>>>>>>> feat-implement-frontend-design-GH23Da
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

<<<<<<< HEAD
=======
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      {children}
    </div>
  );
}

function SimpleList({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      {items.length > 0 ? (
        <ul className={styles.simpleList}>
          {items.map((item, i) => (
            <li key={i} className={styles.simpleListItem}>
              <span className={styles.simpleBullet} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.simpleEmpty}>{emptyText}</p>
      )}
    </div>
  );
}

>>>>>>> feat-implement-frontend-design-GH23Da
export default AgentDetail;
