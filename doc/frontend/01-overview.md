# 01 - 前端总体架构

## 设计目标

为 Nebula Agent OS 构建独立前端应用，提供：

- **直观对话**：实时聊天、流式输出、工具调用可视化
- **编排可视化**：Agent 拓扑图、群聊管理、世界状态一览
- **可观测面板**：事件流、Metrics 图表、Trace 下钻、历史回放
- **Agent 管理**：创建/编辑/配置 Agent，工具授权，身份定制

## 后端 5 层 → 前端视图映射

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard  一级导航                                             │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │  Chat    │ Agents   │ Orchest  │ Observe  │ Settings │       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘       │
│                                                                  │
│  L5 可观测层  →  Observe Tab (Events/Metrics/Traces/Replay)     │
│  L4 世界层    →  World View (Tick/State/Relations/EventBus)      │
│  L3 编排层    →  Orchest Tab (GraphSpec/Supervisor/Swarm/Group)  │
│  L2 Agent层   →  Agents Tab (Config/Thinking/Tools/Memory)      │
│  L1 基础设施  →  Settings (LLM Provider/Tool Registry/Budget)    │
│                                                                  │
│  对话系统    →  Chat Tab (单聊/群聊/流式/HITL)                  │
└─────────────────────────────────────────────────────────────────┘
```

每层对应前端的一个或多个视图模块，可独立开发和测试。

## 前端技术选型

| 领域 | 选型 | 理由 |
|------|------|------|
| 框架 | React 18 + TypeScript | 类型安全、生态丰富 |
| 构建 | Vite | 快速 HMR |
| 路由 | React Router v6 | 嵌套路由支持多 Tab |
| 状态管理 | Zustand | 轻量、适合中等复杂度 |
| 样式 | CSS Modules + Design Tokens | 与豆包设计系统对齐 |
| 流式通信 | WebSocket + SSE (fetch ReadableStream) | 对应后端双通道 |
| 图表 | Recharts | 轻量、React 原生 |
| 拓扑图 | @xyflow/react (React Flow) | 编排可视化 |
| 请求 | 原生 fetch + WebSocket API | 无需额外依赖 |

## 页面结构（5 大 Tab）

| Tab | 对应后端 | 核心视图 |
|-----|---------|---------|
| **Chat** | 对话系统 | 单聊/群聊、消息列表、流式输出、HITL 审批 |
| **Agents** | L2 Agent 核心 | Agent 列表、创建/编辑、身份配置、工具授权 |
| **Orchestration** | L3 编排 + L4 世界 | 编排拓扑图、群聊管理、世界状态 |
| **Observe** | L5 可观测 | 事件流时间线、Metrics 看板、Trace 下钻、回放控制 |
| **Settings** | L1 基础设施 + L4 控制 | LLM Provider、工具注册、成本预算、系统配置 |

## 设计原则

1. **信息密度适中**：操作型界面优先清晰，数据型界面优先密度
2. **实时优先**：WebSocket 长连接，状态变更即时反映
3. **渐进展示**：详情默认折叠，点击展开，避免信息过载
4. **操作可逆**：危险操作（删 Agent、清对话）需二次确认
5. **暗色默认**：匹配后端 Dashboard 风格，提供亮色切换
6. **键盘友好**：Enter 发送、Esc 关闭弹窗、Tab 切换视图

## 关键决策

- **为什么独立前端**：当前内嵌 HTML 无法维护，独立项目支持组件化、热更新
- **为什么 5 Tab**：对应后端 5 层 + 对话系统，职责清晰
- **为什么 Zustand**：比 Redux 轻，比 Context 性能好，适合中等规模
- **为什么 WebSocket 优先**：实时对话是核心功能，WS 天然双向

## 跨 Tab 数据流

```
WebSocket 长连接 (消息/事件流)
    ↓
Zustand Store (全局状态)
    ├─ chatStore     → Chat Tab
    ├─ agentStore    → Agents Tab
    ├─ orchestStore  → Orchestration Tab
    ├─ observeStore  → Observe Tab
    └─ configStore   → Settings Tab
```

各 Tab 通过 Store 共享数据，互不直接耦合。

## 阅读顺序

按 [index.md](./index.md) 的"阅读建议"选择路径。

## 相关文档

- [02-visual-system.md](./02-visual-system.md)
- [03-layout-system.md](./03-layout-system.md)
- 后端 [01-overview.md](../../nebula-agent-os/doc/design/01-overview.md)
