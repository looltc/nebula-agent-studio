import { Radio, Toggle, Field, TextInput } from '@/components/ui';
import type { ThinkingModel } from '@/stores/agentStore';
import { cx } from '@/lib/cx';
import styles from './ThinkingModelConfig.module.css';

export interface ThinkingModelChange {
  thinkingModel?: ThinkingModel;
  maxIterations?: number;
  enableFactExtraction?: boolean;
  enableStepEvaluate?: boolean;
}

export interface ThinkingModelConfigProps {
  value: ThinkingModel;
  maxIterations: number;
  enableFactExtraction: boolean;
  enableStepEvaluate: boolean;
  onChange: (partial: ThinkingModelChange) => void;
}

interface Option {
  value: ThinkingModel;
  label: string;
  description: string;
}

const OPTIONS: Option[] = [
  {
    value: 'react',
    label: 'ReAct',
    description: 'Think → Act → Observe loop',
  },
  {
    value: 'plan_execute',
    label: 'Plan-and-Execute',
    description: 'Plan then execute step by step',
  },
  {
    value: 'reflexion',
    label: 'Reflexion',
    description: 'Act → Evaluate → Reflect loop',
  },
  {
    value: 'rewoo',
    label: 'ReWOO',
    description: 'Plan once → Execute tools only → Solve (least LLM calls)',
  },
];

/**
 * Thinking model selector with an iterations input.
 * When Plan-and-Execute is selected, shows two optimization toggles.
 */
export function ThinkingModelConfig({
  value,
  maxIterations,
  enableFactExtraction,
  enableStepEvaluate,
  onChange,
}: ThinkingModelConfigProps) {
  const isPlanExecute = value === 'plan_execute';
  return (
    <div className={styles.wrap}>
      <div className={styles.options} role="radiogroup" aria-label="Thinking model">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cx(styles.option, selected && styles.selected)}
            >
              <Radio
                checked={selected}
                onChange={() => onChange({ thinkingModel: opt.value })}
                name="thinking-model"
                value={opt.value}
              />
              <div className={styles.optionBody}>
                <span className={styles.optionLabel}>{opt.label}</span>
                <p className={styles.optionDesc}>{opt.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      <Field
        label="Max Iterations"
        helper="Reasoning steps allowed before giving up (1–50)"
        className={styles.iterField}
      >
        <TextInput
          type="number"
          min={1}
          max={50}
          value={maxIterations}
          onChange={(e) =>
            onChange({ maxIterations: Number(e.target.value) })
          }
        />
      </Field>

      {isPlanExecute && (
        <div className={styles.toggles}>
          <label className={styles.toggleRow}>
            <div className={styles.toggleBody}>
              <span className={styles.toggleLabel}>事实提取</span>
              <p className={styles.toggleDesc}>
                每步 execute 后用 LLM 提取已确认事实（默认关，省 1 次 LLM/步）
              </p>
            </div>
            <Toggle
              checked={enableFactExtraction}
              onChange={(v) => onChange({ enableFactExtraction: v })}
              aria-label="Enable fact extraction"
            />
          </label>
          <label className={styles.toggleRow}>
            <div className={styles.toggleBody}>
              <span className={styles.toggleLabel}>步骤评估</span>
              <p className={styles.toggleDesc}>
                每步 execute 后用 LLM 评估结果质量（默认关，省 1 次 LLM/步）
              </p>
            </div>
            <Toggle
              checked={enableStepEvaluate}
              onChange={(v) => onChange({ enableStepEvaluate: v })}
              aria-label="Enable step evaluate"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default ThinkingModelConfig;
