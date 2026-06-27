# 03 - 布局系统

定义 Nebula Agent OS 前端的全局布局结构、栅格系统和响应式规则。

> **设计精简说明**：复杂响应式断点（平板/手机）留待未来，MVP 优先桌面端

## 模块清单

| 模块 | 职责 |
|------|------|
| Shell | 全局壳（顶栏 + 侧栏 + 内容区） |
| TopBar | 顶部导航栏 |
| SideNav | 左侧导航（5 Tab + 二级菜单） |
| ContentArea | 主内容区（Tab 面板） |
| GridSystem | 栅格与断点 |

---

## 一、Shell（全局壳）

```
┌─────────────────────────────────────────────────────────┐
│  TopBar  (56px)                                🔔  👤  │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  SideNav │  ContentArea                                 │
│  (240px) │  (flex: 1)                                   │
│          │                                              │
│  ▸ Chat  │  ┌─────────────────────────────────────────┐ │
│  ▸ Agents│  │  Tab Content                             │ │
│  ▸ Orches│  │  (padding: 24px)                         │ │
│  ▸ Obser │  │                                          │ │
│  ▸ Setti │  │                                          │ │
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
├──────────┴──────────────────────────────────────────────┤
│  StatusBar (28px, optional)                              │
└─────────────────────────────────────────────────────────┘
```

### CSS 结构

```css
.shell {
  display: grid;
  grid-template-rows: 56px 1fr;
  grid-template-columns: 240px 1fr;
  height: 100vh;
}
.shell-topbar   { grid-row: 1; grid-column: 1 / -1; }
.shell-sidenav  { grid-row: 2; grid-column: 1; }
.shell-content  { grid-row: 2; grid-column: 2; overflow: auto; }
```

---

## 二、TopBar（顶部栏）

### 尺寸

- 高度：`56px`
- 水平内边距：`24px`

### 布局

| 区域 | 对齐 | 内容 |
|------|------|------|
| 左 | 左对齐 | Logo + 产品名 "Nebula Agent OS" |
| 中 | 居中 | 当前 Tab 标题 + 面包屑（二级页面时） |
| 右 | 右对齐 | 连接状态指示 + 主题切换 + 用户头像 |

### 连接状态

```
● Connected (绿色脉冲动画)
● Disconnected (红色)
● Reconnecting (黄色闪烁)
```

### 面包屑（二级页面）

```
Agents > researcher-01 > Edit
```

---

## 三、SideNav（侧边栏）

### 尺寸

- 宽度：`240px`
- 可折叠：最小 `64px`（仅显示图标）
- 背景：`--sidebar-bg`
- 边框右：`1px solid --sidebar-border`

### 结构

```
┌─────────────────────┐
│  ☰ Nebula Agent OS  │  ← Logo 区（折叠时隐藏文字）
├─────────────────────┤
│                     │
│  💬 Chat            │  ← 一级导航项
│  🤖 Agents          │
│  🔀 Orchestration    │
│  📊 Observe         │
│  ⚙ Settings         │
│                     │
├─────────────────────┤
│  Agent List (Chat)  │  ← 上下文相关列表
│  ├─ researcher-01   │     当前 Tab 为 Chat 时
│  ├─ writer-01       │     显示 Agent 快捷入口
│  └─ coder-01        │
├─────────────────────┤
│  Quick Stats        │  ← 底部统计摘要
│  3 Agents · 2 Convs │
└─────────────────────┘
```

### 导航项规范

| 状态 | 背景色 | 文字色 | 左边框 |
|------|--------|--------|--------|
| 默认 | transparent | `--sidebar-fg` | none |
| Hover | `--sidebar-accent` | `--sidebar-accent-fg` | none |
| 选中 | `--sidebar-primary` 15% | `--sidebar-primary` | 3px solid `--sidebar-primary` |

### 折叠态

宽度缩至 `64px`，仅显示图标，hover 时以 tooltip 显示文字。

---

## 四、ContentArea（内容区）

### 尺寸

- 宽度：`calc(100vw - 240px)`（侧栏展开时）
- 溢出：`overflow-y: auto`
- 内边距：`24px`

### 内容头部

每个 Tab 页面顶部有统一的头部结构：

```
┌──────────────────────────────────────────────┐
│  Page Title              [Search] [+ Create] │  ← 标题 + 操作按钮
├──────────────────────────────────────────────┤
│  Tab Filters  (if any)                       │  ← 筛选标签（可选）
│  [All] [Active] [Paused] [Error]            │
└──────────────────────────────────────────────┘
```

---

## 五、栅格系统

### 基准

- 列数：12
- 列间距：`16px`
- 容器最大宽度：无限制（桌面端全宽）

### 常用布局

| 布局 | Grid 定义 | 用途 |
|------|-----------|------|
| 双栏 | `grid-template-columns: 300px 1fr` | Chat（侧栏 + 消息区） |
| 三栏 | `grid-template-columns: 1fr 1fr 1fr` | Stats Cards |
| 四栏 | `grid-template-columns: repeat(4, 1fr)` | Agent Cards Grid |
| 主+侧 | `grid-template-columns: 1fr 360px` | 详情页（主内容 + 侧面板） |
| 自适应 | `repeat(auto-fill, minmax(280px, 1fr))` | 卡片网格 |

---

## 六、各 Tab 布局详情

### Chat Tab

```
┌─────────────────────────────────────────────────┐
│  Chat                              [Mode ▾]    │
├──────────┬──────────────────────────────────────┤
│  Agent   │  Messages                            │
│  List    │  ┌─────────────────────────────────┐│
│          │  │ [user] Hello                      ││
│ ▶ res-01 │  │ [agent] Hi, how can I help?      ││
│ ▶ wri-01 │  │                                  ││
│ ▶ cod-01 │  │ [streaming] agent thinking...▋   ││
│          │  │                                  ││
│          │  └─────────────────────────────────┘│
│          ├──────────────────────────────────────┤
│          │  [Input Field]           [Send ➤]   │
└──────────┴──────────────────────────────────────┘
```

左侧 Agent 列表：`260px`，右侧消息区 `flex: 1`。

### Orchestration Tab

```
┌─────────────────────────────────────────────────┐
│  Orchestration              [+ New Graph]       │
├─────────────────────┬───────────────────────────┤
│  Graph Topology    │  World State               │
│  ┌─────┐            │  Tick: 42                  │
│  │Sup  │            │  Agents: 3                 │
│  └┬─┬─┘            │  Events: 156               │
│   │  │              │  ──────────                │
│  ▼  ▼              │  Agent States:             │
│ ▶   ▶              │  [res-01] active           │
│                     │  [wri-01] idle             │
│                     │  [cod-01] running          │
└─────────────────────┴───────────────────────────┘
```

左侧拓扑图：`50%`，右侧世界状态/群聊面板：`50%`。

### Observe Tab

```
┌─────────────────────────────────────────────────┐
│  Observe     [Events] [Metrics] [Traces] [Replay]│
├─────────────────────────────────────────────────┤
│  ┌─ Stats Row ────────────────────────────────┐│
│  │ Tokens: 12.4K  Latency: 2.1s  Tools: 8    ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  Event Timeline (scrollable)                     │
│  ┌─────────────────────────────────────────────┐│
│  │ tick 42  agent_action  researcher-01        ││
│  │ tick 42  message       researcher→human     ││
│  │ tick 41  tool_call     web_search          ││
│  │ tick 41  llm_invoke    openai/gpt-4o       ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## 七、响应式策略

> MVP 阶段仅支持桌面端（>= 1024px）。

| 断点 | 侧栏 | 布局 |
|------|------|------|
| >= 1440px | 240px 展开 | 双栏/多栏布局 |
| 1024px - 1439px | 240px 展开 | 单栏为主 |
| < 1024px | 64px 折叠（预留） | 堆叠布局（预留） |

---

## 八、滚动行为

| 区域 | 滚动 | 行为 |
|------|------|------|
| Shell | 不滚动 | 固定 100vh |
| SideNav | 内部滚动 | 独立滚动条 |
| ContentArea | 主滚动 | 自定义滚动条（8px 宽、`--border-default` 色） |
| Chat Messages | 内部滚动 | 自动滚到底，新消息到达时 smooth scroll |
| Event Timeline | 内部滚动 | 虚拟滚动（大量事件时） |

### 自定义滚动条

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 4px;
}
```

---

## 相关文档

- [01-overview.md](./01-overview.md)
- [02-visual-system.md](./02-visual-system.md)
- [04-component-library.md](./04-component-library.md)
