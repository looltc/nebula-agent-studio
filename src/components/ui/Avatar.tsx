import styles from './Avatar.module.css';
import { cx } from '@/lib/cx';
import { StatusDot } from './StatusDot';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show an "online" status dot in the bottom-right corner. */
  online?: boolean;
  className?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  sm: 24,
  md: 36,
  lg: 48,
};

const FONT_SIZE_PX: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: '10px',
  md: '14px',
  lg: '18px',
};

const DOT_SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  sm: 6,
  md: 8,
  lg: 8,
};

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.charAt(0);
  return parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0);
}

/** Circular gradient avatar with uppercase initials and optional online dot. */
export function Avatar({
  name,
  size = 'md',
  online = false,
  className,
}: AvatarProps) {
  const px = SIZE_PX[size];
  return (
    <span
      className={cx(styles.avatar, className)}
      style={{
        width: px,
        height: px,
        fontSize: FONT_SIZE_PX[size],
      }}
      role="img"
      aria-label={name}
      title={name}
    >
      <span className={styles.initials}>{initialsOf(name).toUpperCase()}</span>
      {online && (
        <span className={styles.online}>
          <StatusDot status="active" size={DOT_SIZE_PX[size]} />
        </span>
      )}
    </span>
  );
}
