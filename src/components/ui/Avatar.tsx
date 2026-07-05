import { useEffect, useState } from 'react';
import styles from './Avatar.module.css';
import { cx } from '@/lib/cx';
import { StatusDot } from './StatusDot';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show an "online" status dot in the bottom-right corner. */
  online?: boolean;
  /** Optional image source (e.g. "/avatars/cat.svg"). When provided the image
   *  fills the circular frame and the initials fallback is hidden. */
  src?: string | null;
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

/** Circular avatar with optional image, fallback to uppercase initials.
 *  当 src 为空、加载失败时自动回退到首字母。 */
export function Avatar({
  name,
  size = 'md',
  online = false,
  src,
  className,
}: AvatarProps) {
  const px = SIZE_PX[size];
  // imgError：一旦图片加载失败就切回首字母；src 变化时重置
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const showImg = src && !imgError;

  return (
    <span
      className={cx(styles.avatar, showImg && styles.hasImage, className)}
      style={{
        width: px,
        height: px,
        fontSize: FONT_SIZE_PX[size],
      }}
      role="img"
      aria-label={name}
      title={name}
    >
      {showImg ? (
        <img
          src={src}
          alt={name}
          className={styles.image}
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={styles.initials}>{initialsOf(name).toUpperCase()}</span>
      )}
      {online && (
        <span className={styles.online}>
          <StatusDot status="active" size={DOT_SIZE_PX[size]} />
        </span>
      )}
    </span>
  );
}
