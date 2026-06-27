import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';

const TAB_ROUTES: Record<string, string> = {
  '1': '/chat',
  '2': '/agents',
  '3': '/orchestration',
  '4': '/observe',
  '5': '/settings',
};

/**
 * Registers global keyboard shortcuts.
 * - 1-5: switch tabs
 * - Ctrl/Cmd+K: global search (dispatches custom event 'nebula:global-search')
 * - Ctrl/Cmd+,: settings
 * - Ctrl/Cmd+/: toggle shortcuts help panel
 * - Esc: close help panel (and dispatch 'nebula:escape' for modals)
 */
export function useKeyboard(): void {
  const toggleHelp = useUIStore((s) => s.toggleHelp);
  const setHelpOpen = useUIStore((s) => s.setHelpOpen);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Esc
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('nebula:escape'));
        setHelpOpen(false);
        return;
      }

      // Cmd/Ctrl combos
      if (mod) {
        if (e.key === '/') {
          e.preventDefault();
          toggleHelp();
        } else if (e.key === ',') {
          e.preventDefault();
          navigate('/settings');
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('nebula:global-search'));
        }
        return;
      }

      // Number keys 1-5 (only when not typing in an input)
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) return;

      if (TAB_ROUTES[e.key]) {
        e.preventDefault();
        navigate(TAB_ROUTES[e.key]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleHelp, setHelpOpen, navigate]);
}

/** Subscribes to 'nebula:escape' custom events and calls the handler. */
export function useEscape(handler: () => void): void {
  useEffect(() => {
    const onEsc = () => handler();
    window.addEventListener('nebula:escape', onEsc);
    return () => window.removeEventListener('nebula:escape', onEsc);
  }, [handler]);
}

export default useKeyboard;
