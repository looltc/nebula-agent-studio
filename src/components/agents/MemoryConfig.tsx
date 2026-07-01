import { Moon, Database, Brain, Sparkles } from 'lucide-react';
import { Field, Toggle, TextInput, Select } from '@/components/ui';
import type { LongTermMemoryConfig, MemoryModuleType, ProviderSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './MemoryConfig.module.css';

/** 记忆模组元数据：固定顺序 + 中文标签 + 描述 */
const MODULE_META: {
  type: MemoryModuleType;
  label: string;
  desc: string;
}[] = [
  { type: 'semantic', label: '语义记忆', desc: '事实、知识、概念' },
  { type: 'episodic', label: '情景记忆', desc: '事件、经历、对话' },
  { type: 'preference', label: '偏好记忆', desc: '用户喜好与习惯' },
  { type: 'procedural', label: '程序记忆', desc: '方法、流程、技能' },
];

export interface MemoryConfigProps {
  /** L3 长期记忆配置 */
  value: LongTermMemoryConfig;
  /** L2 短期记忆容量（max_messages），由父级控制，此处仅展示上下文 */
  bufferCapacity: number;
  /** 切换记忆模组选中状态 */
  onToggleModule: (module: MemoryModuleType) => void;
  /** 更新长期记忆配置（enabled / consolidation / embedding 等） */
  onUpdate: (partial: Partial<LongTermMemoryConfig>) => void;
  /** 可用的 LLM Provider 列表（embedding 复用同一 Provider 体系） */
  providers: ProviderSummary[];
  className?: string;
}

/**
 * Agent 记忆模组配置（AgentCreateModal 记忆区使用）：
 * - L2 短期：只读展示 Buffer + 容量
 * - L3 长期：启用开关 + 模组多选卡片网格 + embedding 模型选择 + 梦境整理
 *
 * 启用 L3 后才展示模组选择与梦境配置；未启用时折叠，保持 UI 简洁。
 */
export function MemoryConfig({
  value,
  bufferCapacity,
  onToggleModule,
  onUpdate,
  providers,
  className,
}: MemoryConfigProps) {
  const { enabled, modules, consolidation, embedding } = value;

  return (
    <div className={cx(styles.wrap, className)}>
      {/* ===== L2 短期记忆（只读） ===== */}
      <div className={styles.row}>
        <div className={styles.rowIcon}>
          <Database size={14} />
        </div>
        <div className={styles.rowBody}>
          <span className={styles.rowTitle}>L2 短期记忆</span>
          <span className={styles.rowHint}>Buffer · 容量 {bufferCapacity}</span>
        </div>
        <span className={styles.tag}>固定</span>
      </div>

      {/* ===== L3 长期记忆启用开关 ===== */}
      <div className={cx(styles.row, styles.rowL3)}>
        <div className={styles.rowIcon}>
          <Brain size={14} />
        </div>
        <div className={styles.rowBody}>
          <span className={styles.rowTitle}>L3 长期记忆</span>
          <span className={styles.rowHint}>
            跨会话知识库，支持自主回忆与梦境整理
          </span>
        </div>
        <Toggle
          checked={enabled}
          onChange={(c) => onUpdate({ enabled: c })}
          aria-label="启用长期记忆"
        />
      </div>

      {/* ===== 模组多选 + 梦境整理（仅启用时展示） ===== */}
      {enabled && (
        <div className={styles.expand}>
          {/* 模组选择 */}
          <Field
            label="记忆模组"
            helper="选择 Agent 装配的长期记忆类型，至少选一个"
          >
            <div className={styles.moduleGrid}>
              {MODULE_META.map((m) => {
                const checked = modules.includes(m.type);
                return (
                  <label
                    key={m.type}
                    className={cx(
                      styles.moduleCard,
                      checked && styles.moduleCardChecked,
                    )}
                  >
                    <input
                      type="checkbox"
                      className={styles.moduleCheckbox}
                      checked={checked}
                      onChange={() => onToggleModule(m.type)}
                    />
                    <div className={styles.moduleBody}>
                      <span className={styles.moduleLabel}>{m.label}</span>
                      <span className={styles.moduleDesc}>{m.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </Field>

          {/* Embedding 模型选择 */}
          <div className={styles.embeddingRow}>
            <div className={styles.embeddingHead}>
              <Sparkles size={14} className={styles.embeddingIcon} />
              <span className={styles.embeddingTitle}>Embedding 模型</span>
            </div>
            <p className={styles.embeddingHint}>
              向量化模型用于记忆检索。复用 LLM Provider 的凭据与地址，但模型名独立配置——本地服务（如 LM Studio）需先 load 对应 embedding 模型。
            </p>
            <div className={styles.embeddingGrid}>
              <Field label="Provider">
                <Select
                  value={embedding.provider}
                  onChange={(e) =>
                    onUpdate({
                      embedding: { ...embedding, provider: e.target.value },
                    })
                  }
                >
                  {providers.length === 0 ? (
                    <option value="openai">openai</option>
                  ) : (
                    providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </Select>
              </Field>
              <Field
                label="模型名"
                helper="如 text-embedding-3-small / bge-m3 / nomic-embed-text"
              >
                <TextInput
                  value={embedding.model}
                  placeholder="text-embedding-3-small"
                  onChange={(e) =>
                    onUpdate({
                      embedding: { ...embedding, model: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {/* 梦境整理 */}
          <div className={styles.dreamRow}>
            <div className={styles.dreamHead}>
              <Moon size={14} className={styles.dreamIcon} />
              <span className={styles.dreamTitle}>梦境整理</span>
              <Toggle
                checked={consolidation.enabled}
                onChange={(c) =>
                  onUpdate({
                    consolidation: { ...consolidation, enabled: c },
                  })
                }
                aria-label="启用梦境整理"
              />
            </div>
            <p className={styles.dreamHint}>
              Agent 闲时自动整理记忆：提取 → 压缩 → 强化 → 遗忘。
            </p>
            {consolidation.enabled && (
              <div className={styles.dreamConfig}>
                <Field label="闲时触发（秒）" helper="多久无活动后触发梦境">
                  <TextInput
                    type="number"
                    min={60}
                    max={3600}
                    value={consolidation.idle_timeout_s}
                    onChange={(e) =>
                      onUpdate({
                        consolidation: {
                          ...consolidation,
                          idle_timeout_s: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoryConfig;
