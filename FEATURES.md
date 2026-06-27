# FEATURES.md

> ✅ 已完成　🔲 未实现（见各模块"未实现"小节）

## 项目工程

| Feature | 状态 | 说明 |
|---|---|---|
| Vite + React 18 + TS 脚手架 | ✅ | HMR + 路径别名 |
| TypeScript 严格模式 | ✅ | tsconfig paths @/* |
| Design Tokens | ✅ | tokens.css 亮/暗双模式令牌 |
| 全局样式 | ✅ | global.css 重置 + 滚动条 + 字体 |
| 路由 | ✅ | React Router v6 嵌套 |
| 类型定义 | ✅ | types/ 后端契约对齐 |

## 基础服务

| Feature | 状态 | 说明 |
|---|---|---|
| REST API 封装 | ✅ | api() 函数 + ApiError |
| WebSocket 服务 | ✅ | 普通聊天 + 流式通道；流式端点接入 LangChain astream() 真 token 流式 |
| SSE 服务 | ✅ | fetch ReadableStream 解析；后端接入 LangChain astream() 真 token 流式 |
| ConnectionManager | ✅ | 重连状态机 + 指数退避 + 降级 |
| 轮询 hook | ✅ | usePolling 可配置间隔 |
| 后端状态持久化 | ✅ | providers/agents/conversations JSON 文件落盘 + 启动时 _load_state() 恢复 + 时区感知时间戳(timezone.utc) + 会话删除同步落盘 + api_format 字段随 provider/agent 持久化 |
| 前端偏好持久化 | ✅ | localStorage 保存 currentAgentId / chatMode |
| 会话按 Agent 过滤 | ✅ | /api/conversations?agent_id=xxx 后端过滤 + 前端最新在上排序 |

## 状态管理 (Zustand)

| Feature | 状态 | 说明 |
|---|---|---|
| chatStore | ✅ | 对话/消息/流式状态/ChatMode |
| agentStore | ✅ | Agent 列表/配置/编辑表单 |
| orchestStore | ✅ | 编排图/群聊/世界状态 |
| observeStore | ✅ | 事件流/Metrics/Traces/回放 |
| configStore | ✅ | LLM/工具/预算 |
| uiStore | ✅ | 主题/侧栏折叠/当前 Tab/Toast |

## 自定义 Hooks

| Feature | 状态 | 说明 |
|---|---|---|
| useWebSocket | ✅ | 连接/重连/消息分发 |
| useSSE | ✅ | SSE 事件解析 |
| usePolling | ✅ | 增量轮询 |
| useKeyboard | ✅ | 全局快捷键 + 帮助面板 |

## 组件库 (components/ui)

| Feature | 状态 | 说明 |
|---|---|---|
| Button | ✅ | 5 变体 + 3 尺寸 + Loading |
| Card | ✅ | 基础/Stat/Agent/Tool |
| Badge | ✅ | 6 变体 |
| Input | ✅ | Text/Select/TextArea/Toggle/表单组 |
| Modal | ✅ | 确认型/动画/Esc 关闭 |
| Toast | ✅ | 4 变体/堆叠/自动消失 |
| Tooltip | ✅ | 自动定位 |
| DataTable | ✅ | 排序/分页/选中 |
| EmptyState | ✅ | 图标+CTA |
| StatusDot | ✅ | 5 状态+动画 |
| Avatar | ✅ | 3 尺寸+在线指示 |
| Spinner | ✅ | 3 尺寸 |
| Skeleton | ✅ | shimmer |
| ProgressBar | ✅ | 确定性/indeterminate |

## 布局

| Feature | 状态 | 说明 |
|---|---|---|
| Shell | ✅ | grid 56px+240px+1fr |
| SideNav | ✅ | brand 改为「Nebula Studio」+ 展开态折叠按钮置于 logo 右侧 + 折叠态隐藏按钮、悬浮 logo 时浮现展开按钮 + Chat tab 手风琴展开 Agent 列表 + 底部账户悬浮展开菜单(主题/设置) |
| Favicon | ✅ | SVG Sparkles logo，浏览器 tab 图标 |
| ErrorBoundary | ✅ | 运行时错误兜底 + 重试按钮 + 中文提示 |
| ContentArea | ✅ | 统一头部+滚动 |
| StatusBar | ✅ | 底部状态条 |

## Chat Tab (components/chat)

| Feature | 状态 | 说明 |
|---|---|---|
| ChatPage 布局 | ✅ | 260px 侧栏(新聊天 + 会话历史，Agent 列表移至左侧 SideNav 手风琴) + 欢迎屏/聊天头部 + 消息区 + 输入区 |
| 欢迎屏 | ✅ | 居中 Sparkles 品牌 logo + 欢迎文案 + 居中输入框，新聊天不自动打招呼 |
| 聊天头部 | ✅ | 左侧 Agent 名称 + 右侧 分享图标 + 3 点菜单(清空/导出/传输模式) |
| MessageList | ✅ | 滚动/自动定位/按时间戳升序排序 |
| MessageBubble | ✅ | 用户/Agent/系统 气泡，"你" 中文标签；时间显示北京时间(Asia/Shanghai, 24h)；助手消息走 Markdown 渲染(react-markdown + remark-gfm + rehype-highlight)，用户消息保持 pre-wrap 纯文本；LLM 回答前导换行符自动 trim |
| StreamingMessage | ✅ | 光标动画+chunk 合并；流式文本同样走 Markdown 渲染；后端 WS/SSE 已接入 LangChain astream() 真 token 流式（绕过 ReAct 循环，首字延迟显著降低） |
| MarkdownText | ✅ | GFM(表格/删除线/任务列表)+highlight.js 语法高亮+inline code chip+链接新开 tab+设计令牌配色 |
| ToolCallBlock | ✅ | Loading/完成/失败态 |
| ChatInput | ✅ | Enter 发送/Shift+Enter 换行/Stop，底部右对齐按钮行，中文占位符 |
| HITLApproval | ✅ | 审批卡片+倒计时 |
| ConversationHistory | ✅ | 按 Agent 归属过滤 + 按时间倒序(最新在上) + 悬停 3 点菜单(重命名/删除/导出)+选中态仅背景高亮(无蓝边/无侧边条/无 focus 轮廓)；删除走后端 DELETE 端点持久化 |
| ChatMode 切换 | ✅ | WS/SSE/HTTP 三选一(收入 3 点菜单) |

## Agents Tab (pages/AgentsPage)

| Feature | 状态 | 说明 |
|---|---|---|
| AgentList | ✅ | 卡片网格+筛选+排序 |
| AgentCard | ✅ | 头像/状态/工具/统计 |
| AgentCreate | ✅ | 完整表单 Modal+验证；编辑模式跳过 ID 唯一性检查；Provider/Model 无默认值强制选择；Base URL/API Key 由供应商配置统一管理；PUT 更新时 body 回传 id 满足后端 Pydantic 必填校验 |
| AgentDetail | ✅ | 双栏配置+运行时状态 |
| ToolAuthorization | ✅ | 工具列表+dangerous 标记 |
| ThinkingModelConfig | ✅ | ReAct/Plan-Execute |

## Orchestration Tab (components/orchest)

| Feature | 状态 | 说明 |
|---|---|---|
| TopologyView | ✅ | React Flow 拓扑图；Relation 字段对齐后端(from/to/kind) |
| WorldPanel | ✅ | Stats+Agent 状态+WorldLoop 控制 |
| GroupChatManager | ✅ | 列表+详情+创建 Modal |
| RelationGraphView | ✅ | 关系图可视化；从 relations 派生 nodes |
| OrchestrationDetail | ✅ | GraphSpec 可读视图 |
| 编排错误兜底 | ✅ | ErrorBoundary 包裹 + ReactFlowProvider + buildEdge 默认分支 |

## Observe Tab (components/observe)

| Feature | 状态 | 说明 |
|---|---|---|
| ObserveTabs | ✅ | Events/Metrics/Traces/Replay |
| EventTimeline | ✅ | 筛选+虚拟滚动+下钻 |
| MetricsDashboard | ✅ | Recharts 4 图表 |
| TraceViewer | ✅ | 树形+耗时条 |
| ReplayControls | ✅ | 播放/步进/注入 |
| CostPanel | ✅ | 预算概览+进度条+告警 |

## Settings Tab

| Feature | 状态 | 说明 |
|---|---|---|
| LLM Provider 配置 | ✅ | 名称/API 格式(openai/anthropic/openai_responses)/Base URL/API Key/模型列表(手动填+动态拉取)；后端统一走 LangChain ChatModels（ChatOpenAI/ChatAnthropic），按 api_format 路由；_resolve_llm_creds 跨 Provider 继承 base_url+api_key；Anthropic 格式无 /v1/models 端点时返回用户手动配置的模型列表；编辑时 API Key 留空保持不变；Base URL/API Key 集中托管，Agent 配置复用 |
| 工具注册浏览 | ✅ | 工具列表+schema |
| 成本预算设置 | ✅ | 预算阈值 |
| 主题切换 | ✅ | 暗色/亮色 |

## 未实现（剪枝至未来）

| Feature | 状态 | 说明 |
|---|---|---|
| 拖拽编辑 GraphSpec | 🔲 | 复杂画布编辑 |
| 层级布局模式 | 🔲 | Hierarchical 布局 |
| 消息矩阵热力图 | 🔲 | 可观测增强 |
| A/B Trace 对比 | 🔲 | 降级策略 UI |
| Agent 学习进化 UI | 🔲 | 后端未实现 |
| 思维模型降级链 UI | 🔲 | 后端未实现 |
| 群聊 DM/消息树 | 🔲 | parent_id/fork |
| 平板/手机响应式 | 🔲 | MVP 仅桌面端 |
| 手势/弹簧物理动画 | 🔲 | 复杂微交互 |
