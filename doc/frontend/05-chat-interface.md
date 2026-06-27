# 05 - 聊天界面

前端核心页面，对应后端对话系统（07-human-agent-dialog.md）和流式输出（16-streaming-output.md）。

> **设计精简说明**：群聊中的 DM、消息树（parent_id/fork）已剪枝至未来

## 模块清单

| 模块 | 职责 |
|------|------|
| ChatLayout | 聊天页整体布局（Agent 列表 + 消息区 + 输入区） |
| MessageList | 消息列表（滚动、自动定位） |
| MessageBubble | 单条消息（气泡 + 元信息） |
| StreamingMessage | 流式消息（打字动画 + 进度） |
| ToolCallBlock | 工具调用展示（参数 + 结果） |
| ChatInput | 输入区（文本框 + 发送 + 附件） |
| HITLApproval | Human-in-the-loop 审批卡片 |
| ConversationHistory | 对话历史侧栏 |

---

## 一、ChatLayout 整体布局

```
┌───────────────────────────────────────────────────────┐
│  Chat                [WebSocket ▾] [Clear] [Export] │
├────────────┬──────────────────────────────────────────┤
│  Agent     │  Messages                               │
│  Sidebar   │                                         │
│  (260px)   │  ┌─ Welcome (无消息时) ─────────────┐  │
│            │  │  Hi, I'm researcher-01.            │  │
│  [Search]  │  │  How can I help?                   │  │
│            │  └─────────────────────────────────────┘  │
│  ▸ res-01  │                                         │
│    3 msgs  │  ┌─ User Message ────────────────────┐  │
│  ▸ wri-01  │  │ What's the weather today?         │  │
│    1 msg   │  └───────────────────────────────────┘  │
│  ▸ cod-01  │                                         │
│    0 msgs  │  ┌─ Agent Message ───────────────────┐  │
│            │  │ [Thinking: checking web_search]   │  │
│            │  │ [Tool: web_search("weather")]     │  │
│            │  │ The weather today is sunny,       │  │
│            │  │ 25°C in Beijing.                   │  │
│            │  └───────────────────────────────────┘  │
│            │                                         │
│            ├─────────────────────────────────────────┤
│            │  [Type a message...    ] [Send ➤]     │
│            └─────────────────────────────────────────┘
└────────────┴─────────────────────────────────────────┘
```

### Agent Sidebar

- 搜索框：顶部固定
- 列表项：Agent 头像 + 名字 + 未读消息数 + 最后消息预览
- 选中态：`--accent-bg` 背景
- 空消息数不显示

---

## 二、MessageBubble（消息气泡）

### 用户消息

```
                    ┌──────────────────────────┐
                    │  What's the weather?      │  ← 右对齐
                    └──────────────────────────┘
                    14:32 · You
```

- 对齐：右
- 背景：`--accent-primary`
- 文字：`--text-primary-fg`
- 圆角：`--radius-lg`（右下角 `--radius-sm`）

### Agent 消息

```
┌──────────────────────────────────────────┐
│  [Thinking] web_search → "Beijing..."   │  ← 可折叠的工具调用
│  ─────────────────────                  │
│  The weather in Beijing is sunny,       │  ← 正文
│  25°C. Here's the forecast...           │
│                                          │
│  ```json                                 │  ← 代码块（如有）
│  {"temp": 25, "condition": "sunny"}     │
│  ```                                     │
└──────────────────────────────────────────┘
researcher-01 · 14:33
```

- 对齐：左
- 背景：`--bg-card`，边框 `1px solid --border-default`
- 文字：`--text-foreground`
- 圆角：`--radius-lg`（左下角 `--radius-sm`）
- 最大宽度：`75%`

### 消息元信息

- 发送者名称 + 时间，显示在气泡下方
- 字号：`--text-xs`
- 颜色：`--text-muted`
- 带消息来源标识：`[user]` / `[agent]` / `[system]`

---

## 三、StreamingMessage（流式消息）

### 视觉效果

```
┌──────────────────────────────────────┐
│  The weather today is sunny and▋     │  ← 光标闪烁动画
└──────────────────────────────────────┘
researcher-01 · streaming...
```

### 实现细节

| 属性 | 值 |
|------|-----|
| 光标动画 | CSS `blink`，`--accent-primary` 色，1s 循环 |
| 首字延迟 | 显示 `[Thinking...]` 占位符，直到第一个 chunk 到达 |
| chunk 合并 | 前端按 `seq` 排序，追加到 DOM |
| 滚动 | 每个 chunk 到达后 `scrollTo(bottom)`，smooth |
| 完成态 | 移除光标，更新元信息时间戳 |

### 流式事件类型处理

| StreamEvent 类型 | 前端行为 |
|------------------|---------|
| `stream_chunk` | 追加文本到气泡 |
| `stream_thinking` | 展示为可折叠的思考过程块 |
| `stream_tool_start` | 显示工具调用卡片（loading 态） |
| `stream_tool_end` | 更新工具调用卡片（结果态） |
| `stream_done` | 移除流式标记，固定消息 |
| `stream_error` | 显示错误消息（红色边框） |

---

## 四、ToolCallBlock（工具调用展示）

### Loading 态

```
┌─ Tool Call ─────────────────────────────┐
│  🔧 web_search                         │
│  Args: { "query": "Beijing weather" }  │  ← 等宽字体
│                                         │
│  [Spinner] Executing...                │
└─────────────────────────────────────────┘
```

### 完成态

```
┌─ Tool Call ─────────────────────────────┐
│  🔧 web_search                  ✓ 2.1s  │  ← 成功 + 耗时
│  ────────────────────────────────────    │
│  Result (collapsed by default):          │
│  ▸ Click to expand...                   │
│  ────────────────────────────────────    │
│  {"weather": "sunny", "temp": 25}       │  ← 展开后显示
└─────────────────────────────────────────┘
```

### 失败态

```
┌─ Tool Call ─────────────────────────────┐
│  🔧 web_search                  ✗       │
│  Error: Connection timeout (30s)         │  ← --status-destructive
└─────────────────────────────────────────┘
```

### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `--bg-muted` |
| 圆角 | `--radius-md` |
| 边框 | `1px solid --border-default`（失败时 `--status-destructive`） |
| 折叠 | 默认折叠结果，点击展开 |
| 工具名 | 等宽字体，`--accent-primary` 色 |
| 参数/结果 | 等宽字体，`--text-xs`，代码高亮 |

---

## 五、ChatInput（输入区）

### 结构

```
┌─────────────────────────────────────────────────┐
│  [📎] [Type a message...              ] [Send]  │
└─────────────────────────────────────────────────┘
```

### 规范

| 属性 | 值 |
|------|-----|
| 高度 | 自动（单行 `48px`，多行最高 `200px`） |
| 背景 | `--bg-card`，边框 `--border-default` |
| 圆角 | `--radius-lg` |
| 内边距 | `12px 16px` |
| 字号 | `--text-sm` |
| 发送按钮 | `--accent-primary`，`--radius-full` |

### 行为

- Enter 发送（单行模式）
- Shift+Enter 换行
- 发送中按钮 disabled + Spinner
- 空内容禁用发送
- 自动 focus（页面加载后、Agent 切换后）
- 停止生成：流式进行中，发送按钮变为红色 Stop 按钮

---

## 六、HITLApproval（人机协同审批）

对应后端 HITL 中断机制，Agent 调用危险工具时需人类确认。

### 视觉设计

```
┌─ ⚠ HITL Approval Required ──────────────────┐
│                                                │
│  Agent researcher-01 wants to:                  │
│                                                │
│  Tool: file_write                               │
│  Args:                                          │
│  {                                              │
│    "path": "/output/report.md",                 │
│    "content": "..."                             │
│  }                                              │
│                                                │
│  ⚠ This tool is marked as DANGEROUS            │
│                                                │
│              [Reject]  [Approve]                │
└────────────────────────────────────────────────┘
```

### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `--bg-popover` |
| 边框 | `2px solid --status-warning` |
| 左边框 | `4px solid --status-warning` |
| 超时倒计时 | 底部进度条，剩余时间文字 |
| Reject 按钮 | Secondary |
| Approve 按钮 | Primary（危险工具用 Danger） |

### 超时行为

- 距超时 30s：显示黄色倒计时条
- 距超时 10s：倒计时条变红 + 闪烁
- 超时：自动执行 `auto_action_on_timeout`，卡片变为灰色 `[Timed Out - Auto Skipped]`

---

## 七、Chat Mode 切换

对应后端三种传输协议。

| 模式 | 前端实现 | 适用 |
|------|---------|------|
| WebSocket | `WebSocket` 长连接，实时双向 | 默认模式 |
| SSE | `fetch` + `ReadableStream`，单向推送 | 备选 |
| HTTP | `fetch POST`，等待完整回复 | 兜底 |

Mode 切换以 Toggle Button Group 形式在 Chat Toolbar 中。

---

## 八、对话管理

### 历史对话

- Chat Tab 侧栏底部可展开"对话历史"面板
- 列表显示：对话参与者 + 消息数 + 最后活跃时间
- 点击加载历史消息

### 新建对话

- 切换 Agent 时自动新建对话
- 或点击 "+" 按钮手动新建
- 空对话显示 Welcome 消息（Agent 的 system_prompt 首句）

---

## 相关文档

- 后端 [07-human-agent-dialog.md](../../nebula-agent-os/doc/design/07-human-agent-dialog.md)
- 后端 [16-streaming-output.md](../../nebula-agent-os/doc/design/16-streaming-output.md)
- [04-component-library.md](./04-component-library.md)
- [10-api-integration.md](./10-api-integration.md)
