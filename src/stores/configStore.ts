import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type { ToolInfo } from '@/types/api';

export interface Budget {
  dailyCap: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface ConfigState {
  providers: string[];
  models: string[];
  tools: ToolInfo[];
  budget: Budget;
  loading: boolean;

  loadTools: () => Promise<void>;
  setBudget: (partial: Partial<Budget>) => void;
  addProvider: (name: string) => void;
  addModel: (name: string) => void;
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

function initialBudget(): Budget {
  const stored = readLS('budget');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<Budget>;
      return {
        dailyCap: typeof parsed.dailyCap === 'number' ? parsed.dailyCap : 50,
        warningThreshold:
          typeof parsed.warningThreshold === 'number' ? parsed.warningThreshold : 0.8,
        criticalThreshold:
          typeof parsed.criticalThreshold === 'number' ? parsed.criticalThreshold : 0.9,
      };
    } catch {
      /* fall through to defaults */
    }
  }
  return { dailyCap: 50, warningThreshold: 0.8, criticalThreshold: 0.9 };
}

export const useConfigStore = create<ConfigState>((set) => ({
  providers: ['openai'],
  models: ['gpt-4o-mini', 'gpt-4o'],
  tools: [],
  budget: initialBudget(),
  loading: false,

  loadTools: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.listTools();
      set({ tools: res.tools });
    } catch (e) {
      console.error('Failed to load tools:', e);
    } finally {
      set({ loading: false });
    }
  },

  setBudget: (partial) => {
    set((s) => {
      const budget = { ...s.budget, ...partial };
      writeLS('budget', JSON.stringify(budget));
      return { budget };
    });
  },

  addProvider: (name) => {
    const n = name.trim();
    if (!n) return;
    set((s) => ({
      providers: s.providers.includes(n) ? s.providers : [...s.providers, n],
    }));
  },

  addModel: (name) => {
    const n = name.trim();
    if (!n) return;
    set((s) => ({
      models: s.models.includes(n) ? s.models : [...s.models, n],
    }));
  },
}));

export default useConfigStore;
