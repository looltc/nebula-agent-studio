import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './Input.module.css';
import { cx } from '@/lib/cx';

/* ================================================================== */
/* IME 组合事件保护                                                     */
/* ================================================================== */

/**
 * 受控 input + 中文 IME 的经典坑：组合过程中父组件若重渲染，
 * React 会用 store 里的旧 value 把 DOM 里正在组合的拼音覆盖掉，
 * 表现为"输入拼音把之前的内容删了"。
 *
 * 方案：组合期间切换为非受控（不传 value 让 DOM 自管），
 * compositionend 时再用 DOM 当前值同步回 store。
 *
 * - isComposingRef：标记组合中状态（仅用于跳过 onChange，不阻塞渲染）
 * - 调用方传入的 value 在组合期间被忽略，组合结束自动恢复受控
 */
function useIMEControlled<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const isComposingRef = useRef(false);
  // compositionend 后下一帧再恢复受控，避免 React 在同一次渲染里用旧值覆盖
  const [composing, setComposing] = useState(false);

  const onCompositionStart = () => {
    isComposingRef.current = true;
    setComposing(true);
  };

  const onCompositionEnd = (
    e: React.CompositionEvent<T>,
    onChange?: (e: ChangeEvent<T>) => void,
  ) => {
    isComposingRef.current = false;
    // 用 DOM 当前值手动触发 onChange，把组合结果同步到 store
    if (onChange) {
      const el = e.currentTarget;
      const synthetic = {
        target: el,
        currentTarget: el,
        nativeEvent: e.nativeEvent,
      } as unknown as ChangeEvent<T>;
      onChange(synthetic);
    }
    // 下一帧恢复受控模式，确保上面的 onChange 已经把 store 更新到最新值
    requestAnimationFrame(() => setComposing(false));
  };

  const wrapOnChange = (onChange?: (e: ChangeEvent<T>) => void) => {
    if (!onChange) return undefined;
    return (e: ChangeEvent<T>) => {
      if (isComposingRef.current) return; // 组合中，跳过
      onChange(e);
    };
  };

  return { composing, onCompositionStart, onCompositionEnd, wrapOnChange };
}

/* ================================================================== */
/* TextInput                                                           */
/* ================================================================== */

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Renders a red destructive border. */
  error?: boolean;
  /** Optional leading icon node. */
  icon?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error = false, icon, className, onChange, value, ...rest }, ref) => {
    const ime = useIMEControlled<HTMLInputElement>();
    // 组合期间不传 value，让 DOM 自管，避免 React 用旧 store 值覆盖正在输入的拼音
    const inputProps = {
      ...rest,
      value: ime.composing ? undefined : value,
      onChange: ime.wrapOnChange(onChange),
      onCompositionStart: ime.onCompositionStart,
      onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => ime.onCompositionEnd(e, onChange),
    };

    if (icon) {
      return (
        <div className={cx(styles.inputWrap, className)}>
          <span className={styles.inputIcon} aria-hidden="true">
            {icon}
          </span>
          <input
            ref={ref}
            className={cx(styles.input, styles.inputWithIcon, error && styles.error)}
            {...inputProps}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cx(styles.input, error && styles.error, className)}
        {...inputProps}
      />
    );
  },
);
TextInput.displayName = 'TextInput';

/* ================================================================== */
/* Select                                                              */
/* ================================================================== */

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, className, children, ...rest }, ref) => {
    return (
      <div className={cx(styles.selectWrap, className)}>
        <select
          ref={ref}
          className={cx(styles.input, styles.select, error && styles.error)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </div>
    );
  },
);
Select.displayName = 'Select';

/* ================================================================== */
/* TextArea                                                            */
/* ================================================================== */

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error = false, className, rows = 3, onChange, value, ...rest }, ref) => {
    const ime = useIMEControlled<HTMLTextAreaElement>();
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cx(styles.input, styles.textarea, error && styles.error, className)}
        value={ime.composing ? undefined : value}
        onChange={ime.wrapOnChange(onChange)}
        onCompositionStart={ime.onCompositionStart}
        onCompositionEnd={(e) => ime.onCompositionEnd(e, onChange)}
        {...rest}
      />
    );
  },
);
TextArea.displayName = 'TextArea';

/* ================================================================== */
/* Toggle                                                              */
/* ================================================================== */

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/** 44x24 on/off switch. On = --accent-primary with slider right. */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
}: ToggleProps) {
  const autoId = useId();
  const toggleId = id ?? autoId;
  return (
    <button
      type="button"
      role="switch"
      id={toggleId}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx(styles.toggle, checked && styles.toggleOn, className)}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

/* ================================================================== */
/* Checkbox                                                            */
/* ================================================================== */

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  id?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  className,
}: CheckboxProps) {
  const autoId = useId();
  const boxId = id ?? autoId;
  return (
    <label className={cx(styles.choice, disabled && styles.choiceDisabled, className)}>
      <input
        type="checkbox"
        id={boxId}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.choiceInput}
      />
      <span className={cx(styles.checkbox, checked && styles.checkboxChecked)}>
        {checked && <Check size={12} className={styles.checkIcon} />}
      </span>
      {label !== undefined && <span className={styles.choiceLabel}>{label}</span>}
    </label>
  );
}

/* ================================================================== */
/* Radio                                                               */
/* ================================================================== */

export interface RadioProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  value?: string;
  name?: string;
  id?: string;
  className?: string;
}

export function Radio({
  checked,
  onChange,
  disabled = false,
  label,
  value,
  name,
  id,
  className,
}: RadioProps) {
  const autoId = useId();
  const boxId = id ?? autoId;
  return (
    <label className={cx(styles.choice, disabled && styles.choiceDisabled, className)}>
      <input
        type="radio"
        id={boxId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(true)}
        className={styles.choiceInput}
      />
      <span className={cx(styles.radio, checked && styles.radioChecked)}>
        <span className={styles.radioDot} />
      </span>
      {label !== undefined && <span className={styles.choiceLabel}>{label}</span>}
    </label>
  );
}

/* ================================================================== */
/* Field wrapper                                                       */
/* ================================================================== */

export interface FieldProps {
  label?: string;
  helper?: string;
  /** If present, the field renders destructive styling + this message. */
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Field({
  label,
  helper,
  error,
  required = false,
  children,
  className,
  htmlFor,
}: FieldProps) {
  const autoId = useId();
  const labelId = htmlFor ?? autoId;
  const showError = Boolean(error);
  return (
    <div className={cx(styles.field, className)}>
      {label !== undefined && (
        <label className={styles.fieldLabel} htmlFor={labelId}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {showError ? (
        <div className={cx(styles.fieldText, styles.fieldError)} role="alert">
          {error}
        </div>
      ) : helper ? (
        <div className={styles.fieldText}>{helper}</div>
      ) : null}
    </div>
  );
}
