import { forwardRef } from 'react';
import styles from './Spinner.module.css';
import { cx } from '@/lib/cx';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX: Record<NonNullable<SpinnerProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

/** Bordered circle that spins 1s linear infinite. Color: --accent-primary. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = 'md', className }, ref) => {
    const px = SIZE_PX[size];
    return (
      <span
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cx(styles.spinner, styles[size], className)}
        style={{ width: px, height: px }}
      />
    );
  },
);
Spinner.displayName = 'Spinner';
