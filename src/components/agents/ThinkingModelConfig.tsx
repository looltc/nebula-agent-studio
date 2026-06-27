import { Radio, Field, TextInput } from '@/components/ui';
import type { ThinkingModel } from '@/stores/agentStore';
import { cx } from '@/lib/cx';
import styles from './ThinkingModelConfig.module.css';

export interface ThinkingModelChange {
  thinkingModel?: ThinkingModel;
  maxIterations?: number;
}

export interface ThinkingModelConfigProps {
  value: ThinkingModel;
  maxIterations: number;
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
    description: 'Think \u2192 Act \u2192 Observe loop',
  },
  {
    value: 'plan_execute',
    label: 'Plan-and-Execute',
    description: 'Plan then execute step by step',
  },
];

/**
 * Thinking model selector (ReAct / Plan-and-Execute) with an iterations input.
 * Used inside the agent create/edit modal.
 */
export function ThinkingModelConfig({
  value,
  maxIterations,
  onChange,
}: ThinkingModelConfigProps) {
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
    </div>
  );
}

export default ThinkingModelConfig;
