import { forwardRef, useId, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './Input.module.css';
import { cx } from '@/lib/cx';

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
  ({ error = false, icon, className, ...rest }, ref) => {
    if (icon) {
      return (
        <div className={cx(styles.inputWrap, className)}>
          <span className={styles.inputIcon} aria-hidden="true">
            {icon}
          </span>
          <input
            ref={ref}
            className={cx(styles.input, styles.inputWithIcon, error && styles.error)}
            {...rest}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cx(styles.input, error && styles.error, className)}
        {...rest}
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
  ({ error = false, className, rows = 3, ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cx(styles.input, styles.textarea, error && styles.error, className)}
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
