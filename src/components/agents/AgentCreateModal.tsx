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
<<<<<<< HEAD
 * Create-agent modal bound to the agentStore form state. Renders Identity,
 * Thinking Model, LLM Provider, Tools, Memory and System Prompt sections, with
=======
 * Create / edit agent modal bound to the agentStore form state. Renders Identity,
 * Thinking Model, LLM 配置, 工具, 记忆 and System Prompt sections, with
>>>>>>> feat-implement-frontend-design-GH23Da
 * per-field validation errors surfaced from the store.
 */
export function AgentCreateModal({ className }: AgentCreateModalProps) {
  const createOpen = useAgentStore((s) => s.createOpen);
  const setCreateOpen = useAgentStore((s) => s.setCreateOpen);
<<<<<<< HEAD
=======
  const editingId = useAgentStore((s) => s.editingId);
  const currentDetail = useAgentStore((s) => s.currentDetail);
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD

  const providers = useConfigStore((s) => s.providers);
  const models = useConfigStore((s) => s.models);
=======
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const providers = useConfigStore((s) => s.providers);
  const providerModels = useConfigStore((s) => s.providerModels);
  const loadProviders = useConfigStore((s) => s.loadProviders);
  const loadProviderModels = useConfigStore((s) => s.loadProviderModels);
>>>>>>> feat-implement-frontend-design-GH23Da

  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [memoryType, setMemoryType] = useState<MemoryType>('buffer');

<<<<<<< HEAD
=======
  const isEditMode = Boolean(editingId);

  // Load providers whenever the modal opens.
  useEffect(() => {
    if (createOpen) {
      loadProviders();
    }
  }, [createOpen, loadProviders]);

  // Auto-load models for the currently selected provider (if not loaded yet).
  useEffect(() => {
    if (!createOpen) return;
    if (!form.provider) return;
    if (!providerModels[form.provider]) {
      loadProviderModels(form.provider);
    }
  }, [createOpen, form.provider, providerModels, loadProviderModels]);

>>>>>>> feat-implement-frontend-design-GH23Da
  // Reset transient memory-type whenever the modal closes.
  useEffect(() => {
    if (!createOpen) setMemoryType('buffer');
  }, [createOpen]);

  const close = () => setCreateOpen(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
<<<<<<< HEAD
      const ok = await createAgent();
      if (ok) {
        toast.success('Agent created', `Agent "${form.id}" is ready.`);
      } else if (errors.form) {
        toast.error('Could not create agent', errors.form);
      } else {
        toast.warning('Please fix the highlighted fields.');
=======
      if (isEditMode && editingId) {
        const ok = await updateAgent(editingId);
        if (ok) {
          toast.success('Agent 已更新', `Agent "${form.name}" 已保存。`);
        } else if (errors.form) {
          toast.error('更新失败', errors.form);
        } else {
          toast.warning('请修正高亮的字段。');
        }
      } else {
        const ok = await createAgent();
        if (ok) {
          toast.success('Agent 已创建', `Agent "${form.id}" 已就绪。`);
        } else if (errors.form) {
          toast.error('创建失败', errors.form);
        } else {
          toast.warning('请修正高亮的字段。');
        }
>>>>>>> feat-implement-frontend-design-GH23Da
      }
    } finally {
      setSubmitting(false);
    }
  };

  const promptOver = form.systemPrompt.length > SYSTEM_PROMPT_MAX;
<<<<<<< HEAD
=======
  const availableModels = form.provider ? providerModels[form.provider] ?? [] : [];
  const hasExistingApiKey = Boolean(isEditMode && currentDetail?.llm.has_api_key);
>>>>>>> feat-implement-frontend-design-GH23Da

  return (
    <Modal
      open={createOpen}
      onClose={close}
<<<<<<< HEAD
      title="Create New Agent"
=======
      title={isEditMode ? '编辑 Agent' : '创建 Agent'}
>>>>>>> feat-implement-frontend-design-GH23Da
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
<<<<<<< HEAD
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} icon={<Plus size={16} />}>
            Create Agent
=======
            取消
          </Button>
          <Button onClick={handleSubmit} loading={submitting} icon={<Plus size={16} />}>
            {isEditMode ? '保存修改' : '创建 Agent'}
>>>>>>> feat-implement-frontend-design-GH23Da
          </Button>
        </>
      }
    >
      <div className={styles.body}>
<<<<<<< HEAD
        {/* ===== Identity ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Identity</h3>
          <div className={styles.grid2}>
            <Field label="Agent ID" required error={errors.id} helper="Lowercase letters, digits, dashes.">
=======
        {/* ===== 身份 (Identity) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>身份</h3>
          <div className={styles.grid2}>
            <Field
              label="Agent ID"
              required={!isEditMode}
              error={errors.id}
              helper={isEditMode ? 'ID 不可修改' : '小写字母、数字与连字符。'}
            >
>>>>>>> feat-implement-frontend-design-GH23Da
              <TextInput
                value={form.id}
                error={Boolean(errors.id)}
                placeholder="researcher-01"
<<<<<<< HEAD
                onChange={(e) => updateForm({ id: e.target.value })}
              />
            </Field>
            <Field label="Display Name" required error={errors.name}>
=======
                disabled={isEditMode}
                onChange={(e) => updateForm({ id: e.target.value })}
              />
            </Field>
            <Field label="显示名称" required error={errors.name}>
>>>>>>> feat-implement-frontend-design-GH23Da
              <TextInput
                value={form.name}
                error={Boolean(errors.name)}
                placeholder="Researcher"
                onChange={(e) => updateForm({ name: e.target.value })}
              />
            </Field>
          </div>
<<<<<<< HEAD
          <Field label="Role" required error={errors.role}>
=======
          <Field label="角色" required error={errors.role}>
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
          <Field label="Persona" helper="Voice and disposition of the agent.">
            <TextArea
              rows={3}
              value={form.persona}
              placeholder="A meticulous researcher who provides accurate, verifiable information."
=======
          <Field label="人设" helper="Agent 的语气与性格倾向。">
            <TextArea
              rows={3}
              value={form.persona}
              placeholder="一位严谨的研究员，提供准确、可验证的信息。"
>>>>>>> feat-implement-frontend-design-GH23Da
              onChange={(e) => updateForm({ persona: e.target.value })}
            />
          </Field>

          <DynamicList
<<<<<<< HEAD
            label="Goals"
=======
            label="目标"
>>>>>>> feat-implement-frontend-design-GH23Da
            items={form.goals}
            onAdd={addGoal}
            onRemove={removeGoal}
            onUpdate={updateGoal}
<<<<<<< HEAD
            placeholder="Provide accurate, verifiable information"
            addLabel="Add goal"
          />
          <DynamicList
            label="Constraints"
=======
            placeholder="提供准确、可验证的信息"
            addLabel="添加目标"
          />
          <DynamicList
            label="约束"
>>>>>>> feat-implement-frontend-design-GH23Da
            items={form.constraints}
            onAdd={addConstraint}
            onRemove={removeConstraint}
            onUpdate={updateConstraint}
<<<<<<< HEAD
            placeholder="Never fabricate facts"
            addLabel="Add constraint"
          />
        </section>

        {/* ===== Thinking Model ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Thinking Model</h3>
=======
            placeholder="不得编造事实"
            addLabel="添加约束"
          />
        </section>

        {/* ===== 思维模型 (Thinking Model) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>思维模型</h3>
>>>>>>> feat-implement-frontend-design-GH23Da
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

<<<<<<< HEAD
        {/* ===== LLM Provider ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>LLM Provider</h3>
          <div className={styles.grid3}>
=======
        {/* ===== LLM 配置 ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>LLM 配置</h3>
          <div className={styles.grid2}>
>>>>>>> feat-implement-frontend-design-GH23Da
            <Field label="Provider" required error={errors.provider}>
              <Select
                value={form.provider}
                error={Boolean(errors.provider)}
                onChange={(e) => updateForm({ provider: e.target.value })}
              >
<<<<<<< HEAD
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
=======
                {providers.length === 0 && <option value="">尚无供应商</option>}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
>>>>>>> feat-implement-frontend-design-GH23Da
                  </option>
                ))}
              </Select>
            </Field>
<<<<<<< HEAD
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
=======
            <Field
              label="Model"
              required
              error={errors.model}
              helper={
                availableModels.length > 0
                  ? `已加载 ${availableModels.length} 个模型，可直接选择或手动输入`
                  : '可手动输入，或先在设置中加载模型'
              }
            >
              <div className={styles.modelField}>
                <TextInput
                  value={form.model}
                  error={Boolean(errors.model)}
                  placeholder="gpt-4o-mini"
                  list="agent-model-options"
                  onChange={(e) => updateForm({ model: e.target.value })}
                />
                <datalist id="agent-model-options">
                  {availableModels.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </Field>
          </div>

          <Field label="Temperature" helper="0.0（确定） – 2.0（发散）">
            <div className={styles.sliderRow}>
              <input
                type="range"
>>>>>>> feat-implement-frontend-design-GH23Da
                min={0}
                max={2}
                step={0.1}
                value={form.temperature}
<<<<<<< HEAD
                error={Boolean(errors.temperature)}
                onChange={(e) => updateForm({ temperature: Number(e.target.value) })}
=======
                className={styles.slider}
                onChange={(e) => updateForm({ temperature: Number(e.target.value) })}
                aria-label="Temperature"
              />
              <span className={styles.sliderValue}>
                {form.temperature.toFixed(1)}
              </span>
            </div>
          </Field>

          <div className={styles.grid2}>
            <Field
              label="Base URL"
              helper="可选，例如 https://api.openai.com/v1"
            >
              <TextInput
                value={form.baseUrl}
                placeholder="https://api.openai.com/v1"
                onChange={(e) => updateForm({ baseUrl: e.target.value })}
              />
            </Field>
            <Field
              label="API Key"
              helper={
                hasExistingApiKey
                  ? '留空则使用环境变量'
                  : '可选，留空则使用环境变量'
              }
            >
              <TextInput
                type="password"
                value={form.apiKey}
                placeholder="sk-..."
                onChange={(e) => updateForm({ apiKey: e.target.value })}
>>>>>>> feat-implement-frontend-design-GH23Da
              />
            </Field>
          </div>
        </section>

<<<<<<< HEAD
        {/* ===== Tools ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Tools
            <span className={styles.sectionCount}>
              {selectedToolIds.length}/{tools.length} selected
=======
        {/* ===== 工具 (Tools) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            工具
            <span className={styles.sectionCount}>
              {selectedToolIds.length}/{tools.length} 已选
>>>>>>> feat-implement-frontend-design-GH23Da
            </span>
          </h3>
          <ToolAuthorization
            tools={tools}
            selectedIds={selectedToolIds}
            onToggle={toggleTool}
          />
        </section>

<<<<<<< HEAD
        {/* ===== Memory ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Memory</h3>
          <div className={styles.grid2}>
            <Field label="Type">
=======
        {/* ===== 记忆 (Memory) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>记忆</h3>
          <div className={styles.grid2}>
            <Field label="类型">
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
            <Field label="Max Messages" error={errors.maxMessages} helper="1 – 200">
=======
            <Field label="最大消息数" error={errors.maxMessages} helper="1 – 200">
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
              placeholder="You are a helpful assistant. Engage in conversation, answer questions, and assist."
=======
              placeholder="你是一个乐于助人的助手。参与对话、回答问题并提供协助。"
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
              aria-label={`Remove ${label.toLowerCase().slice(0, -1)} #${i + 1}`}
=======
              aria-label={`移除 ${label} #${i + 1}`}
>>>>>>> feat-implement-frontend-design-GH23Da
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
