# 04 - 组件库规范

定义前端通用组件的视觉规范、交互行为和状态变体。

> **设计参考**：豆包设计系统提供的 Button、AppCard、ChatComposer、DataTable、SearchInput、SideNav 组件作为基准

## 模块清单

| 模块 | 职责 |
|------|------|
| Button | 按钮（Primary/Secondary/Ghost/Danger + 尺寸） |
| Card | 卡片容器（Stat/Agent/Tool/Event） |
| Badge | 标签与徽标 |
| Input | 输入框（Text/Select/TextArea/Toggle） |
| Modal | 模态对话框 |
| Toast | 轻提示 |
| Tooltip | 文字提示 |
| DataTable | 数据表格 |
| EmptyState | 空状态 |
| StatusDot | 状态指示器 |
| Avatar | 头像 |

---

## 一、Button

### 变体

| 变体 | 背景 | 文字 | 边框 | 用途 |
|------|------|------|------|------|
| Primary | `--accent-primary` | `--text-primary-fg` | none | 主要操作（发送、创建、确认） |
| Secondary | `--bg-muted` | `--text-foreground` | none | 次要操作（取消、返回） |
| Ghost | transparent | `--text-foreground` | none | 工具栏按钮、Tab 内按钮 |
| Danger | `--status-destructive` | `--text-primary-fg` | none | 删除、清空 |
| Outline | transparent | `--accent-primary` | `1px solid --accent-primary` | 链接式操作 |

### 尺寸

| 尺寸 | 高度 | 内边距 | 字号 | 圆角 |
|------|------|--------|------|------|
| sm | 32px | `8px 12px` | `--text-xs` | `--radius-md` |
| md | 36px | `8px 16px` | `--text-sm` | `--radius-md` |
| lg | 44px | `12px 20px` | `--text-base` | `--radius-md` |

### 状态

| 状态 | 表现 |
|------|------|
| Default | 正常色 |
| Hover | 背景加深 10% |
| Active | 背景加深 20% |
| Focus | `2px solid --accent-ring` offset 2px |
| Disabled | `opacity: 0.5; cursor: not-allowed` |
| Loading | 文字替换为 Spinner + 原文字变透明 |

### 图标按钮

文字 + 图标间距 `--space-1`（4px），图标在左或右。

---

## 二、Card

### 基础卡片

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
```

### StatCard（统计卡片）

```
┌─────────────────────┐
│  LABEL (uppercase)  │  ← --text-xs, --text-muted
│  12,456             │  ← --text-2xl, --font-bold
│  ▲ 12% vs last hour │  ← --text-xs, --status-success
└─────────────────────┘
```

- 尺寸：最小 `200px` 宽
- 数值可使用渐变色（`--chart-1` → `--chart-2`）

### AgentCard（Agent 卡片）

```
┌─────────────────────────────────┐
│  [Avatar] Researcher     [···]  │  ← 头像 + 名字 + 操作菜单
│  Role: researcher              │  ← --text-sm, --text-muted
│  Model: gpt-4o · ReAct         │
│  ─────────────────────          │
│  Tools: web_search, file_read  │  ← Badge 列表
│  Status: ● Active               │
└─────────────────────────────────┘
```

### ToolCard（工具卡片）

```
┌─────────────────────────────────┐
│  🔧 calculator   [SAFE]         │  ← 工具名 + 安全徽标
│  Simple AST-safe calculator     │  ← --text-sm, --text-muted
│  ─────────────────────          │
│  { "expression": "..." }       │  ← 参数 Schema (折叠)
└─────────────────────────────────┘
```

---

## 三、Badge

| 变体 | 背景色 | 文字色 | 用途 |
|------|--------|--------|------|
| Default | `--bg-muted` | `--text-foreground` | 标签 |
| Primary | `--accent-bg` | `--accent-primary` | 选中标签 |
| Success | `#064e3b` | `#a7f3d0` | 安全、在线 |
| Danger | `#7f1d1d` | `#fecaca` | 危险工具 |
| Warning | `#92400e` | `#fde68a` | 告警 |
| Mono | transparent, border `1px solid --border-default` | `--text-muted` | 代码/ID |

尺寸：`--text-xs`，内边距 `2px 8px`，圆角 `--radius-full`。

---

## 四、Input

### TextInput

```css
.input {
  background: var(--bg-muted);
  border: 1px solid var(--accent-input);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: var(--text-sm);
  color: var(--text-foreground);
}
.input:focus { border-color: var(--accent-ring); }
.input.error { border-color: var(--status-destructive); }
```

### Select

与 TextInput 相同样式，右侧有下拉箭头图标。

### TextArea

多行文本，最小高度 `80px`，自动增高（可选）。

### Toggle

```
[○ Off]  [● On]
```

- 关闭：`--bg-muted` 圆形滑块
- 开启：`--accent-primary` 滑块右移
- 尺寸：`44px × 24px`

### 表单组

```
Label                    ← --text-sm, --font-medium
[Input Field]            ← 标准 Input
Helper text              ← --text-xs, --text-muted (可选)
```

垂直间距：label 到 input `--space-1`，input 到 helper `--space-1`，组间 `--space-4`。

---

## 五、Modal

### 结构

```
┌─ Overlay (semi-transparent black) ──────────────┐
│                                                   │
│  ┌─ Modal Content ────────────────────────────┐  │
│  │  Title                              [✕]   │  │
│  │  ─────────────────────────────────────── │  │
│  │  Body content                            │  │
│  │  ...                                     │  │
│  │  ─────────────────────────────────────── │  │
│  │                    [Cancel]  [Confirm]    │  │
│  └──────────────────────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
```

### 规范

| 属性 | 值 |
|------|-----|
| 最大宽度 | `480px` |
| 内边距 | `24px` |
| 圆角 | `--radius-xl` |
| 阴影 | `--shadow-xl` |
| 进入动画 | `opacity 0→1 + translateY(8px→0)`, 200ms ease-out |
| 退出动画 | `opacity 1→0 + translateY(0→8px)`, 150ms ease-in |
| 关闭方式 | 点击 [✕] / 点击 Overlay / 按 Esc |

### 确认型 Modal（危险操作）

- 标题使用 `--status-destructive` 色的文字
- 确认按钮使用 Danger 变体
- Body 中说明操作后果

---

## 六、Toast

### 位置

屏幕右上角，距顶部 `16px`、距右侧 `16px`。

### 结构

```
┌─ [icon] Title                    [✕] ─┐
│  Description text                    │
└─────────────────────────────────────┘
```

### 变体

| 变体 | 图标 | 左边框色 |
|------|------|---------|
| Success | `circle-check` | `--status-success` |
| Error | `circle-alert` | `--status-destructive` |
| Warning | `triangle-alert` | `--status-warning` |
| Info | `circle-question-mark` | `--accent-primary` |

### 行为

- 自动消失：5 秒（Success/Info）/ 不自动消失（Error/Warning）
- 进入动画：`translateX(100%) → 0`，300ms ease-out
- 堆叠：多条 Toast 垂直排列，间距 `8px`
- 最多同时显示 5 条，超出移除最早的

---

## 七、Tooltip

| 属性 | 值 |
|------|-----|
| 背景 | `--bg-popover` |
| 文字 | `--text-foreground` |
| 字号 | `--text-xs` |
| 内边距 | `4px 8px` |
| 圆角 | `--radius-sm` |
| 阴影 | `--shadow-sm` |
| 延迟显示 | 300ms |
| 位置 | 默认 top，自动调整 |

---

## 八、DataTable

### 结构

```
┌─────────────────────────────────────────────────┐
│  Column Header 1  │  Column 2  │  Column 3  ▾  │  ← 可排序
├─────────────────────────────────────────────────┤
│  Row 1            │  Value     │  Action  [···] │
│  Row 2            │  Value     │  Action  [···] │
│  Row 3            │  Value     │  Action  [···] │
├─────────────────────────────────────────────────┤
│  Showing 1-10 of 42           [< 1 2 3 4 5 >]  │
└─────────────────────────────────────────────────┘
```

### 规范

| 属性 | 值 |
|------|-----|
| 行高 | `48px` |
| 头部字号 | `--text-xs`，`--font-medium`，大写 |
| 单元格字号 | `--text-sm` |
| 行 hover | `background: --bg-muted` |
| 选中行 | `background: --accent-bg` |
| 斑马纹 | 可选，`nth-child(even) background: --bg-muted` (50%) |
| 边框 | 底部 `1px solid --border-default` |
| 固定表头 | `position: sticky; top: 0` |

---

## 九、EmptyState

```
┌─────────────────────┐
│                     │
│     [Icon 32px]     │
│                     │
│   No agents yet     │  ← --text-base, --text-muted
│   Create one to      │  ← --text-sm, --text-muted
│   get started        │
│                     │
│   [+ Create Agent]   │  ← CTA Button
│                     │
└─────────────────────┘
```

垂直居中，内边距 `48px`。

---

## 十、StatusDot

| 状态 | 色值 | 动画 |
|------|------|------|
| Active | `--status-success` | 脉冲（2s 无限循环） |
| Idle | `--text-muted` | 无 |
| Error | `--status-destructive` | 无 |
| Warning | `--status-warning` | 闪烁（1s 无限循环） |
| Loading | `--accent-primary` | 旋转（1s 线性循环） |

尺寸：`8px`，圆形。

---

## 十一、Avatar

| 尺寸 | 值 | 用途 |
|------|-----|------|
| sm | `24px` | 列表项 |
| md | `36px` | Agent Card |
| lg | `48px` | 详情页 |

- 形状：`--radius-full`（圆形）
- 背景：渐变 `--accent-primary` → `--accent-ring`
- 文字：首字母大写，`--text-primary-fg`
- 在线指示：右下角 `8px` StatusDot

---

## 相关文档

- [02-visual-system.md](./02-visual-system.md)
- [03-layout-system.md](./03-layout-system.md)
- [09-interaction-patterns.md](./09-interaction-patterns.md)
