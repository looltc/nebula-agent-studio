# 08 - Agent 管理

Agent 的创建、编辑、配置和工具授权，对应后端 Agent 核心层（03-agent-core.md）和基础设施层（02-infrastructure.md）。

> **设计精简说明**：Agent 学习与进化、思维模型降级链 UI 已剪枝至未来

## 模块清单

| 模块 | 职责 |
|------|------|
| AgentList | Agent 列表（卡片网格，按 updated_at 倒序） |
| AgentDetail | Agent 详情页（配置 + 状态 + 历史） |
| AgentCreate | 创建 Agent Modal / Page |
| AgentEdit | 编辑 Agent 配置 |
| ToolAuthorization | 工具授权管理（密集 grid + 点卡片勾选） |
| SkillAuthorization | Skill 授权管理（密集 grid + 点卡片勾选） |
| ThinkingModelConfig | 思维模型配置 |

---

## 一、AgentList（Agent 列表）

### 页面结构

```
┌──────────────────────────────────────────────────┐
│  Agents              [Search...] [+ New Agent]   │
│                                                  │
│  [All] [Active] [Idle] [Error]    Sort: [Updated▾]│
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │[A] Res  │  │[A] Wri  │  │[A] Cod  │         │
│  │researcher│  │writer   │  │coder    │         │
│  │● active │  │○ idle   │  │● running│         │
│  │ReAct    │  │PlanExec │  │ReAct    │         │
│  │gpt-4o   │  │gpt-4o   │  │gpt-4o   │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 排序

Agent 列表按 `updated_at` 倒序排列（最近修改的在前）。后端 `list_agents` 返回 `updated_at` 字段，前端按时间戳降序排序。

### AgentCard 详情

```
┌─────────────────────────────────┐
│  [Avatar R]                      │
│  researcher-01          [··· ▾] │  ← 操作菜单
│  Researcher                      │  ← name
│  ● Active                        │
│  ─────────────────────           │
│  Thinking: ReAct                 │  ← --text-xs, --text-muted
│  Model: gpt-4o                  │  ← 来自 agent.llm（agent 自己的配置）
│  Tools: web_search, calculator  │  ← Badge 列表（agent 自己的 tools）
│  Skills: search, summarize       │  ← Badge 列表（agent 自己的 skills）
│  Memory: Buffer (50)            │
└─────────────────────────────────┘
```

### 数据来源

卡片字段来自后端 `GET /api/agents` 返回的 `AgentSummary`：

| 字段 | 来源 | 说明 |
|------|------|------|
| Thinking | `agent.thinking_model` | Agent 自己的思维模型类型 |
| Model | `agent.llm.provider + agent.llm.model` | Agent 自己的 LLM 配置 |
| Tools | `agent.tools` | Agent 自己授权的工具列表 |
| Skills | `agent.skills` | Agent 自己授权的 Skill 列表 |

> **注意**：不再显示 Messages / Tokens 累计统计（已移除）。工具和 Skill 列表来自 Agent 自己的配置，而非全局工具列表。

### 操作菜单

| 操作 | 类型 | 确认 |
|------|------|------|
| Edit | 跳转编辑页 | 无 |
| Duplicate | 复制 Agent | 无 |
| Pause / Resume | 暂停/恢复 | 无 |
| Delete | 删除 Agent | 确认 Modal |

---

## 二、AgentCreate（创建 Agent）

### Modal 表单

```
┌─ Create New Agent ──────────────────────────────┐
│                                                  │
│  身份与人设 (Identity)                            │
│  ─────────────────────                           │
│  Agent ID:   [researcher-01              ]        │
│  Display:    [Researcher                  ]        │
│  Role:       [researcher                   ▾]      │
│  Persona:    [A meticulous researcher who...]    │
│              [provide accurate information]      │
│  Goals:      [+ Add goal]                        │
│              ○ "Provide accurate information"     │
│              ○ "Give verifiable conclusions"       │
│  Constraints:[+ Add constraint]                   │
│              ○ "Never fabricate facts"            │
│  System Prompt:                                  │  ← 合并到身份 section
│  [You are a helpful assistant. Engage in         ]│
│  [conversation, answer questions, and assist.   ]│
│                                                  │
│  Thinking Model                                  │
│  ─────────────────────                           │
│  Type:   (●) ReAct   ( ) Plan-and-Execute        │
│  Max Iterations:  [5 ]                          │
│                                                  │
│  LLM Provider                                    │
│  ─────────────────────                           │
│  Provider:   [openai                        ▾]   │
│  Model:      [gpt-4o-mini                   ▾]   │
│  Temperature:[0.7 ]                              │
│                                                  │
│  Tools                                           │
│  ─────────────────────                           │
│  [✓] calculator     [safe]                       │
│  [✓] web_search     [safe]                       │
│  [ ] file_read       [safe]                       │
│  [ ] file_write      [dangerous]                  │
│  [ ] code_executor   [dangerous]                  │
│                                                  │
│  Skills                                          │  ← 新增
│  ─────────────────────                           │
│  [✓] search          [active]                     │
│  [✓] summarize       [active]                     │
│  [ ] translate        [inactive]                   │
│                                                  │
│  Memory                                          │
│  ─────────────────────                           │
│  Type:  (●) Buffer  ( ) Summary                 │
│  Max Messages:  [50]                             │
│                                                  │
│                    [Cancel]  [Create Agent]       │
└─────────────────────────────────────────────────┘
```

> **注意**：System Prompt 不再作为独立 section，已合并到"身份与人设"section 内（约束列表之后）。详情页 AgentDetail 同样采用合并布局，标题改为"身份与人设"。

### 表单验证

| 字段 | 规则 |
|------|------|
| Agent ID | 必填，字母数字+连字符，唯一，小写 |
| Display Name | 必填 |
| Role | 必填 |
| Provider | 必填 |
| Model | 必填 |
| Temperature | 0.0 - 2.0 |
| Max Iterations | 1 - 50 |
| Max Messages | 1 - 200 |
| System Prompt | 可选，最大 4096 字符 |

---

## 三、AgentDetail（Agent 详情页）

### 路由

`/agents/:agentId`

### 页面布局

```
┌─────────────────────────────────────────────────┐
│  ← Agents > researcher-01                        │
│  [R] researcher-01                               │
│  Researcher · ● Active                    [···] │
├──────────────────────┬──────────────────────────┤
│  Configuration       │  Runtime Status           │
│                      │                           │
│  Thinking: ReAct     │  State: active            │
│  Model: gpt-4o       │  Last Tick: 42           │
│  Temperature: 0.3    │  Decisions: 156          │
│  Max Iter: 10        │  Messages: 23            │
│                      │  Tokens: 4.2K            │
│  Tools (3):           │  Cost: $0.82             │
│  ├─ web_search       │                           │
│  ├─ file_read         │  ────────                │
│  └─ calculator       │  Recent Actions:          │
│                      │  tick 42  reply → human    │
│  Memory:              │  tick 41  tool: web_search│
│  Type: Buffer         │  tick 40  reply → human    │
│  Capacity: 50/50      │                           │
│                      │                           │
│  ────────────        │  [Edit Agent]             │
│  System Prompt:       │  [Pause Agent]            │
│  [collapsed, click   │                           │
│   to expand...]      │                           │
└──────────────────────┴──────────────────────────┘
```

### 左右双栏

- 左栏（60%）：配置信息（只读）
- 右栏（40%）：运行时状态 + 操作按钮

---

## 四、ToolAuthorization（工具授权）

### 在创建/编辑 Agent 时

- 工具列表展示所有已注册工具（来自 `/api/tools`）
- **密集 grid 布局**：`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`，自适应列数
- **点卡片勾选**：整张卡片用 `<label>` 包裹 checkbox，点击卡片任意位置即可勾选/取消
- 卡片 padding 减小，字号 text-xs，避免占用过多垂直空间
- 危险工具旁显示 `[dangerous]` Badge
- 选中危险工具时弹出提示："This tool requires HITL approval"

### 布局示意

```
┌─ Tools ──────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │[✓] calculator│  │[✓] web_search│  │[ ] file_read ││
│  │  safe 30s    │  │  safe 60s    │  │  safe 30s   ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
│  ┌─────────────┐  ┌─────────────┐                  │
│  │[ ] file_write│  │[ ] code_exec │   ...           │
│  │  ⚠ danger    │  │  ⚠ danger    │                  │
│  └─────────────┘  └─────────────┘                  │
└──────────────────────────────────────────────────┘
```

### 工具信息展示

每张卡片包含：checkbox + 工具名 + 安全级别 + 超时 + 简短描述。点击卡片任意位置切换勾选状态。

---

## 五、SkillAuthorization（Skill 授权）

### 在创建/编辑 Agent 时

- Skill 列表来自 `/api/skills`（SkillManager 注册的 Skill 目录）
- **与 ToolAuthorization 一致的密集 grid + 点卡片勾选模式**
- 卡片显示 Skill 名称 + 启用状态（active/inactive）
- 勾选的 Skill 会在 AgentRuntime 构建时通过 `activate_skill` 工具注册

### 布局示意

```
┌─ Skills ─────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │[✓] search   │  │[✓] summarize│  │[ ] translate ││
│  │  active     │  │  active     │  │  inactive   ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
└──────────────────────────────────────────────────┘
```

### 数据来源

| 字段 | 来源 | 说明 |
|------|------|------|
| Skill 列表 | `GET /api/skills` | SkillManager 注册的全部 Skill |
| 已选 Skill | `agent.skills` | Agent 当前授权的 Skill 列表 |
| Skill 状态 | `/api/skills` 返回的 `enabled` 字段 | active / inactive |

---

## 六、ThinkingModelConfig（思维模型配置）

### 可选模型

| 模型 | 描述 | 推荐场景 |
|------|------|---------|
| ReAct | Think → Act → Observe 循环 | 通用工具调用 |
| Plan-and-Execute | 先规划再逐步执行 | 复杂多步任务 |
| Reflexion | actor → evaluator → reflector 循环 | 需要自我反思改进的任务 |

### 配置项

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | select | `react` | 思维模型类型 |
| `max_iterations` | number | 5 | 最大循环次数 |

选 Plan-and-Execute 时，可额外显示：planner / executor / replanner 各节点状态。

---

## 相关文档

- 后端 [03-agent-core.md](../../nebula-agent-os/doc/design/03-agent-core.md)
- 后端 [02-infrastructure.md](../../nebula-agent-os/doc/design/02-infrastructure.md)
- [04-component-library.md](./04-component-library.md)
- [06-orchestration-ui.md](./06-orchestration-ui.md)
