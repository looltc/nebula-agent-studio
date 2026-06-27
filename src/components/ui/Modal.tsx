import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';
import { cx } from '@/lib/cx';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Visual cue: title in destructive color (call site should use a Danger button). */
  danger?: boolean;
  /** Dismiss on overlay click. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Dismiss on Esc. Defaults to true. */
  closeOnEsc?: boolean;
  className?: string;
}

const EXIT_MS = 150;

/**
 * Modal dialog rendered via a portal to document.body.
 * Enter: opacity 0->1 + translateY(8px->0), 200ms ease-out.
 * Exit:  reverse, 150ms ease-in. Locks body scroll while mounted.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  danger = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount/unmount with exit animation window.
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Trigger enter on next frame so the enter animation runs.
      const raf = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(raf);
    }
    setActive(false);
    if (!mounted) return;
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  // Esc to close.
  useEffect(() => {
    if (!mounted) return;
    if (!closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, closeOnEsc]);

  // Lock body scroll while mounted.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const handleOverlay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!closeOnOverlayClick) return;
      if (e.target === e.currentTarget) onCloseRef.current();
    },
    [closeOnOverlayClick],
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className={cx(styles.overlay, active && styles.overlayActive)}
      onMouseDown={handleOverlay}
    >
      <div
        className={cx(
          styles.modal,
          styles[size],
          active && styles.modalActive,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby="modal-body"
      >
        <div className={styles.header}>
          {title && (
            <h2
              id="modal-title"
              className={cx(styles.title, danger && styles.titleDanger)}
            >
              {title}
            </h2>
          )}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => onClose()}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div id="modal-body" className={styles.body}>
          {children}
        </div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
