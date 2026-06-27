import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type { AgentSummary, ToolInfo } from '@/types/api';

export type ThinkingModel = 'react' | 'plan_execute';

export interface AgentFormState {
  id: string;
  name: string;
  role: string;
  persona: string;
  thinkingModel: ThinkingModel;
  provider: string;
  model: string;
  temperature: number;
  maxIterations: number;
  maxMessages: number;
  systemPrompt: string;
  goals: string[];
  constraints: string[];
}

export interface AgentState {
  agents: AgentSummary[];
  loading: boolean;
  currentAgent: AgentSummary | null;
  tools: ToolInfo[];
  selectedToolIds: string[];
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  form: AgentFormState;
  errors: Record<string, string>;

  loadAgents: () => Promise<void>;
  loadTools: () => Promise<void>;
  selectAgent: (id: string) => void;
  updateForm: (partial: Partial<AgentFormState>) => void;
  toggleTool: (name: string) => void;
  addGoal: () => void;
  addConstraint: () => void;
  updateGoal: (index: number, value: string) => void;
  updateConstraint: (index: number, value: string) => void;
  removeGoal: (index: number) => void;
  removeConstraint: (index: number) => void;
  validate: () => boolean;
  createAgent: () => Promise<boolean>;
  resetForm: () => void;
  duplicateAgent: (id: string) => void;
}

function defaultForm(): AgentFormState {
  return {
    id: '',
    name: '',
    role: 'assistant',
    persona: '',
    thinkingModel: 'react',
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxIterations: 5,
    maxMessages: 50,
    systemPrompt: '',
    goals: [],
    constraints: [],
  };
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  currentAgent: null,
  tools: [],
  selectedToolIds: [],
  createOpen: false,
  setCreateOpen: (open) => set({ createOpen: open }),
  form: defaultForm(),
  errors: {},

  loadAgents: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.listAgents();
      set({ agents: res.agents });
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      set({ loading: false });
    }
  },

  loadTools: async () => {
    try {
      const res = await apiClient.listTools();
      set({ tools: res.tools });
    } catch (e) {
      console.error('Failed to load tools:', e);
    }
  },

  selectAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id) ?? null;
    set({ currentAgent: agent });
  },

  updateForm: (partial) => {
    set((s) => ({ form: { ...s.form, ...partial } }));
  },

  toggleTool: (name) => {
    set((s) => {
      const has = s.selectedToolIds.includes(name);
      return {
        selectedToolIds: has
          ? s.selectedToolIds.filter((t) => t !== name)
          : [...s.selectedToolIds, name],
      };
    });
  },

  addGoal: () => {
    set((s) => ({ form: { ...s.form, goals: [...s.form.goals, ''] } }));
  },

  addConstraint: () => {
    set((s) => ({ form: { ...s.form, constraints: [...s.form.constraints, ''] } }));
  },

  updateGoal: (index, value) => {
    set((s) => {
      const goals = [...s.form.goals];
      if (index >= 0 && index < goals.length) {
        goals[index] = value;
      }
      return { form: { ...s.form, goals } };
    });
  },

  updateConstraint: (index, value) => {
    set((s) => {
      const constraints = [...s.form.constraints];
      if (index >= 0 && index < constraints.length) {
        constraints[index] = value;
      }
      return { form: { ...s.form, constraints } };
    });
  },

  removeGoal: (index) => {
    set((s) => ({
      form: { ...s.form, goals: s.form.goals.filter((_, i) => i !== index) },
    }));
  },

  removeConstraint: (index) => {
    set((s) => ({
      form: {
        ...s.form,
        constraints: s.form.constraints.filter((_, i) => i !== index),
      },
    }));
  },

  validate: () => {
    const { form, agents } = get();
    const errors: Record<string, string> = {};

    if (!form.id) {
      errors.id = 'ID is required';
    } else if (!/^[a-z0-9-]+$/.test(form.id)) {
      errors.id = 'ID must be lowercase alphanumeric with dashes';
    } else if (agents.some((a) => a.id === form.id)) {
      errors.id = 'ID already exists';
    }

    if (!form.name) errors.name = 'Name is required';
    if (!form.role) errors.role = 'Role is required';

    if (form.temperature < 0 || form.temperature > 2) {
      errors.temperature = 'Temperature must be between 0 and 2';
    }
    if (form.maxIterations < 1 || form.maxIterations > 50) {
      errors.maxIterations = 'Max iterations must be between 1 and 50';
    }
    if (form.maxMessages < 1 || form.maxMessages > 200) {
      errors.maxMessages = 'Max messages must be between 1 and 200';
    }
    if (form.systemPrompt.length > 4096) {
      errors.systemPrompt = 'System prompt must be 4096 characters or less';
    }

    set({ errors });
    return Object.keys(errors).length === 0;
  },

  createAgent: async () => {
    const valid = get().validate();
    if (!valid) return false;
    const { form } = get();
    try {
      await apiClient.createAgent({
        id: form.id,
        name: form.name,
        role: form.role,
        persona: form.persona,
        thinking_model: form.thinkingModel,
      });
      await get().loadAgents();
      set({ createOpen: false });
      get().resetForm();
      return true;
    } catch (e) {
      set((s) => ({
        errors: { ...s.errors, form: e instanceof Error ? e.message : String(e) },
      }));
      return false;
    }
  },

  resetForm: () => {
    set({ form: defaultForm(), errors: {}, selectedToolIds: [] });
  },

  duplicateAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent) return;
    set({
      form: {
        ...defaultForm(),
        id: `${id}-copy`,
        name: agent.name,
        role: agent.role,
      },
      createOpen: true,
      errors: {},
    });
  },
}));

export default useAgentStore;
