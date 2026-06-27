# 06 - 编排可视化

展示多 Agent 协作拓扑、群聊管理和世界状态，对应后端编排层（04-orchestration.md）和世界层（05-world.md）。

> **设计精简说明**：可视化拖拽编辑 GraphSpec、层级模式（Hierarchical）已剪枝至未来

## 模块清单

| 模块 | 职责 |
|------|------|
| TopologyView | 编排拓扑图（React Flow） |
| WorldPanel | 世界状态面板（Tick/Agents/Environment） |
| GroupChatManager | 群聊管理（创建/参与者/发言权） |
| RelationGraphView | 关系图可视化 |
| OrchestrationDetail | 编排详情（GraphSpec 配置） |

---

## 一、TopologyView（编排拓扑图）

### 概览

用 React Flow 展示 GraphSpec 定义的 Agent 编排拓扑。

### 节点类型

| type | 视觉 | 颜色 |
|------|------|------|
| `supervisor` | 六边形 | `--accent-primary` 边框 |
| `agent` | 圆角矩形 | `--border-default` 边框 |
| `human` | 菱形（预留） | `--status-warning` 边框 |

### 节点内容

```
┌──────────────────────┐
│  [Avatar]            │
│  researcher-01       │  ← agent_ref
│  ReAct · gpt-4o      │  ← thinking_model + llm
│  ● Active            │  ← StatusDot
└──────────────────────┘
```

### 边（Edge）

| 属性 | 视觉 |
|------|------|
| 普通边 | 实线，`--border-default` 色 |
| 条件边（有 `cond`） | 虚线，上方显示条件函数名 |
| Handoff 边 | 带箭头动画，`--accent-primary` 色 |
| 活跃边（当前 tick 数据流经） | 脉冲动画，加粗 |

### 交互

| 操作 | 行为 |
|------|------|
| Hover 节点 | 显示 Tooltip：Agent ID + 状态 + 最近操作 |
| Click 节点 | 跳转到该 Agent 的详情页（Agents Tab） |
| Hover 边 | 显示 Tooltip：条件函数名 / Handoff 目标 |
| 拖拽节点 | 调整布局位置（不修改 GraphSpec） |
| 缩放/平移 | 标准画布交互 |

### 工具栏

```
[+] [−] [Fit View] [Export SVG] [Layout ▾]
```

### 布局算法

默认使用 dagre 自动布局（从上到下），支持切换为力导向布局。

---

## 二、WorldPanel（世界状态面板）

### Stats 行

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Tick     │ │ Agents   │ │ Events   │ │ Sim Time │
│   42     │ │    3     │ │   156    │ │ 10:30:42 │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

使用 StatCard 组件，`repeat(4, 1fr)` 栅格。

### Agent 状态列表

```
┌─────────────────────────────────────────────────┐
│  Agent States                                    │
├─────────────────────────────────────────────────┤
│  ● researcher-01  active   last: web_search      │
│  ○ writer-01      idle     last: reply           │
│  ● coder-01       running  last: code_executor   │
└─────────────────────────────────────────────────┘
```

| 列 | 内容 |
|-----|------|
| 状态 | StatusDot + ID |
| 状态文字 | `active` / `idle` / `running` / `paused` / `error` |
| 最后操作 | 最近执行的动作类型 + 目标 |
| 持续时间 | 当前状态已持续 tick 数 |

### WorldLoop 控制

```
[▶ Run] [⏸ Pause] [⏭ Step] [⏩ Speed: 1x ▾]
```

| 按钮 | 功能 | 对应后端 |
|------|------|---------|
| Run | 启动世界循环 | `WorldLoop.run()` |
| Pause | 暂停 | `WorldLoop.pause()` |
| Step | 单步执行（+1 tick） | `WorldLoop.step(1)` |
| Speed | 速度倍率选择 | `set_speed(multiplier)` |

---

## 三、GroupChatManager（群聊管理）

### 群聊列表

```
┌─────────────────────────────────────────────────┐
│  Group Chats                    [+ New Group]    │
├─────────────────────────────────────────────────┤
│  panel-discussion                               │
│  4 participants · moderator · active             │
│  ──────────────────────────────────────         │
│  standup                                        │
│  3 participants · round_robin · paused           │
└─────────────────────────────────────────────────┘
```

### 群聊详情

选中群聊后右侧展示详情面板：

```
┌─ Group: panel-discussion ──────────────────────┐
│                                                  │
│  Floor Policy: moderator                         │
│  State: active                                   │
│  Created: 2024-01-15 10:30                      │
│                                                  │
│  Participants:                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  [A] moderator-01  moderator  ● active  │    │
│  │  [A] pro-01         advocate    ○ idle  │    │
│  │  [A] con-01         critic      ● active │    │
│  │  [A] scribe-01      scribe      ○ idle  │    │
│  │  [A] human:*        audience    -       │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  [Pause Chat] [Edit] [Archive]                  │
└─────────────────────────────────────────────────┘
```

### 创建群聊 Modal

```
┌─ Create Group Chat ────────────────────────────┐
│                                                  │
│  Group ID:   [team-research           ]         │
│                                                  │
│  Template:   [Custom ▾]                          │
│  ○ panel_discussion  ○ standup  ○ brainstorm     │
│  ○ code_review  ○ interview  ○ custom            │
│                                                  │
│  Floor Policy: [moderator ▾]                      │
│                                                  │
│  Participants:                                   │
│  [Search agent...]                               │
│  [A] moderator-01  role: [moderator ▾]   [✕]    │
│  [A] pro-01         role: [advocate ▾]    [✕]    │
│  [+ Add Participant]                              │
│                                                  │
│                    [Cancel]  [Create]            │
└─────────────────────────────────────────────────┘
```

模板选择时自动填充参与者配置，Custom 模式手动添加。

---

## 四、RelationGraphView（关系图可视化）

### 概览

用力导向图展示 Agent 间关系（trust / authority / collaboration / rivalry）。

### 视觉映射

| 关系类型 | 边颜色 | 边样式 |
|---------|--------|--------|
| `trust` | `--status-success` | 实线，粗细 = weight |
| `authority` | `--accent-primary` | 实线 + 箭头 |
| `collaboration` | `--accent-ring` | 虚线 |
| `rivalry` | `--status-destructive` | 锯齿线 |

### 节点

与 TopologyView 相同的 AgentCard 风格节点。

### 交互

- Hover 边：显示关系类型 + weight 值
- Click 节点：高亮所有关联边

---

## 五、OrchestrationDetail（编排详情）

选中编排图节点后，下方或右侧展示 GraphSpec 的可读视图：

```
Graph: research-team
Mode: Supervisor
Entry Point: sup

Nodes:
  sup  → supervisor (orchestrator-01)
  r1   → agent (researcher-01)
  w1   → agent (writer-01)

Edges:
  sup → r1   [cond: route_research]
  sup → w1   [cond: route_write]
  r1  → sup
  w1  → sup
```

使用等宽字体展示 JSON/YAML，可折叠。

---

## 相关文档

- 后端 [04-orchestration.md](../../nebula-agent-os/doc/design/04-orchestration.md)
- 后端 [05-world.md](../../nebula-agent-os/doc/design/05-world.md)
- 后端 [08-group-conversation.md](../../nebula-agent-os/doc/design/08-group-conversation.md)
- [04-component-library.md](./04-component-library.md)
