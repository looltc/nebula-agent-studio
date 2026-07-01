import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type {
  AgentCreateRequest,
  AgentDetailResponse,
  AgentSummary,
  AgentUpdateRequest,
  LLMSpecRequest,
  LongTermMemoryConfig,
  MemoryModuleType,
  SkillInfo,
  ToolInfo,
} from '@/types/api';

export type ThinkingModel = 'react' | 'plan_execute';

export interface AgentFormState {
  id: string;
  name: string;
  role: string;
  persona: string;
  thinkingModel: ThinkingModel;
  maxIterations: number;
  maxMessages: number;
  systemPrompt: string;
  goals: string[];
  constraints: string[];
  tools: string[];
  /** 绑定的 Skill 名称列表 */
  skills: string[];
  provider: string;
  model: string;
  temperature: number;
  /** 头像文件名（如 "cat.jpg"）；空字符串表示未选择 */
  avatar: string;
  /** L3 长期记忆配置 */
  longTerm: LongTermMemoryConfig;
}

export interface AgentState {
  agents: AgentSummary[];
  loading: boolean;
  currentAgent: AgentSummary | null;
  currentDetail: AgentDetailResponse | null;
  detailLoading: boolean;
  tools: ToolInfo[];
  selectedToolIds: string[];
  /** 已安装的 Skill 列表（供 Agent 配置选择） */
  skills: SkillInfo[];
  selectedSkillIds: string[];
  createOpen: boolean;
  editingId: string | null; // null = create mode, string = edit mode
  setCreateOpen: (open: boolean) => void;
  form: AgentFormState;
  errors: Record<string, string>;

  loadAgents: () => Promise<void>;
  loadTools: () => Promise<void>;
  loadSkills: () => Promise<void>;
  selectAgent: (id: string) => void;
  loadAgentDetail: (id: string) => Promise<void>;
  updateForm: (partial: Partial<AgentFormState>) => void;
  toggleTool: (name: string) => void;
  toggleSkill: (name: string) => void;
  toggleMemoryModule: (module: MemoryModuleType) => void;
  updateLongTerm: (partial: Partial<LongTermMemoryConfig>) => void;
  addGoal: () => void;
  addConstraint: () => void;
  updateGoal: (index: number, value: string) => void;
  updateConstraint: (index: number, value: string) => void;
  removeGoal: (index: number) => void;
  removeConstraint: (index: number) => void;
  validate: () => boolean;
  createAgent: () => Promise<boolean>;
  updateAgent: (id: string) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  resetForm: () => void;
  duplicateAgent: (id: string) => void;
  startEdit: (id: string) => Promise<void>;
}

function defaultForm(): AgentFormState {
  return {
    id: '',
    name: '',
    role: 'assistant',
    persona: '',
    thinkingModel: 'react',
    maxIterations: 10,
    maxMessages: 50,
    systemPrompt: '',
    goals: [],
    constraints: [],
    tools: [],
    skills: [],
    // Provider/Model must be explicitly chosen — no defaults, so the user is
    // forced to pick from configured providers instead of silently inheriting
    // an empty "openai" entry.
    provider: '',
    model: '',
    temperature: 0.7,
    // Avatar: empty = not chosen, UI will fallback to first-letter avatar.
    avatar: '',
    // L3 长期记忆默认关闭；启用后默认装配 semantic + episodic 模组
    longTerm: {
      enabled: false,
      modules: ['semantic', 'episodic'],
      consolidation: { enabled: false, idle_timeout_s: 300 },
      embedding: { provider: 'openai', model: 'text-embedding-3-small' },
    },
  };
}

function buildLLMSpec(form: AgentFormState): LLMSpecRequest | null {
  // base_url and api_key are intentionally omitted: the backend resolves them
  // from the provider config configured on the Settings page.
  return {
    provider: form.provider,
    model: form.model,
    temperature: form.temperature,
    base_url: null,
    api_key: null,
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
    avatar: form.avatar || null,
    skills: form.skills,
    memory: {
      max_messages: form.maxMessages,
      long_term: form.longTerm,
    },
  };
}

function buildUpdateBody(form: AgentFormState): AgentUpdateRequest {
  return {
    // Echo the id so the backend's AgentCreateRequest schema (which requires
    // id) passes Pydantic validation; the PUT handler overwrites it with the
    // path-param id anyway, so sending it is harmless and keeps PUT idempotent.
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
    avatar: form.avatar || null,
    skills: form.skills,
    memory: {
      max_messages: form.maxMessages,
      long_term: form.longTerm,
    },
  };
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  currentAgent: null,
  currentDetail: null,
  detailLoading: false,
  tools: [],
  selectedToolIds: [],
  skills: [],
  selectedSkillIds: [],
  createOpen: false,
  editingId: null,
  setCreateOpen: (open) => set({ createOpen: open }),
  form: defaultForm(),
  errors: {},

  loadAgents: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.listAgents();
      set({ agents: Array.isArray(res.agents) ? res.agents : [] });
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      set({ loading: false });
    }
  },

  loadTools: async () => {
    try {
      const res = await apiClient.listTools();
      set({ tools: Array.isArray(res.tools) ? res.tools : [] });
    } catch (e) {
      console.error('Failed to load tools:', e);
    }
  },

  loadSkills: async () => {
    try {
      const res = await apiClient.listSkills();
      set({ skills: Array.isArray(res.skills) ? res.skills : [] });
    } catch (e) {
      console.error('Failed to load skills:', e);
    }
  },

  selectAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id) ?? null;
    set({ currentAgent: agent });
  },

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

  updateForm: (partial) => {
    set((s) => ({ form: { ...s.form, ...partial } }));
  },

  toggleTool: (name) => {
    set((s) => {
      const has = s.selectedToolIds.includes(name);
      const next = has
        ? s.selectedToolIds.filter((t) => t !== name)
        : [...s.selectedToolIds, name];
      return { selectedToolIds: next, form: { ...s.form, tools: next } };
    });
  },

  toggleSkill: (name) => {
    set((s) => {
      const has = s.selectedSkillIds.includes(name);
      const next = has
        ? s.selectedSkillIds.filter((t) => t !== name)
        : [...s.selectedSkillIds, name];
      return { selectedSkillIds: next, form: { ...s.form, skills: next } };
    });
  },

  toggleMemoryModule: (module) => {
    set((s) => {
      const has = s.form.longTerm.modules.includes(module);
      const modules = has
        ? s.form.longTerm.modules.filter((m) => m !== module)
        : [...s.form.longTerm.modules, module];
      return {
        form: {
          ...s.form,
          longTerm: { ...s.form.longTerm, modules },
        },
      };
    });
  },

  updateLongTerm: (partial) => {
    set((s) => ({
      form: {
        ...s.form,
        longTerm: { ...s.form.longTerm, ...partial },
      },
    }));
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
    const { form, agents, editingId } = get();
    const errors: Record<string, string> = {};

    // id only required for create mode; in edit mode the ID is fixed and
    // should never be re-validated (it would always collide with itself).
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
    if (!form.provider) errors.provider = '请选择 Provider';
    if (!form.model) errors.model = '请选择或输入 Model';

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
    }

    set({ errors });
    return Object.keys(errors).length === 0;
  },

  createAgent: async () => {
    const valid = get().validate();
    if (!valid) return false;
    const { form } = get();
    try {
      await apiClient.createAgent(buildCreateBody(form));
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

  updateAgent: async (id) => {
    const { form } = get();
    // Set editingId BEFORE validate so the id-uniqueness check is skipped
    // (in edit mode the ID is fixed and would always collide with itself).
    // If validation fails we restore the prior state so the modal stays open.
    const prevEditingId = get().editingId;
    set({ editingId: id });
    const valid = get().validate();
    if (!valid) {
      set({ editingId: prevEditingId });
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
        editingId: prevEditingId,
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
    set({ form: defaultForm(), errors: {}, selectedToolIds: [], selectedSkillIds: [], editingId: null });
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
      editingId: null,
    });
  },

  startEdit: async (id) => {
    set({ editingId: id, createOpen: true });
    await get().loadAgentDetail(id);
    const detail = get().currentDetail;
    if (!detail) return;
    // 回填长期记忆配置：后端始终返回 memory.long_term，旧 Agent 默认 enabled=false
    const lt = detail.memory?.long_term ?? {
      enabled: false,
      modules: ['semantic', 'episodic'],
      consolidation: { enabled: false, idle_timeout_s: 300 },
      embedding: { provider: 'openai', model: 'text-embedding-3-small' },
    };
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
        skills: detail.skills,
        provider: detail.llm.provider,
        model: detail.llm.model,
        temperature: detail.llm.temperature,
        avatar: detail.avatar ?? '',
        longTerm: lt,
      },
      selectedToolIds: detail.tools,
      selectedSkillIds: detail.skills,
      errors: {},
    });
  },
}));

export default useAgentStore;
