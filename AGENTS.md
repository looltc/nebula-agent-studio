# AGENTS.md

## 目标

构建 Nebula Agent Studio —— Nebula Agent OS 的独立前端应用。基于 React 18 + TypeScript + Vite，提供 5 大 Tab（Chat / Agents / Orchestration / Observe / Settings），对接后端 5 层架构，支持实时对话、流式输出、编排可视化、可观测面板与 Agent 管理。

## 仓库结构

```
nebula-agent-studio/
├── src/
│   ├── components/          # 通用组件
│   │   ├── ui/             # 基础组件 (Button/Card/Badge/Input/Modal/Toast...)
│   │   ├── chat/            # 聊天组件 (MessageBubble/ChatInput/ToolCallBlock...)
│   │   ├── orchest/         # 编排组件 (TopologyView/WorldPanel/GroupChatManager...)
│   │   └── observe/         # 可观测组件 (EventTimeline/TraceViewer/MetricsDashboard...)
│   ├── pages/              # 页面组件 (ChatPage/AgentsPage/OrchestrationPage/ObservePage/SettingsPage)
│   ├── stores/             # Zustand stores (chat/agent/orchest/observe/config/ui)
│   ├── hooks/              # 自定义 hooks (useWebSocket/useSSE/usePolling/useKeyboard)
│   ├── services/           # API 封装 (api.ts/ws.ts) + ConnectionManager
│   ├── styles/            # 全局样式 (tokens.css/global.css)
│   ├── types/             # TypeScript 类型定义
│   ├── App.tsx
│   └── main.tsx
├── doc/frontend/          # 10 份前端设计文档
├── AGENTS.md
├── FEATURES.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 代码助手行为规范

- **动手前先读**：修改任何文件前必须先 Read，理解上下文与既有约定，禁止凭猜测编辑
- **最小改动**：只做被要求的事，不顺手重构、不添加未要求的特性、不为假想未来做抽象
- **复用优先**：优先复用现有组件与抽象（Button/Card/StatusDot/api()/stores），不重复造轮子
- **改完即测**：每次功能改动后运行 `npm run build` 与 `tsc --noEmit`，新增功能必须配套
- **保持文档同步**：新增/完成 feature 后立即更新 `FEATURES.md`
- **遵循设计令牌**：颜色/间距/字号/圆角/阴影必须使用 `tokens.css` 中的 CSS 变量，禁止硬编码
- **暗色优先**：默认 `data-theme="dark"`，所有颜色通过令牌双模式映射，亮色模式同等支持
- **类型安全**：所有 props、API 响应、store state 必须有 TypeScript 类型，禁止 any
- **后端契约**：API 端点与字段以 `src/nebula/api/server.py` 为准，前端类型与之对齐
- **跨平台**：Windows 上路径用正斜杠，命令用 PowerShell 兼容写法
- **保持 AGENTS.md 简洁凝练，不超过 100 行**

## 技术栈

React 18 · TypeScript · Vite · React Router v6 · Zustand · CSS Modules + Design Tokens · @xyflow/react · Recharts · lucide-react

## 后端参考

- 仓库：`D:\AIWorkspace\nebula-agent-os`
- API 定义：`src/nebula/api/server.py`
- 设计文档：`doc/design/`（17 份）+ `AGENTS.md` + `FEATURES.md`
