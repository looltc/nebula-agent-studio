import styles from './Skeleton.module.css';
import { cx } from '@/lib/cx';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Fully rounded (pill) corners. */
  rounded?: boolean;
  className?: string;
}

function toSize(v: string | number | undefined, fallback: string): string | number {
  if (v === undefined || v === null) return fallback;
  return typeof v === 'number' ? `${v}px` : v;
}

/** Shimmering placeholder block. bg --bg-muted with a moving gradient sweep. */
export function Skeleton({
  width,
  height,
  rounded = false,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cx(styles.skeleton, rounded && styles.rounded, className)}
      style={{
        width: toSize(width, '100%'),
        height: toSize(height, '1em'),
      }}
      aria-hidden="true"
    />
  );
}
