import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal, Button, Field, TextInput, Select, TextArea, useToast } from '@/components/ui';
import { useAgentStore } from '@/stores/agentStore';
import { useConfigStore } from '@/stores/configStore';
import { cx } from '@/lib/cx';
import { ToolAuthorization } from './ToolAuthorization';
import { SkillAuthorization } from '@/components/skills';
import { ThinkingModelConfig } from './ThinkingModelConfig';
import { MemoryConfig } from './MemoryConfig';
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

// Built-in animal avatars (24 flat-style SVGs in public/avatars/).
// Generated programmatically; see /public/avatars/manifest.json for the
// animal-to-filename mapping. Listed here so the picker is static and
// tree-shakeable (no fetch needed at runtime).
const AVATAR_FILES = [
  'rat.svg', 'ox.svg', 'tiger.svg', 'rabbit.svg',
  'dragon.svg', 'snake.svg', 'horse.svg', 'goat.svg',
  'monkey.svg', 'rooster.svg', 'dog.svg', 'pig.svg',
  'cat.svg', 'panda.svg', 'fox.svg', 'penguin.svg',
  'koala.svg', 'owl.svg', 'frog.svg', 'hedgehog.svg',
  'llama.svg', 'redpanda.svg', 'shiba.svg', 'hamster.svg',
];

export interface AgentCreateModalProps {
  className?: string;
}

/**
 * Create / edit agent modal bound to the agentStore form state. Renders Identity,
 * Thinking Model, LLM 配置, 工具, 记忆 and System Prompt sections, with
 * per-field validation errors surfaced from the store.
 */
export function AgentCreateModal({ className }: AgentCreateModalProps) {
  const createOpen = useAgentStore((s) => s.createOpen);
  const setCreateOpen = useAgentStore((s) => s.setCreateOpen);
  const editingId = useAgentStore((s) => s.editingId);
  const form = useAgentStore((s) => s.form);
  const errors = useAgentStore((s) => s.errors);
  const updateForm = useAgentStore((s) => s.updateForm);
  const tools = useAgentStore((s) => s.tools);
  const selectedToolIds = useAgentStore((s) => s.selectedToolIds);
  const toggleTool = useAgentStore((s) => s.toggleTool);
  const skills = useAgentStore((s) => s.skills);
  const selectedSkillIds = useAgentStore((s) => s.selectedSkillIds);
  const toggleSkill = useAgentStore((s) => s.toggleSkill);
  const toggleMemoryModule = useAgentStore((s) => s.toggleMemoryModule);
  const updateLongTerm = useAgentStore((s) => s.updateLongTerm);
  const loadSkills = useAgentStore((s) => s.loadSkills);
  const addGoal = useAgentStore((s) => s.addGoal);
  const addConstraint = useAgentStore((s) => s.addConstraint);
  const updateGoal = useAgentStore((s) => s.updateGoal);
  const updateConstraint = useAgentStore((s) => s.updateConstraint);
  const removeGoal = useAgentStore((s) => s.removeGoal);
  const removeConstraint = useAgentStore((s) => s.removeConstraint);
  const createAgent = useAgentStore((s) => s.createAgent);
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const providers = useConfigStore((s) => s.providers);
  const providerModels = useConfigStore((s) => s.providerModels);
  const loadProviders = useConfigStore((s) => s.loadProviders);
  const loadProviderModels = useConfigStore((s) => s.loadProviderModels);

  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = Boolean(editingId);

  // Load providers whenever the modal opens.
  useEffect(() => {
    if (createOpen) {
      loadProviders();
      loadSkills();
    }
  }, [createOpen, loadProviders, loadSkills]);

  // Auto-load models for the currently selected provider (if not loaded yet).
  useEffect(() => {
    if (!createOpen) return;
    if (!form.provider) return;
    if (!providerModels[form.provider]) {
      loadProviderModels(form.provider);
    }
  }, [createOpen, form.provider, providerModels, loadProviderModels]);

  const close = () => setCreateOpen(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
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
      }
    } finally {
      setSubmitting(false);
    }
  };

  const promptOver = form.systemPrompt.length > SYSTEM_PROMPT_MAX;
  const availableModels = form.provider ? providerModels[form.provider] ?? [] : [];
  const selectedProvider = providers.find((p) => p.id === form.provider);

  return (
    <Modal
      open={createOpen}
      onClose={close}
      title={isEditMode ? '编辑 Agent' : '创建 Agent'}
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} loading={submitting} icon={<Plus size={16} />}>
            {isEditMode ? '保存修改' : '创建 Agent'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
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
              <TextInput
                value={form.id}
                error={Boolean(errors.id)}
                placeholder="researcher-01"
                disabled={isEditMode}
                onChange={(e) => updateForm({ id: e.target.value })}
              />
            </Field>
            <Field label="显示名称" required error={errors.name}>
              <TextInput
                value={form.name}
                error={Boolean(errors.name)}
                placeholder="Researcher"
                onChange={(e) => updateForm({ name: e.target.value })}
              />
            </Field>
          </div>
          {/* Avatar picker — 24 flat-style animal avatars. Empty = UI fallback
              to first-letter avatar at runtime. */}
          <Field label="头像" helper="从内置动物头像中选择；不选则使用首字母。">
            <div className={styles.avatarGrid}>
              <button
                type="button"
                className={cx(
                  styles.avatarOption,
                  !form.avatar && styles.avatarOptionActive,
                )}
                onClick={() => updateForm({ avatar: '' })}
                aria-label="不使用头像"
                title="不使用头像"
              >
                <span className={styles.avatarNone}>
                  {form.name ? form.name.charAt(0).toUpperCase() : 'A'}
                </span>
              </button>
              {AVATAR_FILES.map((file) => (
                <button
                  key={file}
                  type="button"
                  className={cx(
                    styles.avatarOption,
                    form.avatar === file && styles.avatarOptionActive,
                  )}
                  onClick={() => updateForm({ avatar: file })}
                  aria-label={file}
                  title={file.replace(/\.\w+$/, '')}
                >
                  <img src={`/avatars/${file}`} alt={file} className={styles.avatarImg} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="角色" required error={errors.role}>
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
          <Field label="人设" helper="Agent 的语气与性格倾向。">
            <TextArea
              rows={3}
              value={form.persona}
              placeholder="一位严谨的研究员，提供准确、可验证的信息。"
              onChange={(e) => updateForm({ persona: e.target.value })}
            />
          </Field>

          <DynamicList
            label="目标"
            items={form.goals}
            onAdd={addGoal}
            onRemove={removeGoal}
            onUpdate={updateGoal}
            placeholder="提供准确、可验证的信息"
            addLabel="添加目标"
          />
          <DynamicList
            label="约束"
            items={form.constraints}
            onAdd={addConstraint}
            onRemove={removeConstraint}
            onUpdate={updateConstraint}
            placeholder="不得编造事实"
            addLabel="添加约束"
          />

          <Field label="System Prompt" error={errors.systemPrompt}>
            <TextArea
              rows={5}
              value={form.systemPrompt}
              maxLength={SYSTEM_PROMPT_MAX}
              placeholder="你是一个乐于助人的助手。参与对话、回答问题并提供协助。"
              onChange={(e) => updateForm({ systemPrompt: e.target.value })}
            />
          </Field>
          <div className={cx(styles.charCount, promptOver && styles.charOver)}>
            {form.systemPrompt.length} / {SYSTEM_PROMPT_MAX}
          </div>
        </section>

        {/* ===== 思维模型 (Thinking Model) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>思维模型</h3>
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

        {/* ===== LLM 配置 ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>LLM 配置</h3>
          <div className={styles.grid2}>
            <Field label="Provider" required error={errors.provider}>
              <Select
                value={form.provider}
                error={Boolean(errors.provider)}
                onChange={(e) => updateForm({ provider: e.target.value })}
              >
                <option value="">
                  {providers.length === 0 ? '尚无供应商，请先在设置中配置' : '请选择 Provider'}
                </option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
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
                  placeholder="请输入或选择 Model"
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
                min={0}
                max={2}
                step={0.1}
                value={form.temperature}
                className={styles.slider}
                onChange={(e) => updateForm({ temperature: Number(e.target.value) })}
                aria-label="Temperature"
              />
              <span className={styles.sliderValue}>
                {form.temperature.toFixed(1)}
              </span>
            </div>
          </Field>

          {selectedProvider && (
            <div className={styles.providerHint}>
              Base URL 与 API Key 由供应商配置统一管理（
              <strong>{selectedProvider.name}</strong>
              {selectedProvider.api_key_set ? '，已配置密钥' : '，未配置密钥'}
              ）。如需修改请前往「设置」页面。
            </div>
          )}
        </section>

        {/* ===== 工具 (Tools) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            工具
            <span className={styles.sectionCount}>
              {selectedToolIds.length}/{tools.length} 已选
            </span>
          </h3>
          <ToolAuthorization
            tools={tools}
            selectedIds={selectedToolIds}
            onToggle={toggleTool}
          />
        </section>

        {/* ===== Skills ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Skills
            <span className={styles.sectionCount}>
              {selectedSkillIds.length}/{skills.length} 已选
            </span>
          </h3>
          <SkillAuthorization
            skills={skills}
            selectedIds={selectedSkillIds}
            onToggle={toggleSkill}
          />
        </section>

        {/* ===== 记忆 (Memory) ===== */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>记忆</h3>
          <Field
            label="L2 短期容量"
            error={errors.maxMessages}
            helper="Buffer 滑动窗口大小，1 – 200"
          >
            <TextInput
              type="number"
              min={1}
              max={200}
              value={form.maxMessages}
              error={Boolean(errors.maxMessages)}
              onChange={(e) => updateForm({ maxMessages: Number(e.target.value) })}
            />
          </Field>
          {/* L3 长期记忆配置：启用开关 + 模组多选 + 梦境整理 */}
          <MemoryConfig
            value={form.longTerm}
            bufferCapacity={form.maxMessages}
            onToggleModule={toggleMemoryModule}
            onUpdate={updateLongTerm}
            providers={providers}
          />
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
              aria-label={`移除 ${label} #${i + 1}`}
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
