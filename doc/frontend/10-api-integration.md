# 10 - 前后端 API 对接规范

定义前端与后端 API 的对接方式、WebSocket 协议、错误处理和状态管理。

> **设计参考**：后端 API 端点定义见 `src/nebula/api/server.py`

## 模块清单

| 模块 | 职责 |
|------|------|
| RESTApiMap | REST 端点清单与前端调用规范 |
| WebSocketProtocol | WS 消息协议 |
| SSEProtocol | SSE 事件协议 |
| ErrorMapping | 后端错误 → 前端展示映射 |
| StoreArchitecture | Zustand Store 架构 |
| ConnectionManager | 连接管理（重连/降级） |

---

## 一、REST API Map

### 基础信息

| 属性 | 值 |
|------|-----|
| Base URL | 同源（`/api`） |
| Content-Type | `application/json` |
| 认证 | MVP 阶段无认证 |

### 端点清单

| 方法 | 端点 | 前端用途 | 参数 |
|------|------|---------|------|
| GET | `/api/health` | 连接检测 | 无 |
| GET | `/api/world` | 世界状态 | 无 |
| GET | `/api/agents` | Agent 列表 | 无 |
| POST | `/api/agents` | 创建 Agent | `AgentCreateRequest` |
| POST | `/api/chat` | HTTP 模式聊天 | `ChatRequest` |
| GET | `/api/conversations` | 对话列表 | 无 |
| GET | `/api/conversations/{id}/messages` | 对话消息 | `limit` |
| GET | `/api/events` | 事件列表 | `from_tick`, `limit` |
| GET | `/api/relations` | 关系图 | 无 |
| GET | `/api/tools` | 工具列表 | 无 |
| POST | `/api/group-chats` | 创建群聊 | body |
| GET | `/api/group-chats` | 群聊列表 | 无 |
| GET | `/metrics` | Prometheus 指标 | 无 |

### 前端调用封装

```typescript
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.json());
  }
  return res.json();
}
```

### 轮询端点

| 端点 | 间隔 | Store |
|------|------|-------|
| `/api/world` | 5s | `observeStore` |
| `/api/events?limit=50` | 3s | `observeStore` |
| `/api/conversations` | 10s | `chatStore` |
| `/metrics` | 5s | `observeStore` |

---

## 二、WebSocket Protocol

### 连接

```
ws://{host}/ws/chat/{agent_id}
```

### 发送消息

```json
{
  "message": "What's the weather?"
}
```

### 接收消息

```json
{
  "type": "message",
  "source": "researcher-01",
  "role": "assistant",
  "content": "The weather is sunny, 25°C.",
  "conversation_id": "conv-abc123"
}
```

### 流式连接

```
ws://{host}/ws/chat/stream/{agent_id}
```

### 流式事件

```json
{
  "type": "stream_chunk",
  "agent_id": "researcher-01",
  "conversation_id": "conv-abc123",
  "message_id": "msg-001",
  "payload": { "text": "The weather" },
  "seq": 1
}
```

| type | payload | 前端处理 |
|------|---------|---------|
| `stream_chunk` | `{text}` | 追加到流式消息 |
| `stream_thinking` | `{step, content}` | 显示思考步骤 |
| `stream_tool_start` | `{tool, args}` | 展示工具调用（loading） |
| `stream_tool_end` | `{tool, result}` | 更新工具调用（完成） |
| `stream_done` | `{message_id}` | 固化消息 |
| `stream_error` | `{error, kind}` | 显示错误 |

---

## 三、SSE Protocol

### 端点

```
GET /api/chat/sse/{agent_id}?message=...
```

### 事件格式

```
data: {"type": "start", "agent_id": "...", "conversation_id": "..."}

data: {"type": "chunk", "text": "Hello"}

data: {"type": "end", "content": "Hello! How can I help?", "conversation_id": "..."}

data: {"type": "error", "error": "..."}
```

### 前端处理

```typescript
async function chatViaSSE(agentId: string, message: string) {
  const url = `/api/chat/sse/${agentId}?message=${encodeURIComponent(message)}`;
  const res = await fetch(url);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // 按 \n\n 分割 SSE 事件
    const events = buffer.split('\n\n');
    buffer = events.pop()!;
    for (const block of events) {
      const line = block.trim().replace(/^data: /, '');
      const payload = JSON.parse(line);
      // 根据 type 分发处理
    }
  }
}
```

---

## 四、Error Mapping

### HTTP 错误 → 前端处理

| 状态码 | 含义 | 前端行为 |
|--------|------|---------|
| 400 | 请求参数错误 | 表单字段标红 + Toast |
| 409 | 资源冲突（Agent 已存在） | Toast 提示 |
| 500 | 服务器错误 | Error Toast + 重试按钮 |
| 502/503 | 服务不可用 | "Disconnected" 状态 + 自动重连 |

### 后端 ErrorKind → 前端展示

| ErrorKind | 用户可见消息 |
|-----------|------------|
| `llm_timeout` | "AI 模型响应超时，正在重试..." |
| `llm_rate_limit` | "请求频率过高，请稍后再试" |
| `llm_auth` | "API 密钥配置有误，请检查设置" |
| `tool_timeout` | "工具执行超时" |
| `tool_failed` | "工具执行失败：{detail}" |
| `agent_loop` | "检测到重复行为，已自动停止" |
| `budget_exceeded` | "预算已用完，请调整或等待重置" |

### 流式错误处理

| 场景 | 前端行为 |
|------|---------|
| WS 断开 | 3s 后自动重连，显示 "Reconnecting..." |
| WS 断开（> 30s） | 降级为 HTTP 模式，Toast 提示 |
| 流中断（`stream_error`） | 消息气泡显示错误，可重试 |
| SSE 读取失败 | Toast 错误 + 重试按钮 |

---

## 五、Store Architecture

### Store 划分

| Store | 职责 | 数据来源 |
|-------|------|---------|
| `chatStore` | 对话列表、当前对话、消息、流式状态 | WS/SSE/REST |
| `agentStore` | Agent 列表、当前 Agent 配置 | REST |
| `orchestStore` | 编排图、群聊列表、世界状态 | REST + 轮询 |
| `observeStore` | 事件流、Metrics、Traces | REST + 轮询 |
| `configStore` | LLM 配置、工具列表、预算设置 | REST |
| `uiStore` | 主题、侧栏折叠、当前 Tab | localStorage |

### Store 间通信

```
chatStore          → 收到新消息 → observeStore.appendEvent()
agentStore         → 创建 Agent → orchestStore.refreshGraph()
orchestStore       → tick 更新 → observeStore.updateMetrics()
```

通过 Zustand 的 `subscribe` 或自定义 event bus 实现。

### 数据刷新策略

| 数据 | 策略 | 说明 |
|------|------|------|
| Agent 列表 | 切换到 Agents Tab 时刷新 | 非实时 |
| 世界状态 | 5s 轮询 | 轻量请求 |
| 事件流 | 3s 轮询（增量） | `from_tick` 参数 |
| 对话列表 | 10s 轮询 | 低频 |
| 聊天消息 | WebSocket 推送 | 实时 |
| Metrics | 5s 轮询 | 图表数据 |

---

## 六、ConnectionManager

### 连接状态机

```
connected → disconnected → reconnecting → connected
                          ↓ (fail)
                        degraded (HTTP fallback)
                          ↓ (recover)
                        connected (WS)
```

### 重连策略

| 指数 | 延迟 | 动作 |
|------|------|------|
| 1 | 1s | 静默重连 |
| 2 | 2s | 静默重连 |
| 3 | 4s | 显示 "Reconnecting..." |
| 4 | 8s | 显示 "Reconnecting..." |
| 5+ | 16s cap | 降级为 HTTP + Toast 通知 |

最大重试次数：无限制（持续尝试），但 5 次后降级。

### 连接指示

TopBar 右上角的状态指示器：
- 绿色脉冲：`connected`
- 黄色闪烁：`reconnecting`
- 红色：`disconnected` / `degraded`

---

## 七、项目结构建议

```
src/
├── components/          # 通用组件
│   ├── ui/             # 基础组件 (Button, Card, Badge...)
│   ├── chat/           # 聊天组件 (MessageBubble, ChatInput...)
│   ├── orchest/        # 编排组件 (TopologyView, WorldPanel...)
│   └── observe/        # 可观测组件 (EventTimeline, TraceViewer...)
├── pages/              # 页面组件
│   ├── ChatPage.tsx
│   ├── AgentsPage.tsx
│   ├── OrchestrationPage.tsx
│   ├── ObservePage.tsx
│   └── SettingsPage.tsx
├── stores/             # Zustand stores
│   ├── chatStore.ts
│   ├── agentStore.ts
│   ├── orchestStore.ts
│   ├── observeStore.ts
│   ├── configStore.ts
│   └── uiStore.ts
├── hooks/              # 自定义 hooks
│   ├── useWebSocket.ts
│   ├── useSSE.ts
│   └── usePolling.ts
├── services/           # API 封装
│   ├── api.ts
│   └── ws.ts
├── styles/             # 全局样式
│   ├── tokens.css      # Design Tokens
│   └── global.css
├── App.tsx
└── main.tsx
```

---

## 相关文档

- 后端 `src/nebula/api/server.py`
- [05-chat-interface.md](./05-chat-interface.md)
- [01-overview.md](./01-overview.md)
