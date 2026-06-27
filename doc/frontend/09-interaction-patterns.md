# 09 - 交互模式与动效

定义前端通用的交互模式、动效规范和状态反馈策略。

> **设计精简说明**：复杂微交互动画（手势、弹簧物理）留待未来

## 模块清单

| 模块 | 职责 |
|------|------|
| Loading | 加载态（Spinner / Skeleton / Progress） |
| KeyboardShortcuts | 键盘快捷键 |
| DragAndDrop | 拖拽交互 |
| StateFeedback | 状态反馈（成功/失败/警告） |
| AnimationTokens | 动效令牌 |
| TransitionRules | 过渡动画规则 |

---

## 一、Loading（加载态）

### Spinner

| 尺寸 | 值 | 用途 |
|------|-----|------|
| sm | `16px` | 按钮内、行内 |
| md | `24px` | 卡片内、区域加载 |
| lg | `40px` | 页面加载 |

- 颜色：`--accent-primary`
- 动画：CSS `rotate`，`1s linear infinite`

### Skeleton（骨架屏）

首次加载内容时使用骨架屏代替 Spinner。

```
┌──────────────────────────────────┐
│  ████████                         │  ← 标题骨架
│  ████████████████████             │  ← 描述骨架
│  ██████████                       │
│                                  │
│  ███████████████████████         │  ← 内容骨架
│  ████████████████                │
│  ████████████████████████████    │
└──────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 背景 | `--bg-muted` |
| 动画 | `shimmer`，从左到右的光泽扫过，1.5s 循环 |
| 高度 | 匹配预期内容高度 |

### ProgressBar（进度条）

```
████████████████░░░░░░░░░░░░░░░░  62%
```

| 属性 | 值 |
|------|-----|
| 高度 | `4px`（细）/ `8px`（粗） |
| 圆角 | `--radius-full` |
| 背景轨道 | `--bg-muted` |
| 填充 | `--accent-primary`（默认）/ 按状态着色 |
| 动画 | 确定性（有百分比）或 indeterminate（来回滑动） |

### 按钮内 Loading

文字变透明（`opacity: 0.5`），左侧显示 sm Spinner。

---

## 二、KeyboardShortcuts（键盘快捷键）

### 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `1` - `5` | 切换 5 个 Tab |
| `Ctrl/Cmd + K` | 打开全局搜索 |
| `Ctrl/Cmd + ,` | 打开设置 |
| `Ctrl/Cmd + /` | 显示快捷键帮助 |
| `Esc` | 关闭 Modal / Tooltip / 侧面板 |

### Chat 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息（输入框 focus 时） |
| `Shift + Enter` | 换行 |
| `Ctrl/Cmd + N` | 新建对话 |
| `↑` (空输入框) | 编辑上一条消息 |
| `Esc` | 取消流式生成 |

### 通用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 下一输入项（表单内） |
| `Space` / `Enter` | 勾选 Checkbox/Toggle |

### 快捷键帮助面板

按 `Ctrl/Cmd + /` 弹出全屏半透明遮罩的快捷键列表，再次按或 Esc 关闭。

---

## 三、DragAndDrop（拖拽交互）

### 使用场景

| 场景 | 拖拽目标 |
|------|---------|
| Orchestration Topology | 拖拽 Agent 节点调整布局 |
| Agent Sidebar（Chat Tab） | 拖拽排序 Agent 优先级 |
| GroupChat 参与者 | 拖拽调整发言顺序 |

### 拖拽反馈

| 阶段 | 视觉 |
|------|------|
| Drag Start | 元素半透明 `opacity: 0.7` + 轻微放大 |
| Drag Over | 目标区域显示虚线边框 + `--accent-bg` 背景 |
| Drop | 目标区域高亮一闪 `--accent-primary` |

---

## 四、StateFeedback（状态反馈）

### 成功反馈

- 操作后显示 Success Toast（3 秒）
- 按钮内 Spinner → Checkmark 图标切换
- 新增元素高亮闪烁一次

### 错误反馈

- Error Toast（不自动消失）
- 表单字段红色边框 + 下方错误文字
- 操作按钮恢复原状（不 disabled）

### 警告反馈

- Warning Toast（5 秒）
- 顶部黄色横幅
- 预算/循环检测告警

### 空状态

每个列表/表格空时显示 EmptyState 组件，附带 CTA 按钮。

---

## 五、AnimationTokens（动效令牌）

### 时长

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--duration-instant` | 0ms | 颜色变化 |
| `--duration-fast` | 100ms | Hover 效果 |
| `--duration-normal` | 200ms | Modal 进入/退出 |
| `--duration-slow` | 300ms | 页面切换、Tab 切换 |
| `--duration-slower` | 500ms | 复杂动画 |

### 缓动函数

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--ease-default` | `ease` | 通用 |
| `--ease-in` | `ease-in` | 退出动画 |
| `--ease-out` | `ease-out` | 进入动画 |
| `--ease-in-out` | `ease-in-out` | 状态切换 |

---

## 六、TransitionRules（过渡动画规则）

### 页面级

| 过渡 | 动画 | 时长 |
|------|------|------|
| Tab 切换 | `opacity 0→1`（新 Tab fadeIn） | 200ms |
| 路由切换 | 内容区 fadeIn + translateY(8px→0) | 300ms |

### 组件级

| 过渡 | 动画 | 时长 |
|------|------|------|
| Modal 打开 | overlay fadeIn + content scale(0.95→1) + opacity | 200ms |
| Modal 关闭 | reverse | 150ms |
| Toast 进入 | translateX(100%→0) | 300ms ease-out |
| Toast 退出 | translateX(0→100%) | 150ms ease-in |
| Dropdown 打开 | scale(0.98→1) + opacity | 100ms |
| Dropdown 关闭 | reverse | 75ms |
| Tooltip 显示 | opacity 0→1 + translateY(4px→0) | 150ms |
| Tooltip 隐藏 | reverse | 100ms |

### 列表动画

| 过渡 | 动画 | 时长 |
|------|------|------|
| 新增列表项 | fadeIn + slideDown(8px) | 200ms |
| 删除列表项 | fadeOut + slideUp(8px) + 高度收缩 | 200ms |

### 滚动

| 场景 | 行为 |
|------|------|
| 新消息到达（Chat） | `scrollTo(bottom, smooth)` |
| Tab 切换 | `scrollTo(0)` |
| 刷新后恢复 | 记录 `scrollTop`，刷新后恢复 |

---

## 七、Reduced Motion

尊重 `prefers-reduced-motion` 系统设置：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 相关文档

- [04-component-library.md](./04-component-library.md)
- [02-visual-system.md](./02-visual-system.md)
