import { create } from 'zustand';
import type { ConnectionState } from '@/services/ws';

export type Theme = 'dark' | 'light';
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

export interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** 折叠态下是否仍在 chat 项下方展示 Agent 头像竖排。 */
  sidebarCollapsedShowAgents: boolean;
  setSidebarCollapsedShowAgents: (show: boolean) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  toasts: Toast[];
  addToast: (input: { variant: ToastVariant; title: string; description?: string }) => void;
  removeToast: (id: string) => void;

  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  toggleHelp: () => void;

  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
}

const MAX_TOASTS = 5;

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return Date.now().toString() + Math.random();
}

function readLS(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

function initialTheme(): Theme {
  const stored = readLS('theme');
  const theme: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
  applyTheme(theme);
  return theme;
}

function initialSidebar(): boolean {
  return readLS('sidebar') === 'true';
}

function initialSidebarCollapsedShowAgents(): boolean {
  // 默认 true（保持既有行为）；仅在显式存储为 'false' 时关闭。
  return readLS('sidebarCollapsedShowAgents') !== 'false';
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme(),

  setTheme: (theme) => {
    applyTheme(theme);
    writeLS('theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  sidebarCollapsed: initialSidebar(),

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    writeLS('sidebar', String(next));
    set({ sidebarCollapsed: next });
  },

  setSidebarCollapsed: (collapsed) => {
    writeLS('sidebar', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },

  sidebarCollapsedShowAgents: initialSidebarCollapsedShowAgents(),

  setSidebarCollapsedShowAgents: (show) => {
    writeLS('sidebarCollapsedShowAgents', String(show));
    set({ sidebarCollapsedShowAgents: show });
  },

  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),

  toasts: [],

  addToast: (input) => {
    const id = genId();
    const toast: Toast = { id, ...input };
    set((state) => {
      const next = [...state.toasts, toast];
      if (next.length > MAX_TOASTS) {
        next.splice(0, next.length - MAX_TOASTS);
      }
      return { toasts: next };
    });
    if (input.variant === 'success' || input.variant === 'info') {
      setTimeout(() => {
        get().removeToast(id);
      }, 5000);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
  toggleHelp: () => set((state) => ({ helpOpen: !state.helpOpen })),

  connectionState: 'disconnected',
  setConnectionState: (state) => set({ connectionState: state }),
}));

export default useUIStore;
