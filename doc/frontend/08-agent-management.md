# 08 - Agent 管理

Agent 的创建、编辑、配置和工具授权，对应后端 Agent 核心层（03-agent-core.md）和基础设施层（02-infrastructure.md）。

> **设计精简说明**：Agent 学习与进化、思维模型降级链 UI 已剪枝至未来

## 模块清单

| 模块 | 职责 |
|------|------|
| AgentList | Agent 列表（卡片网格） |
| AgentDetail | Agent 详情页（配置 + 状态 + 历史） |
| AgentCreate | 创建 Agent Modal / Page |
| AgentEdit | 编辑 Agent 配置 |
| ToolAuthorization | 工具授权管理 |
| ThinkingModelConfig | 思维模型配置 |

---

## 一、AgentList（Agent 列表）

### 页面结构

```
┌──────────────────────────────────────────────────┐
│  Agents              [Search...] [+ New Agent]   │
│                                                  │
│  [All] [Active] [Idle] [Error]        Sort: [Name▾]│
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

### AgentCard 详情

```
┌─────────────────────────────────┐
│  [Avatar R]                      │
│  researcher-01          [··· ▾] │  ← 操作菜单
│  Researcher                      │  ← name
│  ● Active                        │
│  ─────────────────────           │
│  Thinking: ReAct                 │  ← --text-xs, --text-muted
│  Model: gpt-4o                  │
│  Tools: web_search, calculator  │  ← Badge 列表
│  Memory: Buffer (50)            │
│  ─────────────────────           │
│  Messages: 23  Tokens: 4.2K     │  ← 累计统计
└─────────────────────────────────┘
```

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
│  Identity                                        │
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
│  Memory                                          │
│  ─────────────────────                           │
│  Type:  (●) Buffer  ( ) Summary                 │
│  Max Messages:  [50]                             │
│                                                  │
│  System Prompt                                    │
│  ─────────────────────                           │
│  [You are a helpful assistant. Engage in         ]│
│  [conversation, answer questions, and assist.   ]│
│                                                  │
│                    [Cancel]  [Create Agent]       │
└─────────────────────────────────────────────────┘
```

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
- Checkbox 选中/取消
- 危险工具旁显示 `[dangerous]` Badge
- 选中危险工具时弹出提示："This tool requires HITL approval"

### 工具信息展示

```
[✓] calculator     safe      timeout: 30s
    Simple AST-safe calculator

[✓] web_search     safe      timeout: 60s
    Search the web using DuckDuckGo

[ ] file_write     dangerous  timeout: 30s ⚠
    Write content to a file in workspace
```

---

## 五、ThinkingModelConfig（思维模型配置）

### 可选模型

| 模型 | 描述 | 推荐场景 |
|------|------|---------|
| ReAct | Think → Act → Observe 循环 | 通用工具调用 |
| Plan-and-Execute | 先规划再逐步执行 | 复杂多步任务 |

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
