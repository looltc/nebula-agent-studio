# Nebula Agent OS - 前端 UI/UX 设计文档

> **当前状态**：前端设计文档 v1，对应后端 MVP 功能集

## 文档索引

### 总览

| 文档 | 模块 | 状态 |
|------|------|------|
| [01-overview.md](./01-overview.md) | 总体架构与设计原则 | 已完成 |
| [02-visual-system.md](./02-visual-system.md) | 视觉设计规范 | 已完成 |

### 布局与组件

| 文档 | 模块 | 状态 |
|------|------|------|
| [03-layout-system.md](./03-layout-system.md) | 布局系统 | 已完成 |
| [04-component-library.md](./04-component-library.md) | 组件库规范 | 已完成 |

### 功能页面

| 文档 | 模块 | 状态 |
|------|------|------|
| [05-chat-interface.md](./05-chat-interface.md) | 聊天界面 | 已完成 |
| [06-orchestration-ui.md](./06-orchestration-ui.md) | 编排可视化 | 已完成 |
| [07-observability-ui.md](./07-observability-ui.md) | 可观测性面板 | 已完成 |
| [08-agent-management.md](./08-agent-management.md) | Agent 管理 | 已完成 |

### 工程规范

| 文档 | 模块 | 状态 |
|------|------|------|
| [09-interaction-patterns.md](./09-interaction-patterns.md) | 交互模式与动效 | 已完成 |
| [10-api-integration.md](./10-api-integration.md) | 前后端 API 对接 | 已完成 |

---

## 阅读建议

### 新手入门

1. [01-overview.md](./01-overview.md) — 前端总体架构
2. [02-visual-system.md](./02-visual-system.md) — 视觉规范
3. [03-layout-system.md](./03-layout-system.md) — 布局体系

### 组件开发

1. [04-component-library.md](./04-component-library.md) — 组件库
2. [09-interaction-patterns.md](./09-interaction-patterns.md) — 交互模式
3. [10-api-integration.md](./10-api-integration.md) — API 对接

### 页面开发

1. [05-chat-interface.md](./05-chat-interface.md) — 聊天核心
2. [06-orchestration-ui.md](./06-orchestration-ui.md) — 编排视图
3. [07-observability-ui.md](./07-observability-ui.md) — 可观测面板
4. [08-agent-management.md](./08-agent-management.md) — Agent 配置

---

## 与后端文档的对应关系

| 后端文档 | 前端文档 |
|---------|---------|
| 01-overview.md（5 层模型） | 01-overview.md（前端视图映射） |
| 07-human-agent-dialog.md | 05-chat-interface.md |
| 04-orchestration.md | 06-orchestration-ui.md |
| 06-observability.md | 07-observability-ui.md |
| 03-agent-core.md | 08-agent-management.md |
| 08-group-conversation.md | 06-orchestration-ui.md（群聊部分） |
| 10-cost-control.md | 07-observability-ui.md（成本面板） |
| 16-streaming-output.md | 05-chat-interface.md（流式部分） |
