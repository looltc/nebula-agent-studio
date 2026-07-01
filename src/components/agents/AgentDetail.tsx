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
  User,
  Puzzle,
} from 'lucide-react';
import {
  Card,
  Badge,
  Avatar,
  StatusDot,
  Button,
  Modal,
  EmptyState,
  Spinner,
  useToast,
} from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import type { AgentSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import { MemoryPanel } from './MemoryPanel';
import styles from './AgentDetail.module.css';

export interface AgentDetailProps {
  agent: AgentSummary | null;
  className?: string;
}

/**
 * Agent detail page: read-only configuration (left, 60%) + runtime status
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
          <span>返回列表</span>
        </button>
        <EmptyState
          icon={<Wrench size={28} />}
          title="未找到 Agent"
          description="该 Agent 可能已被删除，请返回列表查看。"
          action={
            <Button variant="primary" onClick={() => navigate('/agents')}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  const isActive = agent.enabled;
  const status: 'active' | 'idle' = isActive ? 'active' : 'idle';

  const handleEdit = async () => {
    setMenuOpen(false);
    await startEdit(agent.id);
    navigate('/agents');
  };

  const handlePauseToggle = () => {
    setMenuOpen(false);
    toast.info('功能开发中', '暂停/恢复功能尚未实现。');
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmDelete(true);
  };

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
          <span>返回列表</span>
        </button>
        <span className={styles.crumbSep}>/</span>
        <span className={styles.crumbCurrent}>{agent.id}</span>
      </div>

      {/* Header card */}
      <Card className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerIdentity}>
            <Avatar
              name={agent.name}
              size="lg"
              online={isActive}
              src={agent.avatar ? `/avatars/${agent.avatar}` : null}
            />
            <div className={styles.headerText}>
              <div className={styles.headerNameRow}>
                <h1 className={styles.headerName}>{agent.name}</h1>
                <StatusDot status={status} />
                <span className={styles.headerStatus}>
                  {isActive ? '运行中' : '空闲'}
                </span>
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
              aria-label={`操作 ${agent.name}`}
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
                  <span>编辑</span>
                </button>
                <button type="button" className={styles.menuItem} role="menuitem" onClick={handlePauseToggle}>
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isActive ? '暂停' : '恢复'}</span>
                </button>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  className={cx(styles.menuItem, styles.menuItemDanger)}
                  role="menuitem"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} />
                  <span>删除</span>
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
                <SectionTitle icon={<User size={14} />}>身份与人设</SectionTitle>
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
                <Field label="System Prompt">
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
                </Field>
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

              {currentDetail.skills.length > 0 && (
                <Card className={styles.section}>
                  <SectionTitle icon={<Puzzle size={14} />}>
                    Skills
                    <span className={styles.sectionCount}>{currentDetail.skills.length}</span>
                  </SectionTitle>
                  <div className={styles.toolList}>
                    {currentDetail.skills.map((name) => (
                      <div key={name} className={styles.toolRow}>
                        <span className={styles.toolName}>{name}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className={styles.section}>
                <SectionTitle icon={<Database size={14} />}>记忆</SectionTitle>
                <div className={styles.kvGrid}>
                  <KV label="L2 类型" value="Buffer" />
                  <KV label="L2 容量" value={`${currentDetail.max_messages}`} mono />
                </div>
                {/* L3 长期记忆可视化：统计 + 列表 + 过滤 + 遗忘 + 梦境整理 */}
                <div className={styles.memoryPanelWrap}>
                  <MemoryPanel
                    agentId={agent.id}
                    bufferCapacity={currentDetail.max_messages}
                  />
                </div>
              </Card>
            </>
          ) : (
            <Card className={styles.section}>
              <div className={styles.loadingState}>无法加载 Agent 配置。</div>
            </Card>
          )}
        </div>

        {/* Right: runtime status */}
        <div className={styles.rightCol}>
          <Card className={styles.section}>
            <SectionTitle icon={<Cpu size={14} />}>运行状态</SectionTitle>
            <div className={styles.statusGrid}>
              <Stat label="状态" value={isActive ? '运行中' : '空闲'} />
              <Stat label="最大消息数" value={currentDetail ? String(currentDetail.max_messages) : '—'} mono />
              <Stat label="决策数" value="—" mono />
              <Stat label="消息数" value="—" mono />
              <Stat label="Tokens" value="—" mono />
              <Stat label="费用" value="—" mono />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionTitle>最近操作</SectionTitle>
            <div className={styles.actionsEmpty}>
              <Wrench size={20} className={styles.actionsEmptyIcon} />
              <p className={styles.emptyText}>暂无最近操作记录。</p>
            </div>
          </Card>

          <div className={styles.actionButtons}>
            <Button variant="primary" icon={<Edit size={16} />} onClick={handleEdit} fullWidth>
              编辑 Agent
            </Button>
            <Button
              variant="secondary"
              icon={isActive ? <Pause size={16} /> : <Play size={16} />}
              onClick={handlePauseToggle}
              fullWidth
            >
              {isActive ? '暂停 Agent' : '恢复 Agent'}
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={handleDelete}
              fullWidth
            >
              删除 Agent
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="删除 Agent"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} loading={deleting} onClick={confirmDeleteAction}>
              删除
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          确定要删除 <strong>{agent.name}</strong> 吗？此操作无法撤销。
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

export default AgentDetail;
