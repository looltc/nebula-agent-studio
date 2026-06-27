import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  CircleHelp,
  X,
} from 'lucide-react';
import styles from './Toast.module.css';
import { cx } from '@/lib/cx';
import {
  useUIStore,
  type Toast,
  type ToastVariant,
} from '@/stores/uiStore';

const ICONS: Record<ToastVariant, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: CircleHelp,
};

interface ToastProps {
  toast: Toast;
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const Icon = ICONS[toast.variant];
  return (
    <div
      className={cx(styles.toast, styles[toast.variant])}
      role="status"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className={styles.content}>
        <div className={styles.title}>{toast.title}</div>
        {toast.description && (
          <div className={styles.description}>{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  className?: string;
}

/**
 * Fixed top-right toast stack (z-index 2000). Reads toasts from the uiStore
 * and renders each via a portal to document.body. Auto-dismiss is handled by
 * the store; this component only renders and offers a manual close button.
 */
export function ToastContainer({ className }: ToastContainerProps) {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className={cx(styles.container, className)} role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>,
    document.body,
  );
}

export interface ToastHelpers {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

/**
 * Convenience hook returning success/error/warning/info helpers that push
 * toasts into the uiStore. The store handles auto-dismiss (success/info after
 * 5s; error/warning persist until dismissed).
 */
export function useToast(): ToastHelpers {
  const addToast = useUIStore((s) => s.addToast);

  return useMemo(
    () => ({
      success: (title, description) =>
        addToast({ variant: 'success', title, description }),
      error: (title, description) =>
        addToast({ variant: 'error', title, description }),
      warning: (title, description) =>
        addToast({ variant: 'warning', title, description }),
      info: (title, description) =>
        addToast({ variant: 'info', title, description }),
    }),
    [addToast],
  );
}

// Exposed for callers that want to construct a toast payload directly.
export type { Toast, ToastVariant };
