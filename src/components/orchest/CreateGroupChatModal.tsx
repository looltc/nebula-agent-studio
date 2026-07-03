import { useMemo, useState, useEffect } from 'react';
import { Plus, X, Search, Users } from 'lucide-react';
import {
  Modal,
  Button,
  Field,
  TextInput,
  Select,
  Avatar,
  useToast,
} from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import { useChatStore } from '@/stores/chatStore';
import { resolveAvatarSrc } from '@/lib/avatar';
import type {
  GroupChatCreateRequest,
  Participant,
  FloorPolicy,
  AgentSummary,
} from '@/types/api';
import styles from './CreateGroupChatModal.module.css';

export interface CreateGroupChatModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

const ROLE_OPTIONS = ['member', 'moderator', 'advocate', 'critic', 'scribe'];

const FLOOR_POLICY_OPTIONS: Array<FloorPolicy['type']> = [
  'round_robin',
  'moderator',
  'free_for_all',
];

/**
 * 创建群聊 Modal。
 *
 * 设计原则：
 * - 不再提供「模板」：模板会生成 moderator-01 等占位 id，不是真实 agent，无意义
 * - 不再提供「Add Participant」placeholder 按钮：占位 id 无法对应到运行时 agent
 * - Agent 选择改为头像网格：直观、容量大、不截断
 * - 修复历史 bug：原 filteredAgents.slice(0, 6/8) 会截断 agent 列表，导致部分 agent 不显示
 */
export default function CreateGroupChatModal({
  open,
  onClose,
  className,
}: CreateGroupChatModalProps) {
  const agents = useChatStore((s) => s.agents);
  const loadAgents = useChatStore((s) => s.loadAgents);
  const createGroupChat = useOrchestStore((s) => s.createGroupChat);
  const toast = useToast();

  const [groupId, setGroupId] = useState('');
  const [floorPolicy, setFloorPolicy] = useState<FloorPolicy['type']>('free_for_all');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 打开时重置表单
  useEffect(() => {
    if (open) {
      setGroupId('');
      setFloorPolicy('free_for_all');
      setParticipants([]);
      setQuery('');
      setSubmitting(false);
    }
  }, [open]);

  // 确保 agent 列表已加载
  useEffect(() => {
    if (open) void loadAgents();
  }, [open, loadAgents]);

  // 过滤候选 agent：不截断，全部展示（修复原 slice(0,6/8) 导致部分 agent 不显示的问题）
  const candidateAgents = useMemo(() => {
    const added = new Set(participants.map((p) => p.id));
    // 只展示 enabled 的 agent，排除已添加的
    const list = agents.filter((a) => a.enabled && !added.has(a.id));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [agents, participants, query]);

  const addAgent = (a: AgentSummary) => {
    setParticipants((prev) =>
      prev.some((x) => x.id === a.id)
        ? prev
        : [...prev, { id: a.id, name: a.name, kind: 'agent', role: 'member' }],
    );
  };

  const updateRole = (id: string, role: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role } : p)),
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreate = async () => {
    if (participants.length === 0) {
      toast.warning('至少选择一个参与者', '群聊需要至少一个 Agent 参与');
      return;
    }
    setSubmitting(true);
    try {
      const body: GroupChatCreateRequest = {
        participants,
        floor_policy: { type: floorPolicy },
      };
      const trimmedId = groupId.trim();
      if (trimmedId) body.id = trimmedId;
      await createGroupChat(body);
      toast.success(
        '群聊已创建',
        `${participants.length} 个参与者 · ${floorPolicy}`,
      );
      onClose();
    } catch {
      toast.error('创建失败', '请查看控制台');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="创建群聊"
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            icon={<Plus size={16} />}
          >
            创建
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {/* ===== 群聊 ID（可选） ===== */}
        <section className={styles.section}>
          <Field
            label="群聊 ID"
            helper="可选，留空则由服务端自动生成"
          >
            <TextInput
              value={groupId}
              placeholder="team-research"
              onChange={(e) => setGroupId(e.target.value)}
            />
          </Field>
        </section>

        {/* ===== 发言策略 ===== */}
        <section className={styles.section}>
          <Field label="发言策略" helper="free_for_all=自由讨论 · round_robin=轮询 · moderator=主持人制">
            <Select
              value={floorPolicy}
              onChange={(e) => setFloorPolicy(e.target.value as FloorPolicy['type'])}
            >
              {FLOOR_POLICY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </section>

        {/* ===== 参与者 ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            参与者
            <span className={styles.sectionCount}>{participants.length}</span>
          </h3>

          {/* 搜索框 */}
          <TextInput
            icon={<Search size={14} />}
            placeholder="搜索 agent（id / 名称 / 角色）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* 头像网格选择 */}
          {candidateAgents.length > 0 ? (
            <div className={styles.agentGrid} role="listbox">
              {candidateAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={styles.agentGridItem}
                  onClick={() => addAgent(a)}
                  title={`添加 ${a.name}（${a.id}）`}
                >
                  <Avatar
                    name={a.name || a.id}
                    size="md"
                    src={resolveAvatarSrc(a.avatar)}
                  />
                  <span className={styles.agentGridName}>{a.name || a.id}</span>
                  <span className={styles.agentGridId}>{a.id}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <Users size={20} />
              <span>
                {agents.length === 0
                  ? '暂无可用 agent，请先创建 agent'
                  : '没有匹配的 agent'}
              </span>
            </div>
          )}

          {/* 已选参与者列表 */}
          {participants.length > 0 && (
            <ul className={styles.participantList}>
              {participants.map((p) => {
                const agentInfo = agents.find((a) => a.id === p.id);
                const name = p.name || agentInfo?.name || p.id;
                return (
                  <li key={p.id} className={styles.participantRow}>
                    <Avatar
                      name={name}
                      size="sm"
                      src={resolveAvatarSrc(agentInfo?.avatar)}
                    />
                    <div className={styles.participantInfo}>
                      <span className={styles.participantName}>{name}</span>
                      <span className={styles.participantId}>{p.id}</span>
                    </div>
                    <Select
                      value={p.role}
                      onChange={(e) => updateRole(p.id, e.target.value)}
                      className={styles.roleSelect}
                      aria-label={`角色 ${p.id}`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeParticipant(p.id)}
                      aria-label={`移除 ${p.id}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
