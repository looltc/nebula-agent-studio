import { useUIStore } from '@/stores/uiStore';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';
import styles from './ShortcutHelp.module.css';

const SHORTCUTS: Array<{ keys: string; desc: string }> = [
  { keys: '1 – 5', desc: 'Switch between Chat / Agents / Orchestration / Observe / Settings' },
  { keys: 'Ctrl/⌘ + K', desc: 'Open global search' },
  { keys: 'Ctrl/⌘ + ,', desc: 'Open Settings' },
  { keys: 'Ctrl/⌘ + /', desc: 'Toggle this shortcuts panel' },
  { keys: 'Esc', desc: 'Close modal / tooltip / side panel' },
  { keys: 'Enter', desc: 'Send message (in chat input)' },
  { keys: 'Shift + Enter', desc: 'New line (in chat input)' },
  { keys: 'Ctrl/⌘ + N', desc: 'New conversation' },
  { keys: '↑', desc: 'Edit last message (empty input)' },
];

export default function ShortcutHelp() {
  const open = useUIStore((s) => s.helpOpen);
  const setOpen = useUIStore((s) => s.setHelpOpen);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <Keyboard size={20} />
            <h2 className={styles.title}>Keyboard Shortcuts</h2>
          </div>
          <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <ul className={styles.list}>
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className={styles.row}>
              <kbd className={styles.key}>{s.keys}</kbd>
              <span className={styles.desc}>{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
