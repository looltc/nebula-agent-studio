import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal, Button, Field, TextInput, Select, TextArea, Radio, useToast } from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import { useConfigStore } from '@/stores/configStore';
import { cx } from '@/lib/cx';
import { ToolAuthorization } from './ToolAuthorization';
import { ThinkingModelConfig } from './ThinkingModelConfig';
import styles from './AgentCreateModal.module.css';

const SYSTEM_PROMPT_MAX = 4096;
const ROLE_OPTIONS = [
  'assistant',
  'researcher',
  'coder',
  'writer',
  'analyst',
  'reviewer',
  'architect',
  'manager',
];

type MemoryType = 'buffer' | 'summary';

export interface AgentCreateModalProps {
  className?: string;
}

/**
 * Create-agent modal bound to the agentStore form state. Renders Identity,
 * Thinking Model, LLM Provider, Tools, Memory and System Prompt sections, with
 * per-field validation errors surfaced from the store.
 */
export function AgentCreateModal({ className }: AgentCreateModalProps) {
  const createOpen = useAgentStore((s) => s.createOpen);
  const setCreateOpen = useAgentStore((s) => s.setCreateOpen);
  const form = useAgentStore((s) => s.form);
  const errors = useAgentStore((s) => s.errors);
  const updateForm = useAgentStore((s) => s.updateForm);
  const tools = useAgentStore((s) => s.tools);
  const selectedToolIds = useAgentStore((s) => s.selectedToolIds);
  const toggleTool = useAgentStore((s) => s.toggleTool);
  const addGoal = useAgentStore((s) => s.addGoal);
  const addConstraint = useAgentStore((s) => s.addConstraint);
  const updateGoal = useAgentStore((s) => s.updateGoal);
  const updateConstraint = useAgentStore((s) => s.updateConstraint);
  const removeGoal = useAgentStore((s) => s.removeGoal);
  const removeConstraint = useAgentStore((s) => s.removeConstraint);
  const createAgent = useAgentStore((s) => s.createAgent);

  const providers = useConfigStore((s) => s.providers);
  const models = useConfigStore((s) => s.models);

  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [memoryType, setMemoryType] = useState<MemoryType>('buffer');

  // Reset transient memory-type whenever the modal closes.
  useEffect(() => {
    if (!createOpen) setMemoryType('buffer');
  }, [createOpen]);

  const close = () => setCreateOpen(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const ok = await createAgent();
      if (ok) {
        toast.success('Agent created', `Agent "${form.id}" is ready.`);
      } else if (errors.form) {
        toast.error('Could not create agent', errors.form);
      } else {
        toast.warning('Please fix the highlighted fields.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const promptOver = form.systemPrompt.length > SYSTEM_PROMPT_MAX;

  return (
    <Modal
      open={createOpen}
      onClose={close}
      title="Create New Agent"
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} icon={<Plus size={16} />}>
            Create Agent
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {/* ===== Identity ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Identity</h3>
          <div className={styles.grid2}>
            <Field label="Agent ID" required error={errors.id} helper="Lowercase letters, digits, dashes.">
              <TextInput
                value={form.id}
                error={Boolean(errors.id)}
                placeholder="researcher-01"
                onChange={(e) => updateForm({ id: e.target.value })}
              />
            </Field>
            <Field label="Display Name" required error={errors.name}>
              <TextInput
                value={form.name}
                error={Boolean(errors.name)}
                placeholder="Researcher"
                onChange={(e) => updateForm({ name: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Role" required error={errors.role}>
            <Select
              value={form.role}
              error={Boolean(errors.role)}
              onChange={(e) => updateForm({ role: e.target.value })}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Persona" helper="Voice and disposition of the agent.">
            <TextArea
              rows={3}
              value={form.persona}
              placeholder="A meticulous researcher who provides accurate, verifiable information."
              onChange={(e) => updateForm({ persona: e.target.value })}
            />
          </Field>

          <DynamicList
            label="Goals"
            items={form.goals}
            onAdd={addGoal}
            onRemove={removeGoal}
            onUpdate={updateGoal}
            placeholder="Provide accurate, verifiable information"
            addLabel="Add goal"
          />
          <DynamicList
            label="Constraints"
            items={form.constraints}
            onAdd={addConstraint}
            onRemove={removeConstraint}
            onUpdate={updateConstraint}
            placeholder="Never fabricate facts"
            addLabel="Add constraint"
          />
        </section>

        {/* ===== Thinking Model ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Thinking Model</h3>
          <ThinkingModelConfig
            value={form.thinkingModel}
            maxIterations={form.maxIterations}
            onChange={updateForm}
          />
          {errors.maxIterations && (
            <div className={styles.fieldError} role="alert">
              {errors.maxIterations}
            </div>
          )}
        </section>

        {/* ===== LLM Provider ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>LLM Provider</h3>
          <div className={styles.grid3}>
            <Field label="Provider" required error={errors.provider}>
              <Select
                value={form.provider}
                error={Boolean(errors.provider)}
                onChange={(e) => updateForm({ provider: e.target.value })}
              >
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Model" required error={errors.model}>
              <Select
                value={form.model}
                error={Boolean(errors.model)}
                onChange={(e) => updateForm({ model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Temperature" error={errors.temperature} helper="0.0 – 2.0">
              <TextInput
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={form.temperature}
                error={Boolean(errors.temperature)}
                onChange={(e) => updateForm({ temperature: Number(e.target.value) })}
              />
            </Field>
          </div>
        </section>

        {/* ===== Tools ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Tools
            <span className={styles.sectionCount}>
              {selectedToolIds.length}/{tools.length} selected
            </span>
          </h3>
          <ToolAuthorization
            tools={tools}
            selectedIds={selectedToolIds}
            onToggle={toggleTool}
          />
        </section>

        {/* ===== Memory ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Memory</h3>
          <div className={styles.grid2}>
            <Field label="Type">
              <div className={styles.radioRow}>
                <Radio
                  checked={memoryType === 'buffer'}
                  onChange={() => setMemoryType('buffer')}
                  name="memory-type"
                  value="buffer"
                  label="Buffer"
                />
                <Radio
                  checked={memoryType === 'summary'}
                  onChange={() => setMemoryType('summary')}
                  name="memory-type"
                  value="summary"
                  label="Summary"
                />
              </div>
            </Field>
            <Field label="Max Messages" error={errors.maxMessages} helper="1 – 200">
              <TextInput
                type="number"
                min={1}
                max={200}
                value={form.maxMessages}
                error={Boolean(errors.maxMessages)}
                onChange={(e) => updateForm({ maxMessages: Number(e.target.value) })}
              />
            </Field>
          </div>
        </section>

        {/* ===== System Prompt ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>System Prompt</h3>
          <Field error={errors.systemPrompt}>
            <TextArea
              rows={5}
              value={form.systemPrompt}
              maxLength={SYSTEM_PROMPT_MAX}
              placeholder="You are a helpful assistant. Engage in conversation, answer questions, and assist."
              onChange={(e) => updateForm({ systemPrompt: e.target.value })}
            />
          </Field>
          <div className={cx(styles.charCount, promptOver && styles.charOver)}>
            {form.systemPrompt.length} / {SYSTEM_PROMPT_MAX}
          </div>
        </section>
      </div>
    </Modal>
  );
}

/* ---------- internal: dynamic list (goals / constraints) ---------- */

interface DynamicListProps {
  label: string;
  items: string[];
  addLabel: string;
  placeholder: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}

function DynamicList({
  label,
  items,
  addLabel,
  placeholder,
  onAdd,
  onRemove,
  onUpdate,
}: DynamicListProps) {
  return (
    <Field label={label}>
      <div className={styles.dynList}>
        {items.map((item, i) => (
          <div key={i} className={styles.dynRow}>
            <TextInput
              value={item}
              placeholder={placeholder}
              onChange={(e) => onUpdate(i, e.target.value)}
            />
            <button
              type="button"
              className={styles.dynRemove}
              onClick={() => onRemove(i)}
              aria-label={`Remove ${label.toLowerCase().slice(0, -1)} #${i + 1}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={onAdd}>
          {addLabel}
        </Button>
      </div>
    </Field>
  );
}

export default AgentCreateModal;
