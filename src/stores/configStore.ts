import { create } from 'zustand';
import { apiClient } from '@/services/api';
<<<<<<< HEAD
import type { ToolInfo } from '@/types/api';
=======
import type {
  ProviderSummary,
  ProviderCreateRequest,
  ProviderTestResponse,
  ToolInfo,
} from '@/types/api';
>>>>>>> feat-implement-frontend-design-GH23Da

export interface Budget {
  dailyCap: number;
  warningThreshold: number;
  criticalThreshold: number;
}

<<<<<<< HEAD
export interface ConfigState {
  providers: string[];
  models: string[];
=======
export interface ProviderFormState {
  id: string | null; // null = new
  name: string;
  base_url: string;
  api_key: string;
  models: string[];
  testing: boolean;
  testResult: ProviderTestResponse | null;
}

export interface ConfigState {
  providers: ProviderSummary[];
  providerModels: Record<string, string[]>;
>>>>>>> feat-implement-frontend-design-GH23Da
  tools: ToolInfo[];
  budget: Budget;
  loading: boolean;

<<<<<<< HEAD
  loadTools: () => Promise<void>;
  setBudget: (partial: Partial<Budget>) => void;
  addProvider: (name: string) => void;
  addModel: (name: string) => void;
=======
  loadProviders: () => Promise<void>;
  createProvider: (body: ProviderCreateRequest) => Promise<boolean>;
  updateProvider: (id: string, body: ProviderCreateRequest) => Promise<boolean>;
  deleteProvider: (id: string) => Promise<boolean>;
  testProvider: (id: string) => Promise<ProviderTestResponse>;
  loadProviderModels: (id: string) => Promise<string[]>;

  loadTools: () => Promise<void>;
  setBudget: (partial: Partial<Budget>) => void;
>>>>>>> feat-implement-frontend-design-GH23Da
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

<<<<<<< HEAD
export const useConfigStore = create<ConfigState>((set) => ({
  providers: ['openai'],
  models: ['gpt-4o-mini', 'gpt-4o'],
=======
export const useConfigStore = create<ConfigState>((set, get) => ({
  providers: [],
  providerModels: {},
>>>>>>> feat-implement-frontend-design-GH23Da
  tools: [],
  budget: initialBudget(),
  loading: false,

<<<<<<< HEAD
=======
  loadProviders: async () => {
    try {
      const res = await apiClient.listProviders();
      set({ providers: res.providers });
    } catch (e) {
      console.error('Failed to load providers:', e);
    }
  },

  createProvider: async (body) => {
    try {
      await apiClient.createProvider(body);
      await get().loadProviders();
      return true;
    } catch (e) {
      console.error('Failed to create provider:', e);
      return false;
    }
  },

  updateProvider: async (id, body) => {
    try {
      await apiClient.updateProvider(id, body);
      await get().loadProviders();
      return true;
    } catch (e) {
      console.error('Failed to update provider:', e);
      return false;
    }
  },

  deleteProvider: async (id) => {
    try {
      await apiClient.deleteProvider(id);
      await get().loadProviders();
      return true;
    } catch (e) {
      console.error('Failed to delete provider:', e);
      return false;
    }
  },

  testProvider: async (id) => {
    try {
      const res = await apiClient.testProvider(id);
      if (res.status === 'ok' && res.models) {
        set((s) => ({
          providerModels: { ...s.providerModels, [id]: res.models ?? [] },
        }));
      }
      return res;
    } catch (e) {
      console.error('Failed to test provider:', e);
      return { status: 'error' as const, error: e instanceof Error ? e.message : String(e) };
    }
  },

  loadProviderModels: async (id) => {
    try {
      const res = await apiClient.listProviderModels(id);
      set((s) => ({
        providerModels: { ...s.providerModels, [id]: res.models },
      }));
      return res.models;
    } catch (e) {
      console.error('Failed to load provider models:', e);
      return [];
    }
  },

>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD

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
=======
>>>>>>> feat-implement-frontend-design-GH23Da
}));

export default useConfigStore;
