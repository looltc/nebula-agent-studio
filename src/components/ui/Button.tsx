import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import styles from './Button.module.css';
import { cx } from '@/lib/cx';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Button. Sizes sm/md/lg, variants primary/secondary/ghost/danger/outline.
 * Loading state shows a sm Spinner on the left with the label faded to 0.5.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      disabled,
      fullWidth = false,
      type = 'button',
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          styles.button,
          styles[size],
          styles[variant],
          fullWidth && styles.fullWidth,
          loading && styles.loading,
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && <Spinner size="sm" className={styles.spinner} />}
        {!loading && icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {children !== undefined && children !== null ? (
          <span className={cx(styles.label, loading && styles.labelLoading)}>
            {children}
          </span>
        ) : null}
        {!loading && iconRight ? (
          <span className={styles.iconRight} aria-hidden="true">
            {iconRight}
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = 'Button';
