# 07 - 可观测性面板

展示事件流、Metrics、Trace 和回放，对应后端可观测层（06-observability.md）、成本控制（10-cost-control.md）和错误处理（11-error-handling.md）。

> **设计精简说明**：消息矩阵热力图、分支对比（A/B trace）、降级策略 UI 已剪枝至未来

## 模块清单

| 模块 | 职责 |
|------|------|
| ObserveTabs | 可观测 Tab 切换（Events/Metrics/Traces/Replay） |
| EventTimeline | 事件流时间线 |
| MetricsDashboard | 指标看板 |
| TraceViewer | Trace 下钻 |
| ReplayControls | 回放控制 |
| CostPanel | 成本面板 |

---

## 一、ObserveTabs 导航

```
┌──────────────────────────────────────────────────┐
│  Observe                                         │
│  [Events] [Metrics] [Traces] [Replay]           │
├──────────────────────────────────────────────────┤
│  Stats Row                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Tokens   │ │ Latency  │ │ Errors   │         │
│  │  12.4K   │ │  2.1s    │ │  3       │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│  Tab Content...                                   │
└──────────────────────────────────────────────────┘
```

Stats Row 始终显示，所有子 Tab 共享。

---

## 二、EventTimeline（事件流）

### 筛选栏

```
[Type ▾ All] [Source ▾ All] [From Tick: 0] [Search...] [Auto-scroll ●]
```

### 事件列表

```
┌─────────────────────────────────────────────────────┐
│  tick 42 │ agent_action │ researcher-01              │
│          │ payload: { type: "reply", content: "..." }│
├─────────────────────────────────────────────────────┤
│  tick 42 │ message      │ researcher-01 → human      │
│          │ broadcast                             │
├─────────────────────────────────────────────────────┤
│  tick 41 │ tool_call    │ web_search                 │
│          │ args: { query: "Beijing weather" }       │
├─────────────────────────────────────────────────────┤
│  tick 41 │ llm_invoke   │ openai/gpt-4o              │
│          │ tokens: 1250 in / 340 out                │
└─────────────────────────────────────────────────────┘
```

### 事件类型标签

| 事件类型 | Badge 颜色 | 图标 |
|---------|-----------|------|
| `tick` | Success 绿 | 无 |
| `agent_action` | Warning 橙 | `zap` |
| `message` | Primary 蓝 | `message-circle-more` |
| `tool_call` | Mono 灰 | `wrench` |
| `llm_invoke` | Primary 蓝 | `bot` |
| `world_change` | Warning 橙 | `globe` |
| `budget_warn` | Warning 黄 | `triangle-alert` |
| `error` | Danger 红 | `circle-alert` |
| `loop_detected` | Danger 红 | `repeat` |

### 行为

- **自动滚动**：新事件到达时自动滚到底（可关闭）
- **虚拟滚动**：事件数 > 500 时启用虚拟列表
- **展开/折叠**：默认显示一行摘要，点击展开 payload
- **下钻**：点击事件行跳转到 Traces Tab，显示关联 trace

---

## 三、MetricsDashboard（指标看板）

### 布局

```
┌──────────────────┬──────────────────┐
│  Token Usage      │  Cost (USD)      │
│  [Line Chart]     │  [Line Chart]   │
│  in / out / total │  per agent       │
├──────────────────┼──────────────────┤
│  Latency (ms)     │  Tool Calls      │
│  [Bar Chart]      │  [Bar Chart]    │
│  llm / tool / total│  success / fail  │
└──────────────────┴──────────────────┘
```

`2×2` 网格布局，每个图表占一个 StatCard 大小的区域。

### 图表规范

| 属性 | 值 |
|------|-----|
| 图表库 | Recharts (LineChart, BarChart, AreaChart) |
| 颜色 | 使用 `--chart-1` ~ `--chart-5` |
| 背景色 | 卡片背景 |
| 文字色 | `--text-muted`（轴标签）/ `--text-foreground`（数值） |
| 时间范围 | 最近 1h / 6h / 24h / 7d 切换 |
| 刷新 | 5s 轮询 `/metrics` 端点 |

### 关键指标

| 类别 | 指标 | 维度 |
|------|------|------|
| Token | input / output / total | agent / provider / tick |
| 延迟 | decide / tool / llm | agent / tick |
| 工具 | 调用次数 / 成功率 / 错误率 | tool / agent |
| 成本 | USD 累计 / 预算余量 | agent / conversation |

---

## 四、TraceViewer（Trace 下钻）

### 树形视图

```
▼ world.tick #42 (2.1s)
  ▼ agent.decide (researcher-01) (1.8s)
    ├─ thinking.react (0.3s)
    │   ├─ llm.invoke (openai/gpt-4o) (0.8s)
    │   │   └─ tokens: 1250 in / 340 out
    │   └─ tool.call (web_search) (0.5s)
    │       └─ result: "Beijing sunny 25°C"
    └─ agent.act (0.2s)
        └─ message.send → human
  ○ agent.decide (writer-01) (0.0s)
    └─ (idle, no action this tick)
```

### Span 规范

| 属性 | 值 |
|------|-----|
| 层级缩进 | 每级 `24px` |
| 展开/折叠 | 点击 toggle |
| 耗时条 | 水平条形，长度 = 耗时占比，颜色按类型 |
| 状态图标 | 成功 `circle-check`(绿) / 失败 `circle-alert`(红) |

### 耗时颜色

| 类型 | 颜色 |
|------|------|
| LLM 调用 | `--chart-1` |
| 工具调用 | `--chart-3` |
| 思维模型 | `--chart-5` |
| 消息发送 | `--chart-2` |

---

## 五、ReplayControls（回放控制）

### 控制栏

```
┌──────────────────────────────────────────────────┐
│  Replay                                          │
│  From Tick: [0]  To Tick: [42]                  │
│                                                  │
│  [⏮ Start] [⏪ -5] [▶ Play] [⏩ +5] [⏭ End]   │
│                                                  │
│  Speed: [1x ▾]   Inject at tick: [__] (opt)     │
│                                                  │
│  ──────●────────────────────── tick: 28/42      │
└──────────────────────────────────────────────────┘
```

### 回放行为

| 操作 | 行为 |
|------|------|
| Play | 逐 tick 播放事件，每个 tick 间隔由 Speed 控制 |
| Pause | 暂停在当前 tick |
| Step | 前进/后退 N tick |
| Inject | 在指定 tick 注入新事件（分叉） |

### 回放视图

- 播放时，WorldPanel 实时更新 tick 状态
- EventTimeline 高亮当前 tick 的事件
- TopologyView 标记当前活跃 Agent

---

## 六、CostPanel（成本面板）

### 预算概览

```
┌──────────────────────────────────────────────────┐
│  Budget Overview                                 │
│                                                  │
│  Daily Cap: $50.00          Used: $12.34 (24.7%) │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                  │
│  Per Agent:                                      │
│  researcher-01  $8.20  ██████████░░░░░░░░  82%  │
│  writer-01      $3.10  ████░░░░░░░░░░░░░░  31%  │
│  coder-01       $1.04  ██░░░░░░░░░░░░░░░░  10%  │
└──────────────────────────────────────────────────┘
```

### 进度条颜色

| 使用率 | 颜色 |
|--------|------|
| < 80% | `--status-success` |
| 80% - 90% | `--status-warning` |
| > 90% | `--status-destructive` |

### 告警标记

- 预算达到 80%：顶部显示黄色横幅 + Toast
- 预算达到 90%：红色横幅 + Toast + Agent 卡片红框

---

## 相关文档

- 后端 [06-observability.md](../../nebula-agent-os/doc/design/06-observability.md)
- 后端 [10-cost-control.md](../../nebula-agent-os/doc/design/10-cost-control.md)
- 后端 [11-error-handling.md](../../nebula-agent-os/doc/design/11-error-handling.md)
- [04-component-library.md](./04-component-library.md)
- [10-api-integration.md](./10-api-integration.md)
