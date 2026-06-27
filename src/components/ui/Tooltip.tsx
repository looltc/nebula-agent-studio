import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Tooltip.module.css';
import { cx } from '@/lib/cx';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  /** Show delay in ms. Defaults to 300. */
  delay?: number;
  className?: string;
}

/** Lightweight tooltip shown on hover after a delay. */
export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 300,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clear();
    timer.current = window.setTimeout(() => setVisible(true), delay);
  }, [delay, clear]);

  const hide = useCallback(() => {
    clear();
    setVisible(false);
  }, [clear]);

  return (
    <span
      className={cx(styles.wrapper, className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cx(styles.tooltip, styles[placement])}
        >
          {content}
        </span>
      )}
    </span>
  );
}
