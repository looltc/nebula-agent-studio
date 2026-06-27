import { useMemo, useState, useEffect } from 'react';
import { Plus, X, Search, Users } from 'lucide-react';
import {
  Modal,
  Button,
  Field,
  TextInput,
  Select,
  Radio,
  Avatar,
  useToast,
} from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import { useChatStore } from '@/stores/chatStore';
import type {
  GroupChatCreateRequest,
  Participant,
  FloorPolicy,
} from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './CreateGroupChatModal.module.css';

export interface CreateGroupChatModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

type TemplateKey =
  | 'panel_discussion'
  | 'standup'
  | 'brainstorm'
  | 'code_review'
  | 'interview'
  | 'custom';

const TEMPLATES: { key: TemplateKey; label: string }[] = [
  { key: 'panel_discussion', label: 'Panel Discussion' },
  { key: 'standup', label: 'Standup' },
  { key: 'brainstorm', label: 'Brainstorm' },
  { key: 'code_review', label: 'Code Review' },
  { key: 'interview', label: 'Interview' },
  { key: 'custom', label: 'Custom' },
];

const ROLE_OPTIONS = ['member', 'moderator', 'advocate', 'critic', 'scribe'];

const FLOOR_POLICY_OPTIONS: Array<FloorPolicy['type']> = [
  'round_robin',
  'moderator',
  'free_for_all',
];

function templateParticipants(template: TemplateKey): Participant[] {
  switch (template) {
    case 'panel_discussion':
      return [
        { id: 'moderator-01', kind: 'agent', role: 'moderator' },
        { id: 'pro-01', kind: 'agent', role: 'advocate' },
        { id: 'con-01', kind: 'agent', role: 'critic' },
        { id: 'scribe-01', kind: 'agent', role: 'scribe' },
      ];
    case 'standup':
      return [
        { id: 'lead-01', kind: 'agent', role: 'moderator' },
        { id: 'member-01', kind: 'agent', role: 'member' },
        { id: 'member-02', kind: 'agent', role: 'member' },
      ];
    case 'brainstorm':
      return [
        { id: 'facilitator-01', kind: 'agent', role: 'moderator' },
        { id: 'ideator-01', kind: 'agent', role: 'advocate' },
        { id: 'ideator-02', kind: 'agent', role: 'advocate' },
        { id: 'scribe-01', kind: 'agent', role: 'scribe' },
      ];
    case 'code_review':
      return [
        { id: 'reviewer-01', kind: 'agent', role: 'moderator' },
        { id: 'critic-01', kind: 'agent', role: 'critic' },
        { id: 'scribe-01', kind: 'agent', role: 'scribe' },
      ];
    case 'interview':
      return [
        { id: 'interviewer-01', kind: 'agent', role: 'moderator' },
        { id: 'interviewee-01', kind: 'agent', role: 'member' },
      ];
    case 'custom':
      return [];
  }
}

/**
 * Create-group-chat modal. Renders identity, template picker (pre-fills
 * participants), floor policy selector, and a participant picker sourced from
 * chatStore.agents. On submit, builds a GroupChatCreateRequest and dispatches
 * createGroupChat on the orchestStore.
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
  const [template, setTemplate] = useState<TemplateKey>('custom');
  const [floorPolicy, setFloorPolicy] = useState<FloorPolicy['type']>('moderator');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (open) {
      setGroupId('');
      setTemplate('custom');
      setFloorPolicy('moderator');
      setParticipants([]);
      setQuery('');
      setSubmitting(false);
    }
  }, [open]);

  // Make sure the agent list is available for the picker.
  useEffect(() => {
    if (open) void loadAgents();
  }, [open, loadAgents]);

  const filteredAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const added = new Set(participants.map((p) => p.id));
    const list = agents.filter((a) => !added.has(a.id));
    if (!q) return list.slice(0, 6);
    return list
      .filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [agents, participants, query]);

  const addParticipant = (p: Participant) => {
    setParticipants((prev) =>
      prev.some((x) => x.id === p.id) ? prev : [...prev, p],
    );
  };

  const addAgent = (id: string, name?: string) => {
    addParticipant({ id, name, kind: 'agent', role: 'member' });
    setQuery('');
  };

  const addPlaceholder = () => {
    const n = participants.length + 1;
    const candidate = `agent-${String(n).padStart(2, '0')}`;
    addParticipant({ id: candidate, kind: 'agent', role: 'member' });
  };

  const updateRole = (id: string, role: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role } : p)),
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const applyTemplate = (t: TemplateKey) => {
    setTemplate(t);
    setParticipants(templateParticipants(t));
  };

  const handleCreate = async () => {
    if (participants.length === 0) {
      toast.warning('Add at least one participant', 'Group chats require participants.');
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
        'Group chat created',
        `Created with ${participants.length} participant(s) · ${floorPolicy} floor.`,
      );
      onClose();
    } catch {
      toast.error('Failed to create group chat', 'Check the console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Group Chat"
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            icon={<Plus size={16} />}
          >
            Create
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {/* ===== Identity ===== */}
        <section className={styles.section}>
          <Field
            label="Group ID"
            helper="Optional. Leave blank to let the server generate one."
          >
            <TextInput
              value={groupId}
              placeholder="team-research"
              onChange={(e) => setGroupId(e.target.value)}
            />
          </Field>
        </section>

        {/* ===== Template ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Template</h3>
          <div className={styles.templateGrid}>
            {TEMPLATES.map((t) => (
              <Radio
                key={t.key}
                name="gc-template"
                value={t.key}
                checked={template === t.key}
                onChange={() => applyTemplate(t.key)}
                label={t.label}
                className={styles.templateRadio}
              />
            ))}
          </div>
        </section>

        {/* ===== Floor Policy ===== */}
        <section className={styles.section}>
          <Field label="Floor Policy">
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

        {/* ===== Participants ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Participants
            <span className={styles.sectionCount}>{participants.length}</span>
          </h3>

          <Field label="Search agent">
            <TextInput
              icon={<Search size={14} />}
              placeholder="Search agents"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>

          {filteredAgents.length > 0 && (
            <div className={styles.agentResults} role="listbox">
              {filteredAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={styles.agentResult}
                  onClick={() => addAgent(a.id, a.name)}
                  title={`Add ${a.id}`}
                >
                  <Avatar name={a.id} size="sm" />
                  <span className={styles.agentResultId}>{a.id}</span>
                  <span className={styles.agentResultRole}>{a.role}</span>
                  <Plus size={12} className={styles.addIcon} />
                </button>
              ))}
            </div>
          )}

          {participants.length > 0 ? (
            <ul className={styles.participantList}>
              {participants.map((p) => (
                <li key={p.id} className={styles.participantRow}>
                  <Avatar name={p.id} size="sm" />
                  <span className={styles.participantId} title={p.id}>
                    {p.id}
                  </span>
                  <Select
                    value={p.role}
                    onChange={(e) => updateRole(p.id, e.target.value)}
                    className={styles.roleSelect}
                    aria-label={`Role for ${p.id}`}
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
                    aria-label={`Remove ${p.id}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <Users size={20} />
              <span>No participants yet. Add one above.</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={addPlaceholder}
            className={cx(styles.addBtn)}
          >
            Add Participant
          </Button>
        </section>
      </div>
    </Modal>
  );
}
