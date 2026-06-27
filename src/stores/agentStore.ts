import { create } from 'zustand';
import { apiClient } from '@/services/api';
<<<<<<< HEAD
import type { AgentSummary, ToolInfo } from '@/types/api';
=======
import type {
  AgentCreateRequest,
  AgentDetailResponse,
  AgentSummary,
  AgentUpdateRequest,
  LLMSpecRequest,
  ToolInfo,
} from '@/types/api';
>>>>>>> feat-implement-frontend-design-GH23Da

export type ThinkingModel = 'react' | 'plan_execute';

export interface AgentFormState {
  id: string;
  name: string;
  role: string;
  persona: string;
  thinkingModel: ThinkingModel;
<<<<<<< HEAD
  provider: string;
  model: string;
  temperature: number;
=======
>>>>>>> feat-implement-frontend-design-GH23Da
  maxIterations: number;
  maxMessages: number;
  systemPrompt: string;
  goals: string[];
  constraints: string[];
<<<<<<< HEAD
=======
  tools: string[];
  provider: string;
  model: string;
  temperature: number;
  baseUrl: string;
  apiKey: string;
>>>>>>> feat-implement-frontend-design-GH23Da
}

export interface AgentState {
  agents: AgentSummary[];
  loading: boolean;
  currentAgent: AgentSummary | null;
<<<<<<< HEAD
  tools: ToolInfo[];
  selectedToolIds: string[];
  createOpen: boolean;
=======
  currentDetail: AgentDetailResponse | null;
  detailLoading: boolean;
  tools: ToolInfo[];
  selectedToolIds: string[];
  createOpen: boolean;
  editingId: string | null; // null = create mode, string = edit mode
>>>>>>> feat-implement-frontend-design-GH23Da
  setCreateOpen: (open: boolean) => void;
  form: AgentFormState;
  errors: Record<string, string>;

  loadAgents: () => Promise<void>;
  loadTools: () => Promise<void>;
  selectAgent: (id: string) => void;
<<<<<<< HEAD
=======
  loadAgentDetail: (id: string) => Promise<void>;
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
  resetForm: () => void;
  duplicateAgent: (id: string) => void;
=======
  updateAgent: (id: string) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  resetForm: () => void;
  duplicateAgent: (id: string) => void;
  startEdit: (id: string) => Promise<void>;
>>>>>>> feat-implement-frontend-design-GH23Da
}

function defaultForm(): AgentFormState {
  return {
    id: '',
    name: '',
    role: 'assistant',
    persona: '',
    thinkingModel: 'react',
<<<<<<< HEAD
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxIterations: 5,
=======
    maxIterations: 10,
>>>>>>> feat-implement-frontend-design-GH23Da
    maxMessages: 50,
    systemPrompt: '',
    goals: [],
    constraints: [],
<<<<<<< HEAD
=======
    tools: [],
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    baseUrl: '',
    apiKey: '',
  };
}

function buildLLMSpec(form: AgentFormState): LLMSpecRequest | null {
  return {
    provider: form.provider,
    model: form.model,
    temperature: form.temperature,
    base_url: form.baseUrl || null,
    api_key: form.apiKey || null,
  };
}

function buildCreateBody(form: AgentFormState): AgentCreateRequest {
  return {
    id: form.id,
    name: form.name,
    role: form.role,
    persona: form.persona,
    thinking_model: form.thinkingModel,
    max_iterations: form.maxIterations,
    max_messages: form.maxMessages,
    system_prompt: form.systemPrompt,
    goals: form.goals.filter((g) => g.trim()),
    constraints: form.constraints.filter((c) => c.trim()),
    tools: form.tools,
    llm: buildLLMSpec(form),
  };
}

function buildUpdateBody(form: AgentFormState): AgentUpdateRequest {
  return {
    name: form.name,
    role: form.role,
    persona: form.persona,
    thinking_model: form.thinkingModel,
    max_iterations: form.maxIterations,
    max_messages: form.maxMessages,
    system_prompt: form.systemPrompt,
    goals: form.goals.filter((g) => g.trim()),
    constraints: form.constraints.filter((c) => c.trim()),
    tools: form.tools,
    llm: buildLLMSpec(form),
>>>>>>> feat-implement-frontend-design-GH23Da
  };
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  currentAgent: null,
<<<<<<< HEAD
  tools: [],
  selectedToolIds: [],
  createOpen: false,
=======
  currentDetail: null,
  detailLoading: false,
  tools: [],
  selectedToolIds: [],
  createOpen: false,
  editingId: null,
>>>>>>> feat-implement-frontend-design-GH23Da
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

<<<<<<< HEAD
=======
  loadAgentDetail: async (id) => {
    set({ detailLoading: true });
    try {
      const detail = await apiClient.getAgent(id);
      set({ currentDetail: detail });
    } catch (e) {
      console.error('Failed to load agent detail:', e);
    } finally {
      set({ detailLoading: false });
    }
  },

>>>>>>> feat-implement-frontend-design-GH23Da
  updateForm: (partial) => {
    set((s) => ({ form: { ...s.form, ...partial } }));
  },

  toggleTool: (name) => {
    set((s) => {
      const has = s.selectedToolIds.includes(name);
<<<<<<< HEAD
      return {
        selectedToolIds: has
          ? s.selectedToolIds.filter((t) => t !== name)
          : [...s.selectedToolIds, name],
      };
=======
      const next = has
        ? s.selectedToolIds.filter((t) => t !== name)
        : [...s.selectedToolIds, name];
      return { selectedToolIds: next, form: { ...s.form, tools: next } };
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
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
=======
    const { form, agents, editingId } = get();
    const errors: Record<string, string> = {};

    // id only required for create mode
    if (!editingId) {
      if (!form.id) {
        errors.id = 'ID 不能为空';
      } else if (!/^[a-z0-9-]+$/.test(form.id)) {
        errors.id = 'ID 只能包含小写字母、数字和连字符';
      } else if (agents.some((a) => a.id === form.id)) {
        errors.id = 'ID 已存在';
      }
    }

    if (!form.name) errors.name = '名称不能为空';
    if (!form.role) errors.role = '角色不能为空';

    if (form.temperature < 0 || form.temperature > 2) {
      errors.temperature = 'Temperature 必须在 0 到 2 之间';
    }
    if (form.maxIterations < 1 || form.maxIterations > 50) {
      errors.maxIterations = '最大迭代次数必须在 1 到 50 之间';
    }
    if (form.maxMessages < 1 || form.maxMessages > 200) {
      errors.maxMessages = '最大消息数必须在 1 到 200 之间';
    }
    if (form.systemPrompt.length > 4096) {
      errors.systemPrompt = 'System Prompt 不能超过 4096 字符';
>>>>>>> feat-implement-frontend-design-GH23Da
    }

    set({ errors });
    return Object.keys(errors).length === 0;
  },

  createAgent: async () => {
    const valid = get().validate();
    if (!valid) return false;
    const { form } = get();
    try {
<<<<<<< HEAD
      await apiClient.createAgent({
        id: form.id,
        name: form.name,
        role: form.role,
        persona: form.persona,
        thinking_model: form.thinkingModel,
      });
=======
      await apiClient.createAgent(buildCreateBody(form));
>>>>>>> feat-implement-frontend-design-GH23Da
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

<<<<<<< HEAD
  resetForm: () => {
    set({ form: defaultForm(), errors: {}, selectedToolIds: [] });
=======
  updateAgent: async (id) => {
    const { form } = get();
    // For edit mode, skip id validation
    set({ editingId: id });
    const valid = get().validate();
    if (!valid) {
      set({ editingId: null });
      return false;
    }
    try {
      await apiClient.updateAgent(id, buildUpdateBody(form));
      await get().loadAgents();
      await get().loadAgentDetail(id);
      set({ createOpen: false, editingId: null });
      get().resetForm();
      return true;
    } catch (e) {
      set((s) => ({
        errors: { ...s.errors, form: e instanceof Error ? e.message : String(e) },
        editingId: null,
      }));
      return false;
    }
  },

  deleteAgent: async (id) => {
    try {
      await apiClient.deleteAgent(id);
      await get().loadAgents();
      return true;
    } catch (e) {
      console.error('Failed to delete agent:', e);
      return false;
    }
  },

  resetForm: () => {
    set({ form: defaultForm(), errors: {}, selectedToolIds: [], editingId: null });
>>>>>>> feat-implement-frontend-design-GH23Da
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
<<<<<<< HEAD
=======
      editingId: null,
    });
  },

  startEdit: async (id) => {
    set({ editingId: id, createOpen: true });
    await get().loadAgentDetail(id);
    const detail = get().currentDetail;
    if (!detail) return;
    set({
      form: {
        id: detail.id,
        name: detail.name,
        role: detail.role,
        persona: detail.persona,
        thinkingModel: (detail.thinking_model === 'plan_execute' ? 'plan_execute' : 'react'),
        maxIterations: detail.max_iterations,
        maxMessages: detail.max_messages,
        systemPrompt: detail.system_prompt,
        goals: detail.goals,
        constraints: detail.constraints,
        tools: detail.tools,
        provider: detail.llm.provider,
        model: detail.llm.model,
        temperature: detail.llm.temperature,
        baseUrl: detail.llm.base_url ?? '',
        apiKey: '',
      },
      selectedToolIds: detail.tools,
      errors: {},
>>>>>>> feat-implement-frontend-design-GH23Da
    });
  },
}));

export default useAgentStore;
